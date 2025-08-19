# Post-Deployment Penetration Test Plan
## OWASP Top 10 Focus + Privacy-Specific Tests

### Test Execution Timeline
- **Pre-deployment:** Staging environment tests
- **Post-deployment:** Production tests (limited scope)
- **Duration:** 4 hours maximum
- **Window:** During low-traffic hours

---

## 🎯 OWASP Top 10 (2021) Test Cases

### A01: Broken Access Control
#### Test 1: Cross-User History Access
```bash
# Test different IP addresses can't access each other's data
curl -H "cf-connecting-ip: 1.1.1.1" -H "Authorization: Bearer token_user_a" \
  https://mstprmpt.zeidgeist.com/api/engineer/history

curl -H "cf-connecting-ip: 2.2.2.2" -H "Authorization: Bearer token_user_b" \
  https://mstprmpt.zeidgeist.com/api/engineer/history

# Verify no cross-contamination in responses
```

#### Test 2: Privilege Escalation
```bash
# Test unauthorized endpoint access
curl -X POST https://mstprmpt.zeidgeist.com/api/admin/users \
  -H "Authorization: Bearer user_token"

# Expected: 403 Forbidden
```

#### Test 3: Direct Object Reference
```bash
# Test accessing history by guessing IDs
curl https://mstprmpt.zeidgeist.com/api/engineer/history/12345 \
  -H "cf-connecting-ip: 3.3.3.3"

# Expected: 404 or proper access control
```

### A02: Cryptographic Failures
#### Test 4: TLS Configuration
```bash
# Test SSL/TLS strength
nmap --script ssl-enum-ciphers -p 443 mstprmpt.zeidgeist.com

# Verify:
# - TLS 1.2+ only
# - Strong cipher suites
# - Perfect Forward Secrecy
```

#### Test 5: Sensitive Data Exposure
```bash
# Check for sensitive data in responses
curl https://mstprmpt.zeidgeist.com/api/engineer/history \
  -H "cf-connecting-ip: 4.4.4.4" | grep -E "(password|secret|key|token)"

# Expected: No sensitive data exposed
```

### A03: Injection
#### Test 6: SQL Injection
```bash
# Test history endpoint for SQL injection
curl "https://mstprmpt.zeidgeist.com/api/engineer/history?page=1' OR '1'='1" \
  -H "cf-connecting-ip: 5.5.5.5"

# Test with various payloads
curl "https://mstprmpt.zeidgeist.com/api/engineer/history?page=1; DROP TABLE users--" \
  -H "cf-connecting-ip: 5.5.5.5"

# Expected: Proper input validation, no injection
```

#### Test 7: NoSQL Injection
```bash
# Test JSON injection
curl -X POST https://mstprmpt.zeidgeist.com/api/engineer/history \
  -H "Content-Type: application/json" \
  -H "cf-connecting-ip: 6.6.6.6" \
  -d '{"original": {"$ne": null}, "refined": "test"}'

# Expected: Input validation errors
```

### A04: Insecure Design
#### Test 8: Business Logic Flaws
```bash
# Test history pagination limits
curl "https://mstprmpt.zeidgeist.com/api/engineer/history?limit=999999" \
  -H "cf-connecting-ip: 7.7.7.7"

# Expected: Reasonable limit enforcement (max 100)
```

### A05: Security Misconfiguration
#### Test 9: HTTP Security Headers
```bash
# Check security headers
curl -I https://mstprmpt.zeidgeist.com/api/engineer/history \
  -H "cf-connecting-ip: 8.8.8.8"

# Verify presence of:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection: 1; mode=block
# - Strict-Transport-Security
# - Content-Security-Policy
```

#### Test 10: Error Handling
```bash
# Test error message information leakage
curl -X POST https://mstprmpt.zeidgeist.com/api/engineer/history \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'

# Expected: Generic error messages, no stack traces
```

### A06: Vulnerable Components
#### Test 11: Dependency Scanning
```bash
# Check for known vulnerabilities (run locally)
npm audit --audit-level high
yarn audit --level high

# Expected: No high/critical vulnerabilities
```

### A07: Authentication Failures
#### Test 12: Brute Force Protection
```bash
# Test rate limiting on auth endpoints
for i in {1..10}; do
  curl -X POST https://mstprmpt.zeidgeist.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@test.com", "password": "wrong"}'
done

# Expected: Rate limiting after 3-5 attempts
```

### A08: Software and Data Integrity
#### Test 13: API Integrity
```bash
# Test response tampering detection
curl https://mstprmpt.zeidgeist.com/api/engineer/history \
  -H "cf-connecting-ip: 9.9.9.9" \
  --proxy 127.0.0.1:8080  # Using OWASP ZAP proxy

# Verify integrity controls
```

### A09: Logging and Monitoring
#### Test 14: Security Event Logging
```bash
# Generate security events and verify logging
curl -H "cf-connecting-ip: 10.10.10.10" \
  "https://mstprmpt.zeidgeist.com/api/engineer/history?page=../../../etc/passwd"

# Check logs for security events
# Expected: Event logged with severity HIGH
```

### A10: Server-Side Request Forgery
#### Test 15: SSRF Prevention
```bash
# Test SSRF in any URL parameters
curl -X POST https://mstprmpt.zeidgeist.com/api/engineer \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "webhook": "http://internal.example.com/admin"}'

# Expected: URL validation and filtering
```

---

## 🔒 Privacy-Specific Test Cases

### Privacy Test 1: IP Isolation Validation
```python
import requests
import concurrent.futures

def test_ip_isolation():
    """Test that different IPs see different history"""
    ips = ['11.11.11.11', '22.22.22.22', '33.33.33.33']
    histories = {}
    
    for ip in ips:
        # Create unique history for each IP
        response = requests.post(
            'https://mstprmpt.zeidgeist.com/api/engineer/history',
            headers={'cf-connecting-ip': ip},
            json={
                'original': f'Test prompt from {ip}',
                'refined': f'Refined prompt from {ip}',
                'timestamp': '2025-08-19T12:00:00Z'
            }
        )
        
        # Fetch history for this IP
        history = requests.get(
            'https://mstprmpt.zeidgeist.com/api/engineer/history',
            headers={'cf-connecting-ip': ip}
        ).json()
        
        histories[ip] = history
    
    # Verify isolation
    for ip1 in ips:
        for ip2 in ips:
            if ip1 != ip2:
                assert not any(
                    item['original'].endswith(ip2) 
                    for item in histories[ip1]['items']
                ), f"IP {ip1} can see data from IP {ip2}"
    
    print("✅ IP isolation test passed")

test_ip_isolation()
```

### Privacy Test 2: Data Leakage in Pagination
```python
def test_pagination_leakage():
    """Test pagination doesn't leak cross-user data"""
    ip = '44.44.44.44'
    
    # Create 15 items
    for i in range(15):
        requests.post(
            'https://mstprmpt.zeidgeist.com/api/engineer/history',
            headers={'cf-connecting-ip': ip},
            json={
                'original': f'Test {i}',
                'refined': f'Refined {i}',
                'timestamp': '2025-08-19T12:00:00Z'
            }
        )
    
    # Test pagination
    all_items = []
    for page in range(3):
        response = requests.get(
            f'https://mstprmpt.zeidgeist.com/api/engineer/history?page={page}&limit=5',
            headers={'cf-connecting-ip': ip}
        ).json()
        all_items.extend(response['items'])
    
    # Verify all items belong to this IP
    for item in all_items:
        assert 'Test' in item['original'], "Foreign data found in pagination"
    
    print("✅ Pagination isolation test passed")

test_pagination_leakage()
```

### Privacy Test 3: Rate Limiting Isolation
```python
def test_rate_limiting_isolation():
    """Test rate limiting is per-IP"""
    ip1, ip2 = '55.55.55.55', '66.66.66.66'
    
    # Exhaust rate limit for IP1
    for i in range(25):
        requests.get(
            'https://mstprmpt.zeidgeist.com/api/engineer/history',
            headers={'cf-connecting-ip': ip1}
        )
    
    # IP2 should still work
    response = requests.get(
        'https://mstprmpt.zeidgeist.com/api/engineer/history',
        headers={'cf-connecting-ip': ip2}
    )
    
    assert response.status_code == 200, "Rate limiting not isolated per IP"
    print("✅ Rate limiting isolation test passed")

test_rate_limiting_isolation()
```

---

## 📊 Success Criteria

### Security Metrics
- [ ] **Zero** cross-user data access
- [ ] **Zero** injection vulnerabilities  
- [ ] **Zero** authentication bypasses
- [ ] Rate limiting: <2% false positives
- [ ] Response time: <200ms degradation
- [ ] Error rate: <0.1% increase

### Privacy Metrics  
- [ ] **100%** IP-based isolation
- [ ] **Zero** data leakage in pagination
- [ ] **Zero** sensitive data in responses
- [ ] Audit logging: 100% coverage
- [ ] Compliance: All GDPR/CCPA requirements met

### Performance Metrics
- [ ] Latency P99: <500ms
- [ ] Throughput: No >5% degradation  
- [ ] Memory usage: <20% increase
- [ ] CPU usage: <15% increase

---

## 🚨 Rollback Triggers

Execute immediate rollback if:
1. **Critical:** Cross-user data exposure detected
2. **Critical:** Authentication bypass discovered  
3. **High:** Error rate >0.5%
4. **High:** Latency P99 >1000ms
5. **Medium:** Security alerts >5 in 10 minutes

---

## 📋 Test Execution Checklist

### Pre-Test Setup
- [ ] Staging environment mirrors production
- [ ] Test data isolated from production
- [ ] Monitoring alerts configured
- [ ] Rollback plan validated

### During Test Execution  
- [ ] Real-time monitoring active
- [ ] Security team on standby
- [ ] All test cases documented
- [ ] Performance metrics tracked

### Post-Test Actions
- [ ] Results documented with evidence
- [ ] Vulnerabilities prioritized by CVSS
- [ ] Remediation plan created
- [ ] Stakeholders notified

---

## 📄 Deliverables

1. **Penetration Test Report**
   - Executive summary
   - Technical findings
   - Risk assessment (Low/Medium/High/Critical)
   - Remediation recommendations

2. **Evidence Package**
   - Screenshots of test execution
   - Network traffic captures
   - Log file excerpts
   - Performance metrics

3. **Compliance Attestation**
   - OWASP Top 10 compliance status
   - Privacy control validation
   - Security control effectiveness

4. **Action Items**
   - Immediate fixes required
   - Security improvements recommended
   - Monitoring enhancements needed