/**
 * OAuth 2.1 + OIDC Authentication Service
 * Enterprise-grade authentication with MFA support
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { eq, and, gt, lt } from 'drizzle-orm';
import { createDb } from './db';

// Types
export interface User {
  id: string;
  email: string;
  username?: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  isActive: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  metadata?: any;
}

export interface AuthSession {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: Date;
  scope: string;
}

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: AuthSession;
  requiresMFA?: boolean;
  error?: string;
  mfaRequired?: boolean;
}

export interface PasswordValidation {
  valid: boolean;
  score?: number;
  reason?: string;
  suggestions?: string[];
  breachCount?: number;
}

// Constants
const JWT_ALGORITHM = 'RS256';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const ID_TOKEN_EXPIRY = '1h';
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const BCRYPT_ROUNDS = 12;

// Password validation patterns
const COMMON_PASSWORDS = new Set([
  'password', '123456', 'password123', 'admin', 'qwerty', 'letmein',
  '123456789', 'welcome', 'monkey', '1234567890'
]);

export class AuthService {
  private db: any;
  private jwtSecret: string;
  private jwtPrivateKey: string;
  private jwtPublicKey: string;

  constructor(env: any) {
    this.db = createDb(env);
    this.jwtSecret = env.JWT_SECRET || 'dev-secret-change-in-production';
    this.jwtPrivateKey = env.JWT_PRIVATE_KEY || this.jwtSecret;
    this.jwtPublicKey = env.JWT_PUBLIC_KEY || this.jwtSecret;
  }

  /**
   * User Registration with comprehensive validation
   */
  async register(
    email: string, 
    password: string, 
    username?: string,
    metadata?: any
  ): Promise<AuthResult> {
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      // Validate password strength
      const passwordValidation = await this.validatePassword(password, { email, username });
      if (!passwordValidation.valid) {
        return { 
          success: false, 
          error: passwordValidation.reason,
          suggestions: passwordValidation.suggestions 
        };
      }

      // Check if user already exists
      const existingUser = await this.db.select()
        .from('users')
        .where(eq('users.email', email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return { success: false, error: 'User already exists' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Create user
      const [newUser] = await this.db.insert('users').values({
        email: email.toLowerCase(),
        username: username?.toLowerCase(),
        passwordHash,
        emailVerified: false,
        mfaEnabled: false,
        isActive: true,
        loginAttempts: 0,
        metadata: metadata ? JSON.stringify(metadata) : null
      }).returning();

      // Send verification email
      await this.sendVerificationEmail(newUser.email);

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
   * User Login with brute force protection
   */
  async login(email: string, password: string, totpCode?: string): Promise<AuthResult> {
    try {
      // Get user by email
      const [user] = await this.db.select()
        .from('users')
        .where(eq('users.email', email.toLowerCase()))
        .limit(1);

      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingTime = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
        return { 
          success: false, 
          error: `Account locked. Try again in ${remainingTime} minutes` 
        };
      }

      // Check if account is active
      if (!user.isActive) {
        return { success: false, error: 'Account is disabled' };
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        await this.handleFailedLogin(user.id);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if MFA is required
      if (user.mfaEnabled) {
        if (!totpCode) {
          return { 
            success: false, 
            requiresMFA: true,
            error: 'MFA code required' 
          };
        }

        const mfaValid = this.verifyTOTP(user.totpSecret, totpCode);
        if (!mfaValid) {
          await this.handleFailedLogin(user.id);
          return { success: false, error: 'Invalid MFA code' };
        }
      }

      // Reset login attempts on successful login
      await this.db.update('users')
        .set({ 
          loginAttempts: 0, 
          lockedUntil: null, 
          lastLogin: new Date() 
        })
        .where(eq('users.id', user.id));

      // Create session
      const session = await this.createSession(user, ['read:history', 'write:history']);

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
   * Create OAuth session with JWT tokens
   */
  private async createSession(user: User, scopes: string[]): Promise<AuthSession> {
    const sessionId = randomBytes(32).toString('hex');
    const scope = scopes.join(' ');
    
    // Generate tokens
    const accessToken = this.generateAccessToken(user, scope, sessionId);
    const refreshToken = this.generateRefreshToken();
    const idToken = this.generateIDToken(user);
    
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store session
    await this.db.insert('oauth_sessions').values({
      id: sessionId,
      userId: user.id,
      scope,
      accessTokenHash: createHash('sha256').update(accessToken).digest('hex'),
      refreshTokenHash: createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt,
      ipAddress: 'unknown', // Will be set by calling function
      userAgent: 'unknown'
    });

    return {
      id: sessionId,
      userId: user.id,
      accessToken,
      refreshToken,
      idToken,
      expiresAt,
      scope
    };
  }

  /**
   * Generate Access Token (JWT)
   */
  private generateAccessToken(user: User, scope: string, sessionId: string): string {
    const payload = {
      iss: 'auth.mstprmpt.zeidgeist.com',
      aud: 'api.mstprmpt.zeidgeist.com',
      sub: user.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      scope,
      jti: randomBytes(16).toString('hex'),
      email: user.email,
      email_verified: user.emailVerified,
      mfa_verified: user.mfaEnabled,
      session_id: sessionId
    };

    return jwt.sign(payload, this.jwtPrivateKey, { algorithm: JWT_ALGORITHM });
  }

  /**
   * Generate ID Token (OIDC)
   */
  private generateIDToken(user: User): string {
    const payload = {
      iss: 'auth.mstprmpt.zeidgeist.com',
      aud: 'webapp.mstprmpt.zeidgeist.com',
      sub: user.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      email: user.email,
      email_verified: user.emailVerified,
      name: user.username,
      amr: user.mfaEnabled ? ['pwd', 'totp'] : ['pwd'],
      acr: user.mfaEnabled ? 'aal2' : 'aal1'
    };

    return jwt.sign(payload, this.jwtPrivateKey, { algorithm: JWT_ALGORITHM });
  }

  /**
   * Generate Refresh Token (opaque)
   */
  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  /**
   * Validate Access Token
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      // Verify JWT signature and expiration
      const payload = jwt.verify(token, this.jwtPublicKey, { 
        algorithm: JWT_ALGORITHM,
        issuer: 'auth.mstprmpt.zeidgeist.com',
        audience: 'api.mstprmpt.zeidgeist.com'
      }) as any;

      // Check if session exists and is valid
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const [session] = await this.db.select()
        .from('oauth_sessions')
        .where(and(
          eq('oauth_sessions.accessTokenHash', tokenHash),
          gt('oauth_sessions.expiresAt', new Date())
        ))
        .limit(1);

      if (!session) {
        return null;
      }

      // Get user
      const [user] = await this.db.select()
        .from('users')
        .where(and(
          eq('users.id', payload.sub),
          eq('users.isActive', true)
        ))
        .limit(1);

      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Setup TOTP for MFA
   */
  async setupMFA(userId: string): Promise<MFASetup | null> {
    try {
      const [user] = await this.db.select()
        .from('users')
        .where(eq('users.id', userId))
        .limit(1);

      if (!user) {
        return null;
      }

      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: user.email,
        issuer: 'ZeidGeist Prompter',
        length: 32
      });

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () => 
        randomBytes(4).toString('hex').toUpperCase()
      );

      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => bcrypt.hash(code, BCRYPT_ROUNDS))
      );

      // Store secret (not yet enabled)
      await this.db.update('users')
        .set({ 
          totpSecret: secret.base32,
          backupCodes: JSON.stringify(hashedBackupCodes)
        })
        .where(eq('users.id', userId));

      return {
        secret: secret.base32,
        qrCode: secret.otpauth_url || '',
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
        .from('users')
        .where(eq('users.id', userId))
        .limit(1);

      if (!user || !user.totpSecret) {
        return false;
      }

      // Verify TOTP code
      const isValid = this.verifyTOTP(user.totpSecret, totpCode);
      if (!isValid) {
        return false;
      }

      // Enable MFA
      await this.db.update('users')
        .set({ mfaEnabled: true })
        .where(eq('users.id', userId));

      return true;
    } catch (error) {
      console.error('MFA enable error:', error);
      return false;
    }
  }

  /**
   * Verify TOTP code
   */
  private verifyTOTP(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Allow ±1 time step (30 seconds)
    });
  }

  /**
   * Validate password strength (NIST SP 800-63B compliant)
   */
  private async validatePassword(
    password: string, 
    userInfo: { email?: string; username?: string }
  ): Promise<PasswordValidation> {
    // Length check
    if (password.length < 12) {
      return { 
        valid: false, 
        reason: 'Password must be at least 12 characters long' 
      };
    }

    if (password.length > 128) {
      return { 
        valid: false, 
        reason: 'Password must be no more than 128 characters long' 
      };
    }

    // Check against common passwords
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      return { 
        valid: false, 
        reason: 'Password is too common' 
      };
    }

    // Check against user info
    const userInfoArray = [
      userInfo.email?.split('@')[0],
      userInfo.username,
      'zeidgeist',
      'prompter'
    ].filter(Boolean).map(s => s!.toLowerCase());

    for (const info of userInfoArray) {
      if (password.toLowerCase().includes(info)) {
        return { 
          valid: false, 
          reason: 'Password cannot contain personal information' 
        };
      }
    }

    // Check for sequential characters
    if (/(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)/i.test(password)) {
      return { 
        valid: false, 
        reason: 'Password cannot contain sequential characters' 
      };
    }

    // Check for repetitive characters
    if (/(.)\1{3,}/.test(password)) {
      return { 
        valid: false, 
        reason: 'Password cannot contain repetitive characters' 
      };
    }

    return { valid: true, score: 3 };
  }

  /**
   * Handle failed login attempts
   */
  private async handleFailedLogin(userId: string): Promise<void> {
    const [user] = await this.db.select()
      .from('users')
      .where(eq('users.id', userId))
      .limit(1);

    if (!user) return;

    const attempts = user.loginAttempts + 1;
    const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;

    await this.db.update('users')
      .set({
        loginAttempts: attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION) : null
      })
      .where(eq('users.id', userId));
  }

  /**
   * Send email verification
   */
  private async sendVerificationEmail(email: string): Promise<void> {
    // In production, integrate with email service (SendGrid, SES, etc.)
    console.log(`Verification email would be sent to: ${email}`);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize user object for client response
   */
  private sanitizeUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      loginAttempts: user.loginAttempts,
      lockedUntil: user.lockedUntil,
      metadata: user.metadata ? JSON.parse(user.metadata) : null
    };
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    try {
      const result = await this.db.delete('oauth_sessions')
        .where(eq('oauth_sessions.id', sessionId));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Session revocation error:', error);
      return false;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthSession | null> {
    try {
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      
      const [session] = await this.db.select()
        .from('oauth_sessions')
        .where(eq('oauth_sessions.refreshTokenHash', tokenHash))
        .limit(1);

      if (!session) {
        return null;
      }

      const [user] = await this.db.select()
        .from('users')
        .where(eq('users.id', session.userId))
        .limit(1);

      if (!user || !user.isActive) {
        return null;
      }

      // Create new session with token rotation
      await this.db.delete('oauth_sessions')
        .where(eq('oauth_sessions.id', session.id));

      return await this.createSession(this.sanitizeUser(user), session.scope.split(' '));
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }
}

export default AuthService;