/**
 * Safety validation system for prompt engineering
 * Detects and prevents potential security risks, injection attempts, and harmful content
 */

export interface SafetyCheck {
  type: 'injection' | 'sensitive' | 'harmful' | 'bias' | 'privacy' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected: boolean;
  confidence: number;
  message: string;
  suggestion?: string;
  pattern?: string;
}

export interface SafetyValidationResult {
  isSafe: boolean;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  checks: SafetyCheck[];
  sanitizedPrompt?: string;
  recommendations: string[];
  requiresHumanReview: boolean;
}

export class SafetyValidator {
  // Injection attack patterns
  private readonly injectionPatterns = [
    // SQL injection attempts
    /('|(\\x27)|(\\x2D)|(\\x22))\s*(or|union|select|insert|update|delete|drop|exec|execute)/i,
    /\b(union\s+select|select\s+.*\s+from|insert\s+into|update\s+.*\s+set|delete\s+from)\b/i,
    
    // Command injection
    /[;&|`$(){}[\]\\]/,
    /\b(rm|cat|ls|chmod|sudo|curl|wget|nc|netcat|bash|sh|cmd|powershell)\s+/i,
    
    // Script injection
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    
    // Prompt injection
    /ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/i,
    /forget\s+(everything|all)\s+(above|before|previous)/i,
    /system\s*:\s*ignore/i,
    /\[\s*system\s*\]/i,
    /override\s+(instructions?|prompts?|rules?)/i,
  ];

  // Sensitive data patterns
  private readonly sensitivePatterns = [
    // Credit cards
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
    
    // SSN
    /\b\d{3}-?\d{2}-?\d{4}\b/,
    
    // Email addresses (in certain contexts)
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    
    // Phone numbers
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
    /\+\d{1,3}\s?\d{1,14}/,
    
    // API keys/tokens (common patterns)
    /\b[A-Za-z0-9]{32,}\b/,
    /sk-[A-Za-z0-9]{48}/,
    /Bearer\s+[A-Za-z0-9._-]+/i,
    
    // Passwords (obvious patterns)
    /password\s*[:=]\s*\S+/i,
    /pwd\s*[:=]\s*\S+/i,
  ];

  // Harmful content patterns
  private readonly harmfulPatterns = [
    // Violence
    /\b(kill|murder|harm|hurt|violence|attack|assault)\b.*\b(person|people|human|individual)\b/i,
    
    // Illegal activities
    /\b(drugs?|illegal|hack|crack|pirate|steal|fraud|scam)\b/i,
    
    // Hate speech indicators
    /\b(hate|discriminat|racist|sexist|homophobic|xenophobic)\b/i,
    
    // Self-harm
    /\b(suicide|self[\s-]?harm|cut\s+myself|end\s+my\s+life)\b/i,
  ];

  // Bias-indicating patterns
  private readonly biasPatterns = [
    // Gender bias
    /\b(men|women|male|female)\s+(are|should|must|always|never)\b/i,
    
    // Racial/ethnic bias
    /\b(race|ethnic|religion)\s+(determines|dictates|means)\b/i,
    
    // Age bias
    /\b(young|old)\s+people\s+(can't|cannot|shouldn't)\b/i,
  ];

  // Privacy-sensitive terms
  private readonly privacyPatterns = [
    /\b(personal\s+information|private\s+data|confidential|classified)\b/i,
    /\b(address|location|home|workplace)\s+(of|for)\s+\w+/i,
    /\b(medical\s+records?|health\s+information)\b/i,
  ];

  /**
   * Validate prompt for safety issues
   */
  validateSafety(prompt: string, context?: string): SafetyValidationResult {
    const checks: SafetyCheck[] = [];
    
    // Run all safety checks
    checks.push(...this.checkInjection(prompt));
    checks.push(...this.checkSensitiveData(prompt));
    checks.push(...this.checkHarmfulContent(prompt));
    checks.push(...this.checkBias(prompt));
    checks.push(...this.checkPrivacy(prompt, context));
    checks.push(...this.checkCompliance(prompt));

    // Determine overall risk level
    const riskLevel = this.calculateRiskLevel(checks);
    const isSafe = riskLevel === 'safe' || riskLevel === 'low';
    
    // Generate sanitized version if needed
    const sanitizedPrompt = this.sanitizePrompt(prompt, checks);
    
    // Generate recommendations
    const recommendations = this.generateSafetyRecommendations(checks);
    
    // Determine if human review is needed
    const requiresHumanReview = checks.some(c => 
      c.severity === 'critical' || 
      (c.severity === 'high' && c.detected)
    );

    return {
      isSafe,
      riskLevel,
      checks,
      sanitizedPrompt: sanitizedPrompt !== prompt ? sanitizedPrompt : undefined,
      recommendations,
      requiresHumanReview
    };
  }

  /**
   * Check for injection attempts
   */
  private checkInjection(prompt: string): SafetyCheck[] {
    const checks: SafetyCheck[] = [];
    
    for (const pattern of this.injectionPatterns) {
      const match = pattern.exec(prompt);
      if (match) {
        checks.push({
          type: 'injection',
          severity: 'critical',
          detected: true,
          confidence: 0.9,
          message: 'Potential injection attack detected',
          suggestion: 'Remove suspicious patterns and special characters',
          pattern: match[0]
        });
      }
    }

    // Additional heuristics for injection detection
    const suspiciousChars = /[;&|`${}[\]\\><]/g;
    const charMatches = prompt.match(suspiciousChars);
    if (charMatches && charMatches.length > 5) {
      checks.push({
        type: 'injection',
        severity: 'medium',
        detected: true,
        confidence: 0.6,
        message: 'High density of special characters that could indicate injection attempt',
        suggestion: 'Review and remove unnecessary special characters'
      });
    }

    return checks;
  }

  /**
   * Check for sensitive data
   */
  private checkSensitiveData(prompt: string): SafetyCheck[] {
    const checks: SafetyCheck[] = [];
    
    for (const pattern of this.sensitivePatterns) {
      const match = pattern.exec(prompt);
      if (match) {
        const isApiKey = match[0].length >= 32 && /^[A-Za-z0-9]+$/.test(match[0]);
        
        checks.push({
          type: 'sensitive',
          severity: isApiKey ? 'critical' : 'high',
          detected: true,
          confidence: isApiKey ? 0.8 : 0.7,
          message: `Potential sensitive data detected: ${this.maskSensitiveData(match[0])}`,
          suggestion: 'Remove or redact sensitive information',
          pattern: this.maskSensitiveData(match[0])
        });
      }
    }

    return checks;
  }

  /**
   * Check for harmful content
   */
  private checkHarmfulContent(prompt: string): SafetyCheck[] {
    const checks: SafetyCheck[] = [];
    
    for (const pattern of this.harmfulPatterns) {
      const match = pattern.exec(prompt);
      if (match) {
        checks.push({
          type: 'harmful',
          severity: 'high',
          detected: true,
          confidence: 0.7,
          message: 'Potentially harmful content detected',
          suggestion: 'Rephrase to remove harmful language or intent',
          pattern: match[0]
        });
      }
    }

    return checks;
  }

  /**
   * Check for bias indicators
   */
  private checkBias(prompt: string): SafetyCheck[] {
    const checks: SafetyCheck[] = [];
    
    for (const pattern of this.biasPatterns) {
      const match = pattern.exec(prompt);
      if (match) {
        checks.push({
          type: 'bias',
          severity: 'medium',
          detected: true,
          confidence: 0.6,
          message: 'Potential bias detected in language',
          suggestion: 'Use more inclusive and neutral language',
          pattern: match[0]
        });
      }
    }

    return checks;
  }

  /**
   * Check for privacy concerns
   */
  private checkPrivacy(prompt: string, context?: string): SafetyCheck[] {
    const checks: SafetyCheck[] = [];
    
    for (const pattern of this.privacyPatterns) {
      const match = pattern.exec(prompt);
      if (match) {
        checks.push({
          type: 'privacy',
          severity: 'medium',
          detected: true,
          confidence: 0.6,
          message: 'Privacy-sensitive content detected',
          suggestion: 'Ensure proper handling of personal/private information',
          pattern: match[0]
        });
      }
    }

    // Context-specific privacy checks
    if (context) {
      const personalInfo = /\b(name|address|phone|email)\s*[:=]\s*\S+/i.exec(context);
      if (personalInfo) {
        checks.push({
          type: 'privacy',
          severity: 'high',
          detected: true,
          confidence: 0.8,
          message: 'Personal information found in context',
          suggestion: 'Remove or anonymize personal information'
        });
      }
    }

    return checks;
  }

  /**
   * Check for compliance issues
   */
  private checkCompliance(prompt: string): SafetyCheck[] {
    const checks: SafetyCheck[] = [];
    
    // GDPR-related terms
    if (/\b(collect|store|process)\s+(personal\s+)?data\b/i.test(prompt)) {
      checks.push({
        type: 'compliance',
        severity: 'medium',
        detected: true,
        confidence: 0.5,
        message: 'Data processing mentioned - ensure GDPR compliance',
        suggestion: 'Include appropriate privacy notices and consent mechanisms'
      });
    }

    // Medical/healthcare compliance (HIPAA)
    if (/\b(patient|medical|health)\s+(record|data|information)\b/i.test(prompt)) {
      checks.push({
        type: 'compliance',
        severity: 'high',
        detected: true,
        confidence: 0.7,
        message: 'Healthcare data mentioned - ensure HIPAA compliance',
        suggestion: 'Implement appropriate healthcare data protection measures'
      });
    }

    // Financial compliance (PCI DSS)
    if (/\b(credit\s+card|payment|financial)\s+(data|information)\b/i.test(prompt)) {
      checks.push({
        type: 'compliance',
        severity: 'high',
        detected: true,
        confidence: 0.7,
        message: 'Financial data mentioned - ensure PCI DSS compliance',
        suggestion: 'Implement appropriate financial data protection measures'
      });
    }

    return checks;
  }

  /**
   * Calculate overall risk level
   */
  private calculateRiskLevel(checks: SafetyCheck[]): SafetyValidationResult['riskLevel'] {
    const detectedChecks = checks.filter(c => c.detected);
    
    if (detectedChecks.length === 0) return 'safe';
    
    const hasCritical = detectedChecks.some(c => c.severity === 'critical');
    if (hasCritical) return 'critical';
    
    const hasHigh = detectedChecks.some(c => c.severity === 'high');
    if (hasHigh) return 'high';
    
    const hasMedium = detectedChecks.some(c => c.severity === 'medium');
    if (hasMedium) return 'medium';
    
    return 'low';
  }

  /**
   * Sanitize prompt by removing/replacing dangerous content
   */
  private sanitizePrompt(prompt: string, _checks: SafetyCheck[]): string {
    let sanitized = prompt;
    
    // Remove injection patterns
    for (const pattern of this.injectionPatterns) {
      sanitized = sanitized.replace(pattern, '[SANITIZED]');
    }
    
    // Mask sensitive data
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, (match) => this.maskSensitiveData(match));
    }
    
    // Clean up multiple sanitization markers
    sanitized = sanitized.replace(/\[SANITIZED\]\s*\[SANITIZED\]/g, '[SANITIZED]');
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return sanitized;
  }

  /**
   * Mask sensitive data for display
   */
  private maskSensitiveData(data: string): string {
    if (data.length <= 4) return '***';
    if (data.length <= 8) return data.substring(0, 2) + '***';
    return data.substring(0, 4) + '***' + data.substring(data.length - 2);
  }

  /**
   * Generate safety recommendations
   */
  private generateSafetyRecommendations(checks: SafetyCheck[]): string[] {
    const recommendations = new Set<string>();
    
    checks.filter(c => c.detected).forEach(check => {
      if (check.suggestion) {
        recommendations.add(check.suggestion);
      }
      
      // Add type-specific recommendations
      switch (check.type) {
        case 'injection':
          recommendations.add('Implement input validation and sanitization');
          recommendations.add('Use parameterized queries and safe APIs');
          break;
        case 'sensitive':
          recommendations.add('Implement data encryption and secure storage');
          recommendations.add('Use data anonymization where possible');
          break;
        case 'harmful':
          recommendations.add('Review content for harmful intent');
          recommendations.add('Implement content moderation policies');
          break;
        case 'bias':
          recommendations.add('Use inclusive and diverse language');
          recommendations.add('Test with diverse user groups');
          break;
        case 'privacy':
          recommendations.add('Implement privacy by design principles');
          recommendations.add('Provide clear privacy notices');
          break;
        case 'compliance':
          recommendations.add('Consult with legal team for compliance requirements');
          recommendations.add('Implement appropriate audit trails');
          break;
      }
    });
    
    return Array.from(recommendations);
  }

  /**
   * Quick safety check (simplified version)
   */
  isPromptSafe(prompt: string): boolean {
    const result = this.validateSafety(prompt);
    return result.isSafe && !result.requiresHumanReview;
  }
}