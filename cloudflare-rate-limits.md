# Cloudflare Rate Limiting Configuration

To implement server-side rate limiting via Cloudflare for the ZeidGeist AI Prompter, configure the following rules in your Cloudflare dashboard:

## Rate Limiting Rules

### 1. API Endpoint Protection
- **Rule Name**: AI Prompter API Protection
- **Path Pattern**: `aipromptise.pages.dev/functions/api/*`
- **Rate Limit**: 30 requests per minute per IP
- **Action**: Block for 5 minutes
- **Response Code**: 429
- **Custom Response**: `{"error":"Rate limit exceeded","retry_after":300}`

### 2. Main Enhancement Endpoint
- **Rule Name**: Prompt Enhancement Rate Limit
- **Path Pattern**: `aipromptise.pages.dev/functions/api/engineer`
- **Rate Limit**: 10 requests per minute per IP
- **Action**: Block for 2 minutes
- **Response Code**: 429

### 3. Learning System Protection
- **Rule Name**: Learning System Rate Limit
- **Path Pattern**: `aipromptise.pages.dev/functions/api/learning/*`
- **Rate Limit**: 5 requests per minute per IP
- **Action**: Block for 10 minutes
- **Response Code**: 429

### 4. Feedback System
- **Rule Name**: Feedback Rate Limit
- **Path Pattern**: `aipromptise.pages.dev/functions/api/engineer/feedback`
- **Rate Limit**: 5 requests per minute per IP
- **Action**: Block for 1 minute
- **Response Code**: 429

## Configuration Steps

1. **Access Cloudflare Dashboard**
   - Login to your Cloudflare account
   - Select the domain for your site

2. **Navigate to Security > WAF**
   - Go to "Rate limiting rules"
   - Click "Create rule"

3. **Configure Each Rule**
   - Set the rule name and description
   - Configure the path patterns above
   - Set rate limits and actions
   - Enable the rule

4. **Additional Security Rules**
   - Enable "Bot Fight Mode" for automated threat protection
   - Configure "Security Level" to High
   - Enable "Challenge Passage" for suspicious requests

## Environment Variables

Add these to your Cloudflare Pages environment variables:

```env
# Authentication (Optional - for enhanced security)
VALID_API_KEYS=your-api-key-1,your-api-key-2,your-api-key-3

# Rate Limiting (Already handled by Cloudflare, but can be customized)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30
```

## Monitoring

Monitor rate limiting effectiveness through:
- Cloudflare Analytics > Security Events
- Cloudflare Logs (if available on your plan)
- Application logs for authentication failures

## Testing

Test rate limits by:
1. Making rapid requests to API endpoints
2. Verifying 429 responses after limits are exceeded
3. Confirming rate limit resets after the specified time

Note: The application includes fallback in-memory rate limiting for additional protection.