# Authentication Protocol Selection Analysis
## OAuth 2.1 + OIDC vs Custom JWT vs SAML 2.0

### Executive Summary
**Recommendation:** **OAuth 2.1 + OpenID Connect (OIDC)** with custom JWT implementation for session management.

### Decision Matrix

| Criteria | OAuth 2.1 + OIDC | Custom JWT | SAML 2.0 | Weight | Winner |
|----------|-------------------|------------|----------|---------|---------|
| **Security** | 9/10 | 7/10 | 8/10 | 25% | OAuth 2.1 |
| **Implementation Speed** | 6/10 | 9/10 | 4/10 | 20% | Custom JWT |
| **Standards Compliance** | 10/10 | 5/10 | 9/10 | 20% | OAuth 2.1 |
| **Scalability** | 9/10 | 8/10 | 6/10 | 15% | OAuth 2.1 |
| **User Experience** | 8/10 | 8/10 | 5/10 | 10% | Tie |
| **Maintenance Overhead** | 7/10 | 6/10 | 4/10 | 10% | OAuth 2.1 |
| ****Total Score** | **8.25** | **7.15** | **6.40** | | **OAuth 2.1** |

---

## 🏆 Selected Protocol: OAuth 2.1 + OIDC

### Architecture Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Auth Service   │    │   Resource API  │
│   (React)       │    │   (OAuth 2.1)    │    │   (History)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Login Request      │                       │
         ├──────────────────────▶│                       │
         │                       │                       │
         │ 2. Authorization Code │                       │
         │◀──────────────────────┤                       │
         │                       │                       │
         │ 3. Token Exchange     │                       │
         ├──────────────────────▶│                       │
         │                       │                       │
         │ 4. Access Token +     │                       │
         │    ID Token           │                       │
         │◀──────────────────────┤                       │
         │                       │                       │
         │ 5. API Request        │                       │
         │    (Bearer Token)     │                       │
         ├─────────────────────────────────────────────▶│
         │                       │                       │
         │                       │ 6. Token Validation  │
         │                       │◀──────────────────────┤
         │                       │                       │
         │                       │ 7. User Context      │
         │                       ├──────────────────────▶│
         │                       │                       │
         │ 8. Protected Resource │                       │
         │◀─────────────────────────────────────────────┤
```

### Technical Specifications

#### Token Configuration
```typescript
interface TokenConfig {
  accessToken: {
    type: 'JWT';
    algorithm: 'RS256'; // RSA with SHA-256
    expiry: '15m';      // Short-lived for security
    audience: 'api.mstprmpt.zeidgeist.com';
    issuer: 'auth.mstprmpt.zeidgeist.com';
  };
  
  refreshToken: {
    type: 'opaque';     // Random string, not JWT
    expiry: '7d';       // Longer-lived
    storage: 'database'; // Revocation support
    rotation: true;     // New refresh token on each use
  };
  
  idToken: {
    type: 'JWT';
    algorithm: 'RS256';
    expiry: '1h';
    claims: ['sub', 'email', 'email_verified', 'iat', 'exp'];
  };
}
```

#### PKCE Configuration (Proof Key for Code Exchange)
```typescript
interface PKCEConfig {
  enabled: true;
  codeChallenge: {
    method: 'S256'; // SHA256
    length: 128;    // High entropy
  };
  state: {
    length: 32;     // CSRF protection
    expiry: '10m';  // Short window
  };
}
```

---

## 🔐 Multi-Factor Authentication (MFA) Requirements

### MFA Matrix by User Role
| Role | Required MFA | Allowed Methods | Backup Method |
|------|--------------|-----------------|---------------|
| **Admin** | Always | TOTP + WebAuthn | Recovery Codes |
| **User** | Optional | TOTP + SMS | Email Link |
| **Guest** | None | N/A | N/A |

### TOTP Implementation (Primary)
```typescript
interface TOTPConfig {
  algorithm: 'SHA-1';     // Standard for compatibility
  digits: 6;              // 6-digit codes
  period: 30;             // 30-second window
  window: 1;              // Allow ±1 time step
  issuer: 'ZeidGeist Prompter';
  qrCodeSize: 200;        // pixels
}

// Example usage
import speakeasy from 'speakeasy';

const secret = speakeasy.generateSecret({
  name: user.email,
  issuer: 'ZeidGeist Prompter',
  length: 32
});

const verified = speakeasy.totp.verify({
  secret: user.totpSecret,
  encoding: 'base32',
  token: userInput,
  window: 1
});
```

### WebAuthn Implementation (Secondary)
```typescript
interface WebAuthnConfig {
  rpID: 'mstprmpt.zeidgeist.com';
  rpName: 'ZeidGeist Prompter';
  requireResidentKey: false;
  userVerification: 'preferred';
  attestation: 'none';
  authenticatorSelection: {
    authenticatorAttachment: 'platform'; // Prefer built-in
    userVerification: 'required';
  };
}

// Credential creation options
const createOptions = {
  rp: { id: 'mstprmpt.zeidgeist.com', name: 'ZeidGeist Prompter' },
  user: {
    id: new TextEncoder().encode(user.id),
    name: user.email,
    displayName: user.displayName
  },
  challenge: crypto.getRandomValues(new Uint8Array(32)),
  pubKeyCredParams: [
    { alg: -7, type: 'public-key' },  // ES256
    { alg: -257, type: 'public-key' } // RS256
  ]
};
```

---

## 🔑 Password Policy (NIST SP 800-63B Compliance)

### Password Requirements
```typescript
interface PasswordPolicy {
  minLength: 12;          // Minimum 12 characters
  maxLength: 128;         // Allow passphrases
  complexityRules: false; // No special character requirements
  commonPasswordCheck: true; // Block known weak passwords
  breachCheck: true;      // Check against HaveIBeenPwned
  
  restrictions: {
    noUserInfo: true;     // Can't contain username/email
    noContextInfo: true;  // Can't contain site name
    noSequential: true;   // No "123456" or "abcdef"
    noRepetitive: true;   // No "aaaaaa" or "111111"
  };
  
  strength: {
    algorithm: 'zxcvbn';  // Dropbox's password strength estimator
    minScore: 3;          // 0-4 scale, require "strong"
  };
}
```

### Implementation
```typescript
import zxcvbn from 'zxcvbn';
import { pwnedPassword } from 'hibp';

async function validatePassword(password: string, userInfo: UserInfo): Promise<ValidationResult> {
  // Length check
  if (password.length < 12 || password.length > 128) {
    return { valid: false, reason: 'Password must be 12-128 characters' };
  }
  
  // Strength check
  const strength = zxcvbn(password, [userInfo.email, userInfo.username, 'zeidgeist']);
  if (strength.score < 3) {
    return { valid: false, reason: 'Password not strong enough', suggestions: strength.feedback.suggestions };
  }
  
  // Breach check
  const breached = await pwnedPassword(password);
  if (breached > 0) {
    return { valid: false, reason: 'Password found in data breaches', breachCount: breached };
  }
  
  return { valid: true };
}
```

---

## 🏗️ Implementation Architecture

### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt with cost 12
  email_verified BOOLEAN DEFAULT false,
  mfa_enabled BOOLEAN DEFAULT false,
  totp_secret VARCHAR(64), -- Base32 encoded
  backup_codes JSONB, -- Array of hashed codes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB
);

-- OAuth sessions
CREATE TABLE oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id VARCHAR(255) NOT NULL,
  scope VARCHAR(255),
  code_challenge VARCHAR(128), -- PKCE
  code_challenge_method VARCHAR(10),
  redirect_uri TEXT,
  state VARCHAR(32),
  code VARCHAR(128) UNIQUE,
  access_token_hash VARCHAR(64),
  refresh_token_hash VARCHAR(64),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- WebAuthn credentials
CREATE TABLE webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credential_id BYTEA UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  counter BIGINT DEFAULT 0,
  name VARCHAR(100), -- User-friendly name
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_oauth_sessions_code ON oauth_sessions(code);
CREATE INDEX idx_oauth_sessions_user ON oauth_sessions(user_id);
CREATE INDEX idx_webauthn_user ON webauthn_credentials(user_id);
```

### JWT Structure
```typescript
// Access Token Claims
interface AccessTokenClaims {
  iss: 'auth.mstprmpt.zeidgeist.com';  // Issuer
  aud: 'api.mstprmpt.zeidgeist.com';   // Audience
  sub: string;                          // User ID
  iat: number;                          // Issued at
  exp: number;                          // Expires at
  scope: string;                        // Permissions
  jti: string;                          // JWT ID (for revocation)
  
  // Custom claims
  email: string;
  email_verified: boolean;
  mfa_verified: boolean;
  session_id: string;
}

// ID Token Claims (OpenID Connect)
interface IDTokenClaims {
  iss: 'auth.mstprmpt.zeidgeist.com';
  aud: 'webapp.mstprmpt.zeidgeist.com';
  sub: string;
  iat: number;
  exp: number;
  
  // Profile claims
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  
  // Authentication context
  amr: string[];  // Authentication methods: ['pwd', 'totp', 'webauthn']
  acr: string;    // Authentication context class: 'aal1' or 'aal2'
}
```

---

## 🚀 Implementation Timeline

### Phase 1: Foundation (Days 1-2)
- [ ] Set up OAuth 2.1 server (node-oauth-server or custom)
- [ ] Implement PKCE support
- [ ] Create JWT signing/verification with RS256
- [ ] Database schema deployment

### Phase 2: Core Auth (Days 3-4)
- [ ] User registration with email verification
- [ ] Login flow with password validation
- [ ] Token issuance and validation
- [ ] Basic session management

### Phase 3: MFA Integration (Days 5-6)
- [ ] TOTP setup and validation
- [ ] WebAuthn registration and authentication
- [ ] Backup codes generation
- [ ] MFA recovery flows

### Phase 4: Security Hardening (Day 7)
- [ ] Rate limiting and brute force protection
- [ ] Security headers and CORS
- [ ] Audit logging
- [ ] Penetration testing

---

## 📊 Success Metrics

### Security Metrics
- [ ] **Zero** authentication bypasses
- [ ] **100%** PKCE compliance for public clients
- [ ] **<3 seconds** average login time
- [ ] **>99.9%** token validation success rate

### User Experience Metrics
- [ ] **<5 clicks** for complete registration
- [ ] **<10 seconds** MFA setup
- [ ] **>95%** user satisfaction with auth flow
- [ ] **<1%** support tickets related to authentication

### Compliance Metrics
- [ ] **100%** NIST SP 800-63B compliance
- [ ] **100%** OAuth 2.1 specification compliance
- [ ] **100%** GDPR consent mechanism compliance
- [ ] **Zero** password storage violations

This authentication architecture provides enterprise-grade security while maintaining excellent user experience and full standards compliance.