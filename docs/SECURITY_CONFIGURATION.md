# Security Configuration Guide

## JWT Secret Generation

### Critical Security Requirements

The application requires a cryptographically secure JWT secret for authentication. **Never use weak or hardcoded secrets in production**.

### Generating a Secure JWT Secret

#### Method 1: Using OpenSSL (Recommended)
```bash
# Generate a 256-bit (32-byte) random secret
openssl rand -base64 32
```

#### Method 2: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Method 3: Using Python
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Configuration

#### For Cloudflare Pages/Workers

1. **Cloudflare Dashboard**:
   - Navigate to your Pages project → Settings → Environment Variables
   - Add `JWT_SECRET` with the generated value
   - Mark as "Secret" (encrypted)

2. **wrangler.toml** (for development only - use Secrets for production):
   ```toml
   [vars]
   # DO NOT put JWT_SECRET here - use `wrangler secret put JWT_SECRET`
   ```

3. **Using Wrangler CLI**:
   ```bash
   # For production
   wrangler secret put JWT_SECRET --env production

   # For staging
   wrangler secret put JWT_SECRET --env staging
   ```

#### For Local Development

Create `.dev.vars` file (gitignored):
```bash
JWT_SECRET=your-generated-secret-here
```

### Secret Rotation Strategy

**Rotate JWT secrets every 90 days or immediately if compromised.**

#### Rotation Procedure:

1. Generate new secret using methods above
2. Add new secret as `JWT_SECRET_NEW` environment variable
3. Update code to support both secrets during transition:
   ```typescript
   // Verify with both old and new secrets during rotation period
   const payload = await verifyJWT(token, env.JWT_SECRET_NEW) ||
                   await verifyJWT(token, env.JWT_SECRET);
   ```
4. Wait 24 hours for all tokens to refresh
5. Replace `JWT_SECRET` with `JWT_SECRET_NEW`
6. Remove `JWT_SECRET_NEW`

### Security Checklist

- [ ] JWT_SECRET is at least 32 characters (256 bits)
- [ ] Secret generated using cryptographically secure method
- [ ] Secret stored in environment variables, not in code
- [ ] Secret marked as "Secret" in Cloudflare Dashboard
- [ ] `.dev.vars` added to `.gitignore`
- [ ] No secrets committed to version control
- [ ] Rotation schedule established (90 days)
- [ ] Incident response plan includes secret rotation procedure

### Emergency Secret Rotation

If you suspect your JWT secret has been compromised:

1. **Immediately** rotate the secret using the procedure above
2. Force all users to re-authenticate
3. Audit access logs for suspicious activity
4. Review who had access to the secret
5. Document the incident in security log
6. Update password rotation policy if needed

### Additional Security Measures

#### API Key Management

API keys should also be managed securely:

```bash
# Generate secure API key
openssl rand -hex 32

# Store in Cloudflare
wrangler secret put VALID_API_KEYS --env production
```

#### Database Connection Strings

Never hardcode database credentials:

```bash
# Store DATABASE_URL securely
wrangler secret put DATABASE_URL --env production
```

## Related Documentation

- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
