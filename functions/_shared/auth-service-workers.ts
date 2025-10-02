/**
 * Cloudflare Workers-Compatible Authentication Service
 * Uses Web Crypto API and Workers-compatible libraries
 */

import { eq, and, gt } from 'drizzle-orm';
import { createDb } from './db';
import { users, userSessions, type User, type NewUser, type UserSession, type NewUserSession } from '../../app/lib/db/schema';

// Use Web Crypto API instead of Node.js crypto
const crypto = globalThis.crypto;

// User type is imported from schema

interface SanitizedUser {
  id: string;
  email: string;
  username?: string | null;
  emailVerified: boolean | null;
  mfaEnabled: boolean | null;
  isActive: boolean | null;
  lastLogin?: Date | null;
}

interface AuthSession {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: Date;
  scope: string;
}

interface AuthResult {
  success: boolean;
  user?: SanitizedUser;
  session?: AuthSession;
  requiresMFA?: boolean;
  error?: string;
  mfaRequired?: boolean;
  suggestions?: string[];
}

// Constants
const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Cloudflare Workers-compatible password hashing using Web Crypto API
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  
  // Combine salt and hash for storage
  const combined = new Uint8Array(salt.length + KEY_LENGTH);
  combined.set(salt);
  combined.set(new Uint8Array(hash), salt.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify password using Web Crypto API
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
    
    const salt = combined.slice(0, SALT_LENGTH);
    const storedHashBytes = combined.slice(SALT_LENGTH);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      KEY_LENGTH * 8
    );
    
    const hashArray = new Uint8Array(hash);
    
    // Timing-safe comparison
    if (hashArray.length !== storedHashBytes.length) return false;
    
    let result = 0;
    for (let i = 0; i < hashArray.length; i++) {
      result |= hashArray[i] ^ storedHashBytes[i];
    }
    
    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Generate JWT using Web Crypto API
 */
async function generateJWT(payload: any, secret: string, expiresIn: number = 900): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };
  
  const encoder = new TextEncoder();
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(fullPayload)).replace(/=/g, '');
  
  const message = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${message}.${encodedSignature}`;
}

/**
 * Verify JWT using Web Crypto API
 */
async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Decode signature
    const signature = Uint8Array.from(
      atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(message)
    );
    
    if (!isValid) return null;
    
    // Decode and verify payload
    const payload = JSON.parse(atob(encodedPayload));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate TOTP secret (simplified for Workers)
 */
function generateTOTPSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  
  for (let i = 0; i < bytes.length; i++) {
    secret += alphabet[bytes[i] % 32];
  }
  
  return secret;
}

/**
 * Simplified TOTP verification (basic implementation)
 */
async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  // This is a simplified version - in production, use a proper TOTP library
  // or implement full TOTP algorithm
  const timeStep = 30;
  const time = Math.floor(Date.now() / 1000 / timeStep);
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(4, time, false);
  
  const hmac = await crypto.subtle.sign('HMAC', key, buffer);
  const hmacArray = new Uint8Array(hmac);
  
  const offset = hmacArray[hmacArray.length - 1] & 0x0f;
  const code = (
    ((hmacArray[offset] & 0x7f) << 24) |
    ((hmacArray[offset + 1] & 0xff) << 16) |
    ((hmacArray[offset + 2] & 0xff) << 8) |
    (hmacArray[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0') === token;
}

export class CloudflareAuthService {
  private db: any;
  private jwtSecret: string;

  constructor(env: any) {
    this.db = createDb(env);
    this.jwtSecret = env.JWT_SECRET || 'dev-secret-change-in-production';
  }

  /**
   * User Registration
   */
  async register(
    email: string, 
    password: string, 
    username?: string,
    metadata?: any
  ): Promise<AuthResult> {
    try {
      // Validate email
      if (!this.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      // Validate password strength
      if (password.length < 12) {
        return { 
          success: false, 
          error: 'Password must be at least 12 characters long' 
        };
      }

      // Check if user exists
      const existingUser = await this.db.select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return { success: false, error: 'User already exists' };
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const [newUser] = await this.db.insert(users).values({
        email: email.toLowerCase(),
        username: username?.toLowerCase(),
        passwordHash,
        emailVerified: false,
        mfaEnabled: false,
        isActive: true,
        loginAttempts: 0,
        metadata: metadata ? JSON.stringify(metadata) : null
      }).returning();

      return {
        success: true,
        user: this.sanitizeUser(newUser)
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * User Login
   */
  async login(email: string, password: string, totpCode?: string): Promise<AuthResult> {
    try {
      // Get user
      const [user] = await this.db.select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check lockout
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingTime = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
        return { 
          success: false, 
          error: `Account locked. Try again in ${remainingTime} minutes` 
        };
      }

      // Check active
      if (!user.isActive) {
        return { success: false, error: 'Account is disabled' };
      }

      // Verify password
      const passwordMatch = await verifyPassword(password, user.passwordHash);
      if (!passwordMatch) {
        await this.handleFailedLogin(user.id);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check MFA
      if (user.mfaEnabled && user.totpSecret) {
        if (!totpCode) {
          return { 
            success: false, 
            requiresMFA: true,
            error: 'MFA code required' 
          };
        }

        const mfaValid = await verifyTOTP(user.totpSecret, totpCode);
        if (!mfaValid) {
          await this.handleFailedLogin(user.id);
          return { success: false, error: 'Invalid MFA code' };
        }
      }

      // Reset login attempts
      await this.db.update(users)
        .set({ 
          loginAttempts: 0, 
          lockedUntil: null, 
          lastLogin: new Date() 
        })
        .where(eq(users.id, user.id));

      // Create session
      const session = await this.createSession(user);

      return {
        success: true,
        user: this.sanitizeUser(user),
        session
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Create session with JWT
   */
  private async createSession(user: User): Promise<AuthSession> {
    const sessionId = crypto.randomUUID();
    
    const accessToken = await generateJWT(
      {
        sub: user.id,
        email: user.email,
        session_id: sessionId
      },
      this.jwtSecret,
      900 // 15 minutes
    );
    
    const refreshToken = btoa(crypto.getRandomValues(new Uint8Array(32)).join(''));
    const idToken = await generateJWT(
      {
        sub: user.id,
        email: user.email,
        email_verified: user.emailVerified
      },
      this.jwtSecret,
      3600 // 1 hour
    );
    
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Store session
    await this.db.insert(userSessions).values({
      id: sessionId,
      userId: user.id,
      tokenHash: await this.hashToken(accessToken),
      expiresAt
    });

    return {
      id: sessionId,
      userId: user.id,
      accessToken,
      refreshToken,
      idToken,
      expiresAt,
      scope: 'read:history write:history'
    };
  }

  /**
   * Validate token
   */
  async validateToken(token: string): Promise<SanitizedUser | null> {
    try {
      const payload = await verifyJWT(token, this.jwtSecret);
      if (!payload) return null;

      const [user] = await this.db.select()
        .from(users)
        .where(and(
          eq(users.id, payload.sub),
          eq(users.isActive, true)
        ))
        .limit(1);

      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Setup MFA
   */
  async setupMFA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] } | null> {
    try {
      const secret = generateTOTPSecret();
      
      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () => 
        btoa(crypto.getRandomValues(new Uint8Array(4)).join('')).substring(0, 8).toUpperCase()
      );

      await this.db.update(users)
        .set({ 
          totpSecret: secret,
          backupCodes: JSON.stringify(backupCodes)
        })
        .where(eq(users.id, userId));

      return {
        secret,
        qrCode: `otpauth://totp/ZeidGeist:user?secret=${secret}&issuer=ZeidGeist`,
        backupCodes
      };
    } catch (error) {
      console.error('MFA setup error:', error);
      return null;
    }
  }

  /**
   * Enable MFA after verification
   */
  async enableMFA(userId: string, totpCode: string): Promise<boolean> {
    try {
      const [user] = await this.db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user.mfaSecret) {
        return false;
      }

      // Verify TOTP code
      const isValid = await verifyTOTP(user.mfaSecret, totpCode);
      if (!isValid) {
        return false;
      }

      // Enable MFA
      await this.db.update(users)
        .set({ mfaEnabled: true })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      console.error('MFA enable error:', error);
      return false;
    }
  }

  /**
   * Helper methods
   */
  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }

  private async handleFailedLogin(userId: string): Promise<void> {
    const [user] = await this.db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return;

    const attempts = user.loginAttempts + 1;
    const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;

    await this.db.update(users)
      .set({
        loginAttempts: attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION) : null
      })
      .where(eq(users.id, userId));
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private sanitizeUser(user: User): SanitizedUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      isActive: user.isActive,
      lastLogin: user.lastLogin
    };
  }
}

export default CloudflareAuthService;