#!/usr/bin/env python3
import json
import sys
import re
import base64
from utils.trace_decision import log_decision
from utils.performance_cache import (
    performance_decorator, get_preferences, compile_pattern_group, 
    match_pattern_group, cache_result, get_cached_result
)

# Pre-compile all secret detection patterns for maximum performance
_SECRET_PATTERNS_COMPILED = False

def _compile_secret_patterns():
    """Pre-compile all secret detection patterns once at module load."""
    global _SECRET_PATTERNS_COMPILED
    if _SECRET_PATTERNS_COMPILED:
        return
    
    # Define all secret patterns for pre-compilation
    secret_patterns = [
        # API keys and tokens - High Priority (checked first)
        (r'^sk-[a-zA-Z0-9]{20,}$', 'api_key'),  # OpenAI API keys
        (r'^sk_[a-zA-Z0-9]{24,}$', 'secret_key'),  # Stripe secret keys
        (r'^pk_[a-zA-Z0-9]{24,}$', 'public_key'),  # Stripe public keys
        (r'^AKIA[a-zA-Z0-9]{16,}$', 'access_key'),  # AWS Access Key
        (r'^ASIA[a-zA-Z0-9]{16,}$', 'temp_access_key'),  # AWS Temporary Access Key
        (r'^ghp_[a-zA-Z0-9]{36}$', 'personal_token'),  # GitHub personal access tokens
        (r'^gho_[a-zA-Z0-9]{36}$', 'oauth_token'),  # GitHub OAuth tokens
        (r'^ghu_[a-zA-Z0-9]{36}$', 'user_server_token'),  # GitHub user-to-server tokens
        (r'^ghs_[a-zA-Z0-9]{36}$', 'server_token'),  # GitHub server-to-server tokens
        (r'^ghr_[a-zA-Z0-9]{36}$', 'refresh_token'),  # GitHub refresh tokens
        (r'^xoxb-[a-zA-Z0-9-]+$', 'bot_token'),  # Slack Bot Token
        (r'^xoxp-[a-zA-Z0-9-]+$', 'user_token'),  # Slack User Token
        (r'^xoxa-[a-zA-Z0-9-]+$', 'app_token'),  # Slack App Token
        (r'^xoxr-[a-zA-Z0-9-]+$', 'config_token'),  # Slack Config Token
        (r'^AIza[a-zA-Z0-9]{35}$', 'api_key'),  # Google API Key
        (r'^ya29\.[a-zA-Z0-9_-]+$', 'oauth_token'),  # Google OAuth Token
        (r'^1//[a-zA-Z0-9_-]+$', 'oauth_refresh'),  # Google OAuth Refresh Token
        (r'^[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com$', 'oauth_client_id'),  # Google OAuth Client ID
        (r'^[0-9]{12}:aws:iam::[0-9]{12}:user/[a-zA-Z0-9_-]+$', 'user_arn'),  # AWS User ARN
        (r'^arn:aws:iam::[0-9]{12}:role/[a-zA-Z0-9_-]+$', 'role_arn'),  # AWS Role ARN
        # JWT tokens
        (r'^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$', 'jwt_token'),
        
        # Private keys (PEM format) - High Priority
        (r'^-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----', 'private_key_pem'),
        (r'^-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----', 'openssh_private_key'),
        (r'^-----BEGIN\s+DSA\s+PRIVATE\s+KEY-----', 'dsa_private_key'),
        (r'^-----BEGIN\s+EC\s+PRIVATE\s+KEY-----', 'ec_private_key'),
        (r'^-----BEGIN\s+PGP\s+PRIVATE\s+KEY\s+BLOCK-----', 'pgp_private_key'),
        (r'^-----BEGIN\s+PGP\s+PUBLIC\s+KEY\s+BLOCK-----', 'pgp_public_key'),
        (r'^-----BEGIN\s+PGP\s+MESSAGE-----', 'pgp_message'),
        (r'^-----BEGIN\s+PUBLIC\s+KEY-----', 'public_key_pem'),
        (r'^-----BEGIN\s+CERTIFICATE-----', 'certificate'),
        
        # SSH keys
        (r'^ssh-rsa\s+[A-Za-z0-9+/]+[=]*\s+[^@\s]+@[^@\s]+$', 'ssh_rsa_key'),
        (r'^ssh-ed25519\s+[A-Za-z0-9+/]+[=]*\s+[^@\s]+@[^@\s]+$', 'ssh_ed25519_key'),
        (r'^ssh-dss\s+[A-Za-z0-9+/]+[=]*\s+[^@\s]+@[^@\s]+$', 'ssh_dss_key'),
        
        # Database connection strings
        (r'^(postgresql|mysql|mongodb|redis)://[^@]+@[^:]+:\d+', 'database_connection'),
        (r'^mongodb\+srv://[^@]+@[^/]+', 'mongodb_srv_connection'),
        
        # Generic patterns - Lower Priority (checked last for performance)
        (r'^[a-zA-Z0-9]{40}$', 'sha1_hash'),  # SHA-1 hashes
        (r'^[a-zA-Z0-9]{64}$', 'sha256_hash'),  # SHA-256 hashes
        (r'^[a-zA-Z0-9]{128}$', 'sha512_hash'),  # SHA-512 hashes
        (r'^[A-Za-z0-9+/]{75,}={0,2}$', 'base64_encoded'),  # Base64 strings
        (r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'uuid'),  # UUIDs
        (r'^[A-Za-z0-9/+=]{75,}$', 'secret_key'),  # AWS secret access key
        (r'^[a-f0-9]{75,}$', 'hex_string'),  # Hex strings
        (r'^[A-Z0-9]{75,}$', 'uppercase_alphanumeric'),  # Uppercase alphanumeric
        (r'^[a-zA-Z0-9]{32,}$', 'long_alphanumeric'),  # Long alphanumeric strings (lowest priority)
    ]
    
    # Compile pattern groups for efficient batch matching
    compile_pattern_group('high_priority_secrets', secret_patterns[:20], re.IGNORECASE)
    compile_pattern_group('medium_priority_secrets', secret_patterns[20:40], re.IGNORECASE)
    compile_pattern_group('low_priority_secrets', secret_patterns[40:], re.IGNORECASE)
    
    _SECRET_PATTERNS_COMPILED = True

def is_likely_secret(text):
    """Check if text looks like a secret using pre-compiled patterns and caching."""
    if not text or len(text.strip()) < 10:
        return False, None
    
    text = text.strip()
    
    # Check cache first for performance
    cache_key = f"secret_check:{hash(text)}"
    cached_result = get_cached_result(cache_key)
    if cached_result is not None:
        return cached_result
    
    # Ensure patterns are compiled
    _compile_secret_patterns()
    
    # Check high-priority patterns first (most common secrets)
    matches = match_pattern_group('high_priority_secrets', text)
    if matches:
        result = (True, matches[0][0])  # Return first match
        cache_result(cache_key, result, ttl_override=600)  # Cache for 10 minutes
        return result
    
    # Check medium-priority patterns
    matches = match_pattern_group('medium_priority_secrets', text)
    if matches:
        result = (True, matches[0][0])
        cache_result(cache_key, result, ttl_override=600)
        return result
    
    # Check low-priority patterns (most expensive)
    matches = match_pattern_group('low_priority_secrets', text)
    if matches:
        result = (True, matches[0][0])
        cache_result(cache_key, result, ttl_override=600)
        return result
    
    # High entropy detection (for strings that don't match known patterns)
    if len(text) > 20:
        # Quick checks for natural language
        if ' ' in text:
            result = (False, None)
            cache_result(cache_key, result, ttl_override=300)  # Cache for 5 minutes
            return result
            
        # Optimized character type detection
        char_types = 0
        char_types += 1 if any(c.isupper() for c in text) else 0
        char_types += 1 if any(c.islower() for c in text) else 0
        char_types += 1 if any(c.isdigit() for c in text) else 0
        char_types += 1 if any(not c.isalnum() for c in text) else 0
        
        # Check entropy thresholds
        if (char_types >= 3 and len(text) > 75) or (char_types >= 2 and len(text) >= 40):
            result = (True, 'high_entropy_string')
            cache_result(cache_key, result, ttl_override=600)
            return result
    
    # Cache negative results for shorter time
    result = (False, None)
    cache_result(cache_key, result, ttl_override=120)  # Cache for 2 minutes
    return result

# Pre-compiled quoted content patterns
_QUOTED_PATTERNS_COMPILED = False

def _compile_quoted_patterns():
    """Pre-compile quoted content patterns for performance."""
    global _QUOTED_PATTERNS_COMPILED
    if _QUOTED_PATTERNS_COMPILED:
        return
    
    quoted_patterns = [
        (r'"([^"]{10,})"', 'double_quoted'),  # Double quoted strings
        (r"'([^']{10,})'", 'single_quoted'),   # Single quoted strings
        (r'`([^`]{10,})`', 'backtick_quoted'),  # Backtick quoted strings
    ]
    
    compile_pattern_group('quoted_patterns', quoted_patterns)
    _QUOTED_PATTERNS_COMPILED = True

def check_quoted_content(text):
    """Check for secrets in quoted content with caching and pre-compiled patterns."""
    # Check cache first
    cache_key = f"quoted_check:{hash(text)}"
    cached_result = get_cached_result(cache_key)
    if cached_result is not None:
        return cached_result
    
    # Ensure patterns are compiled
    _compile_quoted_patterns()
    
    # Use pre-compiled patterns
    import re
    quoted_patterns = [
        re.compile(r'"([^"]{10,})"'),
        re.compile(r"'([^']{10,})'"),
        re.compile(r'`([^`]{10,})`')
    ]
    
    for pattern in quoted_patterns:
        matches = pattern.findall(text)
        for match in matches:
            is_secret, pattern_name = is_likely_secret(match)
            if is_secret:
                result = (True, pattern_name, match)
                cache_result(cache_key, result, ttl_override=300)
                return result
    
    result = (False, None, None)
    cache_result(cache_key, result, ttl_override=120)
    return result

# Pre-compiled sensitive keyword patterns
_SENSITIVE_KEYWORDS_COMPILED = False

def _compile_sensitive_patterns():
    """Pre-compile sensitive keyword patterns for performance."""
    global _SENSITIVE_KEYWORDS_COMPILED
    if _SENSITIVE_KEYWORDS_COMPILED:
        return
    
    sensitive_keywords = [
        (r'(?i)\b(password|secret|key|token|private|pwd|encrypt|enc)\s*[:=]', 'auth_keywords'),
        (r'(?i)\b(api_key|access_key|secret_key|private_key)\s*[:=]', 'key_keywords'),
        (r'(?i)\b(auth|authentication|authorization)\s*[:=]', 'auth_patterns'),
        (r'(?i)\b(credential|cred)\s*[:=]', 'credential_keywords'),
        (r'(?i)\b(login|username|user)\s*[:=]', 'user_keywords'),
        (r'(?i)\b(database|db|connection)\s*[:=]', 'db_keywords'),
        (r'(?i)\b(host|port|endpoint|url)\s*[:=]', 'network_keywords'),
        (r'(?i)\b(session|cookie)\s*[:=]', 'session_keywords'),
        (r'(?i)\b(signature|sign)\s*[:=]', 'signature_keywords'),
        (r'(?i)\b(hash|digest|checksum)\s*[:=]', 'hash_keywords'),
    ]
    
    compile_pattern_group('sensitive_keywords', sensitive_keywords)
    _SENSITIVE_KEYWORDS_COMPILED = True

def check_for_sensitive_keywords(text):
    """Check for sensitive keywords with caching and pre-compiled patterns."""
    # Check cache first
    cache_key = f"keyword_check:{hash(text)}"
    cached_result = get_cached_result(cache_key)
    if cached_result is not None:
        return cached_result
    
    # Ensure patterns are compiled
    _compile_sensitive_patterns()
    
    # Use pre-compiled pattern matching
    matches = match_pattern_group('sensitive_keywords', text)
    result = len(matches) > 0
    
    # Cache result
    cache_result(cache_key, result, ttl_override=300)
    return result

@performance_decorator("no_secrets_prompted")
def main():
    """Main function with performance monitoring and optimization."""
    # Load input from stdin
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)

    prompt = input_data.get("prompt", "")

    # Check if secret pattern safety checks are enabled (cached)
    preferences = get_preferences()
    secret_pattern_safety_checks = preferences.get('secret_pattern_safety_checks', {})
    if not secret_pattern_safety_checks.get('enabled', True):
        print(f"Skipping secret pattern safety checks.")
        sys.exit(0)

    # Ensure all patterns are pre-compiled before processing
    _compile_secret_patterns()
    _compile_quoted_patterns()
    _compile_sensitive_patterns()

    # Check for sensitive keywords FIXME: (Disabled for false positives)
    # if check_for_sensitive_keywords(prompt):
    #     output = {
    #         "continue": False,
    #         "stopReason": "Security policy violation: Prompt contains sensitive keywords. Please rephrase your request without sensitive information.",
    #         "suppressOutput": True,
    #         "decision": "block",
    #         "reason": "Security policy violation: Prompt contains sensitive keywords. Please rephrase your request without sensitive information."
    #     }
    #     print(json.dumps(output))
    #     sys.exit(2)

    # Check for secrets in quoted content (optimized)
    found_secret, pattern_name, match_text = check_quoted_content(prompt)
    if found_secret:
        # Show first 8 characters with ellipsis
        preview = match_text[:8] + "..." if len(match_text) > 8 else match_text
        output = {
            "continue": False,
            "stopReason": "Security policy violation: Quoted content contains potential secrets. Please rephrase your request without sensitive information. You may reference secrets from a different directory or vault (e.g. doppler, hashicorp vault, unix pass).",
            "suppressOutput": True,
            "decision": "block",
            "reason": f"Security policy violation: Quoted content contains potential secrets. Pattern triggered: {pattern_name} (starts with: {preview}). Please rephrase your request without sensitive information. You may reference secrets from a different directory or vault  (e.g. doppler, hashicorp vault, unix pass)."
        }
        log_decision(output, operation_type="quoted_secrets_decision")
        print(json.dumps(output))
        sys.exit(2)

    # Optimized word-by-word secret checking with early exit
    words = prompt.split()
    for word in words:
        # Skip very short words for performance
        if len(word) < 10:
            continue
            
        is_secret, pattern_name = is_likely_secret(word)
        if is_secret:
            # Show first 8 characters with ellipsis
            preview = word[:8] + "..." if len(word) > 8 else word
            output = {
                "continue": False,
                "stopReason": "Security policy violation: Prompt contains potential secret values. Please rephrase your request without sensitive information.",
                "suppressOutput": True,
                "decision": "block",
                "reason": f"Security policy violation: Prompt contains potential secret values. Pattern triggered: {pattern_name} (starts with: {preview}). Please rephrase your request without sensitive information."
            }
            log_decision(output, operation_type="word_secrets_decision")
            print(json.dumps(output))
            sys.exit(2)

    # Allow the prompt to proceed
    output = {
        "reason": "No sensitive information detected in prompt. Proceeding."
    }
    print(json.dumps(output))
    sys.exit(0)

if __name__ == "__main__":
    main()