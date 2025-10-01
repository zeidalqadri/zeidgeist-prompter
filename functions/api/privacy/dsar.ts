/**
 * Data Subject Access Request (DSAR) API
 * GDPR Article 15 & CCPA Section 1798.110 Compliance
 * 
 * Endpoints:
 * POST /api/privacy/dsar/request - Submit DSAR request
 * GET /api/privacy/dsar/status/:requestId - Check request status
 * GET /api/privacy/dsar/download/:requestId - Download data export
 * DELETE /api/privacy/dsar/delete - Request data deletion
 */

import { createDb, dsarRequests, users, userSessions, promptHistory, feedback } from "../../_shared/db";
import { CloudflareAuthService } from "../../_shared/auth-service-workers";
import { getSecurityHeaders } from "../../_shared/privacy-guard";
import { monitorRequest, privacyMonitor } from "../../_shared/privacy-monitor";
import { eq, and, desc } from "drizzle-orm";
// Use Web Crypto API for UUID generation

interface DSARRequest {
  id: string;
  userId: string;
  requestType: 'access' | 'deletion' | 'rectification' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'denied' | 'expired';
  submittedAt: Date;
  completedAt?: Date;
  expiresAt: Date; // GDPR requires response within 30 days
  requestData?: any;
  responseData?: any;
  denialReason?: string;
  verificationToken?: string;
}

interface PersonalDataExport {
  requestId: string;
  exportDate: Date;
  dataSubject: {
    userId: string;
    email: string;
    verificationStatus: boolean;
  };
  personalData: {
    profile: any;
    promptHistory: any[];
    feedback: any[];
    sessions: any[];
    consents: any[];
  };
  metadata: {
    lawfulBasis: string;
    dataRetentionPeriod: string;
    processingPurposes: string[];
    dataCategories: string[];
  };
  rights: {
    rectification: string;
    erasure: string;
    restriction: string;
    portability: string;
    objection: string;
  };
}

// CORS preflight handler
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * POST /api/privacy/dsar/request - Submit new DSAR request
 */
export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;
  
  monitorRequest(request, context);
  
  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Authentication required for privacy requests'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const token = authHeader.substring(7);
    const authService = new CloudflareAuthService(env);
    const user = await authService.validateToken(token);
    
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Invalid or expired authentication token'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const body = await request.json() as any;
    const { requestType, additionalInfo } = body;

    // Validate request type
    const validTypes = ['access', 'deletion', 'rectification', 'portability', 'restriction', 'objection'];
    if (!validTypes.includes(requestType)) {
      return new Response(JSON.stringify({
        error: 'Invalid request type',
        validTypes
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Check for existing pending requests
    const db = createDb(env);
    const existingRequest = await db.select()
      .from(dsarRequests)
      .where(and(
        eq(dsarRequests.userId, user.id),
        eq(dsarRequests.requestType, requestType),
        eq(dsarRequests.status, 'pending')
      ))
      .limit(1);

    if (existingRequest.length > 0) {
      return new Response(JSON.stringify({
        error: 'A pending request of this type already exists',
        existingRequestId: existingRequest[0].id
      }), {
        status: 409,
        headers: corsHeaders
      });
    }

    // Create new DSAR request
    const requestId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const dsarRequest: DSARRequest = {
      id: requestId,
      userId: user.id,
      requestType,
      status: 'pending',
      submittedAt: new Date(),
      expiresAt,
      requestData: additionalInfo ? JSON.stringify(additionalInfo) : null
    };

    await db.insert(dsarRequests).values(dsarRequest);

    // Log privacy event
    console.log(`DSAR request submitted: ${requestType} for user ${user.id}`);
    
    // Start async processing for access requests
    if (requestType === 'access') {
      // Queue for processing (in production, would use background job)
      await processAccessRequestAsync(requestId, user.id, env);
    } else if (requestType === 'deletion') {
      // Queue for deletion processing
      await processDeletionRequestAsync(requestId, user.id, env);
    }

    return new Response(JSON.stringify({
      success: true,
      requestId,
      requestType,
      status: 'pending',
      estimatedCompletion: expiresAt.toISOString(),
      message: `Your ${requestType} request has been submitted and will be processed within 30 days as required by GDPR.`,
      nextSteps: {
        checkStatus: `/api/privacy/dsar/status/${requestId}`,
        expectedTimeframe: '1-30 days',
        notification: 'You will receive an email when your request is completed'
      }
    }), {
      status: 202, // Accepted for processing
      headers: corsHeaders
    });

  } catch (error) {
    console.error('DSAR request error:', error);
    
    privacyMonitor.trackViolation(
      request.headers.get('cf-connecting-ip') || 'unknown',
      'DSAR_SYSTEM_ERROR',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    
    return new Response(JSON.stringify({
      error: 'Failed to process privacy request. Please try again.'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * GET /api/privacy/dsar/status/:requestId - Check DSAR request status
 */
export async function onRequestGet(context: any): Promise<Response> {
  const { request, env, params } = context;
  
  monitorRequest(request, context);
  
  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json'
  };

  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Authentication required'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const token = authHeader.substring(7);
    const authService = new CloudflareAuthService(env);
    const user = await authService.validateToken(token);
    
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Invalid or expired token'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const requestId = params?.requestId;
    if (!requestId) {
      return new Response(JSON.stringify({
        error: 'Request ID is required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Get request status
    const db = createDb(env);
    const [dsarRequest] = await db.select()
      .from(dsarRequests)
      .where(and(
        eq(dsarRequests.id, requestId),
        eq(dsarRequests.userId, user.id)
      ))
      .limit(1);

    if (!dsarRequest) {
      return new Response(JSON.stringify({
        error: 'Request not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Check if request has expired
    if (dsarRequest.status === 'pending' && dsarRequest.expiresAt && new Date() > dsarRequest.expiresAt) {
      await db.update(dsarRequests)
        .set({ status: 'expired' })
        .where(eq(dsarRequests.id, requestId));
      
      dsarRequest.status = 'expired';
    }

    const response: any = {
      requestId: dsarRequest.id,
      requestType: dsarRequest.requestType,
      status: dsarRequest.status,
      submittedAt: dsarRequest.createdAt.toISOString(),
      expiresAt: dsarRequest.expiresAt?.toISOString()
    };

    if (dsarRequest.processedAt) {
      response.completedAt = dsarRequest.processedAt.toISOString();
    }

    if (dsarRequest.status === 'completed') {
      response.downloadUrl = `/api/privacy/dsar/download/${requestId}`;
    }

    if (dsarRequest.status === 'denied' && dsarRequest.adminNotes) {
      response.denialReason = dsarRequest.adminNotes;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('DSAR status check error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to check request status'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * GET /api/privacy/dsar/download/:requestId - Download data export
 */
export async function onRequestDownload(context: any): Promise<Response> {
  const { request, env, params } = context;
  
  const corsHeaders = {
    ...getSecurityHeaders(),
    'Content-Type': 'application/json'
  };

  try {
    // Authenticate and get request
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.substring(7);
    
    if (!token) {
      return new Response('Authentication required', { status: 401 });
    }

    const authService = new CloudflareAuthService(env);
    const user = await authService.validateToken(token);
    
    if (!user) {
      return new Response('Invalid token', { status: 401 });
    }

    const requestId = params?.requestId;
    const db = createDb(env);
    
    const [dsarRequest] = await db.select()
      .from(dsarRequests)
      .where(and(
        eq(dsarRequests.id, requestId),
        eq(dsarRequests.userId, user.id),
        eq(dsarRequests.status, 'completed')
      ))
      .limit(1);

    if (!dsarRequest) {
      return new Response(JSON.stringify({
        error: 'Download not available'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Generate fresh export data
    const exportData = await generatePersonalDataExport(user.id, requestId, env);
    
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="personal-data-export-${user.id}-${new Date().toISOString().split('T')[0]}.json"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('DSAR download error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to download data export'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * DELETE /api/privacy/dsar/delete - Request data deletion
 */
export async function onRequestDelete(context: any): Promise<Response> {
  const { request, env } = context;
  
  // This would be handled by POST with requestType: 'deletion'
  // Included for completeness and alternative endpoint access
  
  return new Response(JSON.stringify({
    message: 'Please use POST /api/privacy/dsar/request with requestType: "deletion"'
  }), {
    status: 405,
    headers: {
      ...getSecurityHeaders(),
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Async processing functions
 */
async function processAccessRequestAsync(requestId: string, userId: string, env: any): Promise<void> {
  try {
    const db = createDb(env);
    
    // Update status to processing
    await db.update(dsarRequests)
      .set({ status: 'processing' })
      .where(eq(dsarRequests.id, requestId));

    // Generate data export
    const exportData = await generatePersonalDataExport(userId, requestId, env);
    
    // Store export data and mark as completed
    await db.update(dsarRequests)
      .set({
        status: 'completed',
        processedAt: new Date(),
        responseData: JSON.stringify(exportData)
      })
      .where(eq(dsarRequests.id, requestId));

    console.log(`DSAR access request completed: ${requestId}`);
    
  } catch (error) {
    console.error(`DSAR processing failed for ${requestId}:`, error);
    
    // Mark as failed
    await createDb(env).update(dsarRequests)
      .set({
        status: 'denied',
        adminNotes: 'Technical error during processing'
      })
      .where(eq(dsarRequests.id, requestId));
  }
}

async function processDeletionRequestAsync(requestId: string, userId: string, env: any): Promise<void> {
  try {
    const db = createDb(env);
    
    // Update status to processing
    await db.update(dsarRequests)
      .set({ status: 'processing' })
      .where(eq(dsarRequests.id, requestId));

    // Execute right to be forgotten
    await db.transaction(async (tx: any) => {
      // Delete user data
      await tx.delete(promptHistory).where(eq(promptHistory.userId, userId));
      await tx.delete(feedback).where(eq(feedback.userId, userId));
      await tx.delete(userSessions).where(eq(userSessions.userId, userId));
      await tx.delete(dsarRequests).where(eq(dsarRequests.userId, userId));
      
      // Pseudonymize user account (required for audit trails)
      await tx.update(users)
        .set({
          email: `deleted-${userId}@deleted.local`,
          username: `deleted-${userId}`,
          isActive: false
        })
        .where(eq(users.id, userId));
    });

    console.log(`DSAR deletion request completed: ${requestId}`);
    
  } catch (error) {
    console.error(`DSAR deletion failed for ${requestId}:`, error);
    
    // Mark as failed
    await createDb(env).update(dsarRequests)
      .set({
        status: 'denied',
        adminNotes: 'Technical error during deletion'
      })
      .where(eq(dsarRequests.id, requestId));
  }
}

async function generatePersonalDataExport(userId: string, requestId: string, env: any): Promise<PersonalDataExport> {
  const db = createDb(env);
  
  // Get user profile
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Get prompt history
  const userPromptHistory = await db.select()
    .from(promptHistory)
    .where(eq(promptHistory.userId, userId))
    .orderBy(desc(promptHistory.timestamp));

  // Get feedback
  const userFeedback = await db.select()
    .from(feedback)
    .where(eq(feedback.userId, userId))
    .orderBy(desc(feedback.createdAt));

  // Get sessions
  const sessions = await db.select()
    .from(userSessions)
    .where(eq(userSessions.userId, userId))
    .orderBy(desc(userSessions.createdAt))
    .limit(10); // Last 10 sessions

  // Get consents (if implemented)
  const consents: any[] = []; // Placeholder for consent records

  return {
    requestId,
    exportDate: new Date(),
    dataSubject: {
      userId: user.id,
      email: user.email,
      verificationStatus: user.emailVerified ?? false
    },
    personalData: {
      profile: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      promptHistory: userPromptHistory.map((item: any) => ({
        original: item.original,
        refined: item.refined,
        context: item.context,
        timestamp: item.timestamp,
        metadata: item.metadata ? JSON.parse(item.metadata) : null
      })),
      feedback: userFeedback,
      sessions: sessions.map((session: any) => ({
        createdAt: session.createdAt,
        lastAccessed: session.lastAccessed,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      })),
      consents
    },
    metadata: {
      lawfulBasis: 'GDPR Article 6(1)(a) - Consent',
      dataRetentionPeriod: '24 months',
      processingPurposes: [
        'Service delivery',
        'User experience personalization',
        'Service improvement',
        'Security and fraud prevention'
      ],
      dataCategories: [
        'Identity data',
        'Contact data', 
        'Usage data',
        'Technical data'
      ]
    },
    rights: {
      rectification: 'You can update your profile information in your account settings',
      erasure: 'You can request deletion of your data through this privacy portal',
      restriction: 'You can request restriction of processing by contacting privacy@zeidgeist.com',
      portability: 'This export provides your data in a machine-readable format',
      objection: 'You can object to processing by contacting privacy@zeidgeist.com'
    }
  };
}
