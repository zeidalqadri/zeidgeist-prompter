# Auth Flow Fix - Context Document

**Last Updated**: 2025-12-15
**Status**: COMPLETE - Ready for testing/deployment
**Branch**: zeidalqadri/troy

## Problem Statement

The Chrome extension download auth flow had multiple critical UX issues:
1. Registration didn't auto-login users (no session/cookies set)
2. No feedback shown after registration - immediate redirect to homepage
3. No password reset/account recovery functionality
4. User couldn't recover access if they forgot password

## Root Cause (Confirmed)

### Registration Endpoint Did NOT Set Cookies

**File**: `/functions/api/auth/register.ts` (original lines 66-78)

The register endpoint created users but:
- Did NOT call `createSession()`
- Did NOT return `Set-Cookie` headers
- Returned success and user object only

**Result**: User registered → redirected → NOT logged in → stuck

### Frontend Had No Feedback

**File**: `/app/auth/register/page.tsx`

- Immediately called `router.push(returnTo)` on success
- No success message shown
- User didn't know registration succeeded

## Implementation Summary

### Phase 1: Auto-Login After Registration (CRITICAL - COMPLETE)

| Task | File | Status |
|------|------|--------|
| Make `createSession()` public | `functions/_shared/auth-service-workers.ts:574` | ✅ |
| Add session creation + cookies to register | `functions/api/auth/register.ts` | ✅ |
| Add success feedback UI | `app/auth/register/page.tsx` | ✅ |

**Key Change**: After successful user creation, register endpoint now:
1. Calls `authService.createSession(userForSession)`
2. Sets recovery PIN if provided
3. Warms session cache
4. Returns `Set-Cookie` headers (access_token, id_token, refresh_token)

### Phase 2: Password Reset with PIN (ENHANCEMENT - COMPLETE)

| Task | File | Status |
|------|------|--------|
| D1 migration for PIN columns | `migrations/d1/0005_add_recovery_pin.sql` | ✅ NEW |
| PIN methods in auth service | `functions/_shared/auth-service-workers.ts` | ✅ |
| PIN methods in D1 adapter | `functions/_shared/db-d1.ts` | ✅ |
| Set recovery PIN endpoint | `functions/api/auth/set-recovery-pin.ts` | ✅ NEW |
| Forgot password endpoint | `functions/api/auth/forgot-password.ts` | ✅ NEW |
| Forgot password UI | `app/auth/forgot-password/page.tsx` | ✅ NEW |
| "Forgot password?" link | `app/auth/login/page.tsx` | ✅ |
| Optional PIN in registration | `app/auth/register/page.tsx` + `register.ts` | ✅ |

## Key Decisions Made

1. **No email verification** - User wanted simple flow, email verification is stubbed
2. **On-site PIN verification** - 6-digit PIN instead of email-based password reset
3. **PIN is hashed** - Same PBKDF2 as passwords (100k iterations, timing-safe)
4. **PIN lockout** - 5 failed attempts = 30 min lockout
5. **Session revocation on password reset** - All sessions revoked for security
6. **Optional PIN during registration** - Can set later in account settings

## Files Modified

| File | Changes |
|------|---------|
| `functions/_shared/auth-service-workers.ts` | Made `createSession()` public; Added `setRecoveryPIN()`, `resetPasswordWithPIN()`, `handleFailedPINAttempt()` |
| `functions/_shared/db-d1.ts` | Added D1User PIN fields; Added `updateUserRecoveryPIN()`, `updatePINAttempts()`, `resetPINAttempts()` |
| `functions/api/auth/register.ts` | Added session creation, Set-Cookie headers, optional recoveryPin handling |
| `app/auth/register/page.tsx` | Added showSuccess state, success message, recoveryPin field with help tooltip |
| `app/auth/login/page.tsx` | Added "Forgot password?" link after password field |

## Files Created

| File | Purpose |
|------|---------|
| `migrations/d1/0005_add_recovery_pin.sql` | Adds recovery_pin_hash, recovery_pin_attempts, recovery_pin_locked_until columns |
| `functions/api/auth/set-recovery-pin.ts` | Authenticated endpoint to set/update 6-digit PIN |
| `functions/api/auth/forgot-password.ts` | Reset password with email + PIN verification |
| `app/auth/forgot-password/page.tsx` | Password reset UI with validation |

## Before Deploying

### Required: Run D1 Migration

```bash
wrangler d1 execute zeidgeist-auth --file=./migrations/d1/0005_add_recovery_pin.sql
```

This adds the recovery PIN columns to the users table. Without this migration, PIN features will fail.

## Testing Checklist

### Phase 1 Tests
- [ ] Register new user → Verify cookies are set in browser dev tools
- [ ] Register new user → Verify can access authenticated routes immediately
- [ ] Register page shows green success message for 1.5s before redirect

### Phase 2 Tests
- [ ] Authenticated user can set recovery PIN via `/api/auth/set-recovery-pin`
- [ ] Can reset password with valid email + PIN at `/auth/forgot-password`
- [ ] Account locks after 5 failed PIN attempts (30 min lockout)
- [ ] Password reset revokes all existing sessions
- [ ] Register with optional 6-digit PIN → PIN is set in database
- [ ] "Forgot password?" link visible on login page

## User Flow After Implementation

### Registration Flow
1. User fills form (email, password, optional username, optional 6-digit PIN)
2. Submits → API creates user
3. API creates session + sets cookies (auto-login)
4. API sets recovery PIN if provided
5. Frontend shows success message (1.5s)
6. Frontend redirects to returnTo URL
7. User is now logged in and can download extension

### Password Reset Flow
1. User clicks "Forgot password?" on login page
2. Navigates to `/auth/forgot-password`
3. Enters email + 6-digit recovery PIN + new password
4. API verifies PIN (hashed comparison)
5. API updates password hash
6. API revokes all existing sessions
7. User redirected to login page
8. User logs in with new password

## Security Features Implemented

1. **PIN Hashing**: PBKDF2-SHA256 with 100k iterations (same as passwords)
2. **Timing-Safe Comparison**: Prevents timing attacks
3. **Rate Limiting**: 5 attempts/hour for forgot-password endpoint
4. **Account Lockout**: 5 failed PIN attempts = 30 min lockout
5. **Session Revocation**: All sessions invalidated on password reset
6. **Generic Error Messages**: "Invalid email or PIN" prevents enumeration
7. **HttpOnly Cookies**: XSS protection for auth tokens
