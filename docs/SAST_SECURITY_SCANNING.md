# SAST Security Scanning Guide

## Overview

This document describes the Static Application Security Testing (SAST) strategy for zeidgeist-prompter, including tool configurations, scanning schedules, and remediation workflows.

**Workflow File**: `.github/workflows/security-scanning.yml`
**Frequency**: On PR, push to main, weekly scheduled scans, manual trigger
**Status**: ✅ Comprehensive multi-tool SAST pipeline implemented

---

## SAST Tools Overview

### 1. **Semgrep** (Primary SAST Scanner)

**Purpose**: Multi-language static analysis with OWASP Top 10 coverage
**Language Support**: TypeScript, JavaScript, React, Node.js
**Ruleset**:
- `p/owasp-top-ten` - OWASP vulnerabilities
- `p/ci` - CI/CD security checks
- `p/security-audit` - Security best practices
- `p/typescript` - TypeScript-specific issues
- `p/react` - React security patterns
- `p/nodejs` - Node.js vulnerabilities

**Output**: SARIF file uploaded to GitHub Security tab

**Example Detection**:
```typescript
// Semgrep detects:
const query = `SELECT * FROM users WHERE id = ${userId}`; // ❌ SQL injection
eval(userInput); // ❌ Code injection
crypto.createHash('md5'); // ❌ Weak hashing
```

**Configuration**:
```yaml
- name: Run Semgrep
  run: |
    semgrep scan \
      --config auto \
      --config p/owasp-top-ten \
      --config p/ci \
      --config p/security-audit \
      --config p/typescript \
      --config p/react \
      --config p/nodejs \
      --sarif \
      --output semgrep-results.sarif
```

---

### 2. **CodeQL** (GitHub Advanced Analysis)

**Purpose**: Semantic code analysis with data flow tracking
**Language Support**: JavaScript, TypeScript
**Queries**: `security-and-quality` (comprehensive ruleset)

**Unique Capabilities**:
- **Data flow analysis**: Tracks tainted data from input to sink
- **Control flow analysis**: Detects logic vulnerabilities
- **Cross-file analysis**: Finds vulnerabilities spanning multiple files

**Example Detection**:
```typescript
// CodeQL tracks data flow:
const userInput = req.body.name; // Source
const query = db.query(`SELECT * FROM users WHERE name = '${userInput}'`); // Sink
// ❌ CodeQL: Tainted data flows from user input to SQL query
```

**Configuration**:
```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: 'javascript', 'typescript'
    queries: +security-and-quality
```

---

### 3. **Trivy** (Dependency & Config Scanner)

**Purpose**: Vulnerability scanning for dependencies and misconfigurations
**Scan Types**:
- **Filesystem**: package.json, package-lock.json vulnerabilities
- **Config**: Docker, Kubernetes, Terraform misconfigurations

**Severity Levels**: CRITICAL, HIGH, MEDIUM
**Database**: Continuously updated CVE database

**Example Detection**:
```json
// Trivy detects:
{
  "vulnerabilities": [
    {
      "title": "SQL Injection in pg < 8.11.0",
      "severity": "CRITICAL",
      "cvss": 9.8,
      "fixed_version": "8.11.0"
    }
  ]
}
```

**Configuration**:
```yaml
- name: Run Trivy
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    format: 'sarif'
    severity: 'CRITICAL,HIGH,MEDIUM'
```

---

### 4. **ESLint Security Plugin**

**Purpose**: JavaScript/TypeScript linting with security rules
**Plugins**:
- `eslint-plugin-security` - Security-focused rules
- `@typescript-eslint` - TypeScript-specific checks
- `eslint-plugin-react` - React security patterns

**Example Detection**:
```typescript
// ESLint detects:
eval(userCode); // ❌ no-eval
new Function(userCode)(); // ❌ no-implied-eval
document.write(userHTML); // ❌ no-document-write
localStorage.setItem('token', jwt); // ❌ sensitive-data-in-storage
```

**Configuration**:
```yaml
- name: Run ESLint with security rules
  run: |
    npx eslint . \
      --ext .js,.jsx,.ts,.tsx \
      --format @microsoft/eslint-formatter-sarif \
      --output-file eslint-results.sarif
```

---

### 5. **NPM Audit + Snyk** (Dependency Scanning)

**Purpose**: Identify known vulnerabilities in npm packages
**Coverage**: Direct and transitive dependencies

**NPM Audit**:
- Built-in to npm
- Checks against npm advisory database
- Severity levels: low, moderate, high, critical

**Snyk**:
- More comprehensive vulnerability database
- Automated fix PRs
- License compliance checking

**Example Output**:
```
┌───────────────┬──────────────────────────────────────────────────────────┐
│ High          │ Regular Expression Denial of Service                    │
├───────────────┼──────────────────────────────────────────────────────────┤
│ Package       │ minimatch                                                │
├───────────────┼──────────────────────────────────────────────────────────┤
│ Vulnerable    │ <3.0.5                                                   │
├───────────────┼──────────────────────────────────────────────────────────┤
│ Fixed         │ >=3.0.5                                                  │
└───────────────┴──────────────────────────────────────────────────────────┘
```

**Configuration**:
```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate

- name: Run Snyk
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

### 6. **GitGuardian + TruffleHog** (Secret Scanning)

**Purpose**: Detect hardcoded secrets, API keys, credentials
**Scan Scope**: Full git history

**GitGuardian**:
- 350+ secret patterns
- Historical and real-time scanning
- Integration with GitHub Security

**TruffleHog**:
- Entropy-based detection
- Regex pattern matching
- Verified credential detection

**Example Detection**:
```typescript
// Detected secrets:
const apiKey = "sk_live_51H7xK2L..."; // ❌ Stripe API key
const awsSecret = "wJalrXUtnFEMI/K7MDENG..."; // ❌ AWS secret key
const dbUrl = "postgres://admin:P@ssw0rd@..."; // ❌ Database credentials
```

**Configuration**:
```yaml
- name: GitGuardian scan
  uses: GitGuardian/ggshield/actions/secret@main
  env:
    GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}

- name: TruffleHog OSS
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    extra_args: --only-verified
```

---

### 7. **License Compliance Scanning**

**Purpose**: Ensure dependency licenses are compatible with project license
**Tool**: `license-checker`

**Example Output**:
```
├─ MIT: 1234
├─ Apache-2.0: 56
├─ BSD-3-Clause: 23
├─ ISC: 12
└─ GPL-3.0: 1 ⚠️ (Potential conflict)
```

**Configuration**:
```yaml
- name: Check licenses
  run: |
    npx license-checker --summary
    npx license-checker --json --out license-report.json
```

---

## Scanning Schedule

### 1. **Pull Request Scans** (Triggered on PR open/sync)
- ✅ Semgrep (OWASP)
- ✅ CodeQL
- ✅ Trivy
- ✅ ESLint Security
- ✅ NPM Audit
- ✅ Secret Scanning

**Result**: Comment on PR with security summary

---

### 2. **Push to Main** (Triggered on main/master/develop push)
All scans from PR + license compliance

**Result**: Update GitHub Security tab

---

### 3. **Weekly Scheduled Scan** (Sundays at 2 AM UTC)
Comprehensive scan of entire codebase

**Result**: Email notification + Security tab update

---

### 4. **Manual Trigger** (workflow_dispatch)
On-demand full security scan

**Usage**:
```bash
# Via GitHub UI: Actions → Security Scanning → Run workflow
```

---

## Vulnerability Remediation Workflow

### Step 1: Detection
- SAST tool identifies vulnerability
- Finding uploaded to GitHub Security → Code scanning alerts

### Step 2: Triage
- Security team reviews finding
- Assign severity: Critical / High / Medium / Low
- Assign to developer for remediation

### Step 3: Fix Development
Developer creates fix:
```bash
git checkout -b fix/security-issue-123
# Apply fix
git commit -m "[security] Fix SQL injection in search endpoint"
git push origin fix/security-issue-123
```

### Step 4: Verification
- PR is opened
- SAST scans run automatically
- Verify finding is resolved

### Step 5: Deployment
- Merge to main
- Deploy to production
- Close security alert in GitHub

---

## GitHub Secrets Configuration

Required secrets for full SAST functionality:

```bash
# Snyk (Dependency scanning)
SNYK_TOKEN=<your-snyk-api-token>

# GitGuardian (Secret scanning)
GITGUARDIAN_API_KEY=<your-gitguardian-api-key>

# Codecov (Coverage reporting)
CODECOV_TOKEN=<your-codecov-token>
```

**Setup**:
1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with the corresponding value

---

## SARIF Upload & GitHub Security Integration

All scanners output SARIF (Static Analysis Results Interchange Format) which is uploaded to GitHub Security tab.

**Benefits**:
- Unified vulnerability view
- Automated PR comments
- Severity-based filtering
- Trend analysis over time

**View Results**:
```
GitHub repo → Security tab → Code scanning
```

**Example Alert**:
```
🔴 Critical: SQL Injection
File: app/lib/db/query.ts:42
Detected by: Semgrep

const query = `SELECT * FROM users WHERE id = ${userId}`;

Recommendation: Use parameterized queries
```

---

## Custom Security Rules

### Adding Custom Semgrep Rules

Create `.semgrep/rules.yml`:
```yaml
rules:
  - id: hardcoded-database-url
    pattern: DATABASE_URL = "postgres://..."
    message: Hardcoded database URL detected
    severity: ERROR
    languages: [typescript, javascript]

  - id: weak-jwt-secret
    pattern: JWT_SECRET = "..."
    message: JWT secret should be loaded from environment
    severity: WARNING
    languages: [typescript, javascript]
```

Update workflow:
```yaml
semgrep scan \
  --config auto \
  --config .semgrep/rules.yml
```

---

### Adding Custom ESLint Rules

Update `.eslintrc.json`:
```json
{
  "rules": {
    "no-eval": "error",
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error"
  }
}
```

---

## Performance Considerations

### Scan Duration
- **Semgrep**: ~2-3 minutes
- **CodeQL**: ~5-7 minutes (includes build)
- **Trivy**: ~1-2 minutes
- **ESLint**: ~30 seconds
- **NPM Audit**: ~10 seconds
- **Secret Scan**: ~1-2 minutes

**Total**: ~10-15 minutes per full scan

### Optimizations
1. **Parallel execution**: All jobs run in parallel
2. **Caching**: Node modules cached between runs
3. **Incremental analysis**: CodeQL only scans changed files on PR
4. **Fast fail**: `continue-on-error: true` for non-blocking scans

---

## False Positive Management

### Semgrep
Ignore specific findings:
```typescript
// nosemgrep: typescript.lang.security.audit.sqli.pg-sqli.node-pg-sqli
const query = db.execute(sql`SELECT * FROM ${table}`);
```

### CodeQL
Suppress alerts via GitHub UI:
```
Security tab → Code scanning → Alert → Dismiss → False positive
```

### ESLint
```typescript
// eslint-disable-next-line security/detect-object-injection
const value = obj[userInput];
```

---

## Metrics & Monitoring

### Key Metrics to Track
1. **Vulnerability count by severity** (Critical/High/Medium/Low)
2. **Mean time to remediate (MTTR)** - Time from detection to fix
3. **False positive rate** - % of findings dismissed as false positives
4. **Scan coverage** - % of codebase scanned
5. **Dependency freshness** - % of dependencies up-to-date

### Dashboard Example
```
┌─────────────────────────────────────────┐
│ Security Scan Results (Last 30 Days)   │
├─────────────────────────────────────────┤
│ Critical: 0 (Target: 0)                 │
│ High: 2 (Target: <5)                    │
│ Medium: 15 (Target: <20)                │
│ Low: 45 (Informational)                 │
├─────────────────────────────────────────┤
│ MTTR: 2.3 days (Target: <3 days)        │
│ False Positive Rate: 12% (Target: <15%) │
│ Scan Coverage: 98% (Target: >95%)       │
└─────────────────────────────────────────┘
```

---

## Troubleshooting

### Problem: CodeQL fails with "Out of memory"

**Solution**: Increase memory limit
```yaml
- name: Perform CodeQL Analysis
  env:
    CODEQL_RAM: 8192  # 8GB
```

---

### Problem: Semgrep too slow

**Solution**: Reduce ruleset scope
```yaml
semgrep scan \
  --config p/ci  # Only CI-critical rules
```

---

### Problem: Too many false positives

**Solution**: Fine-tune rules
```yaml
# .semgrep.yml
rules:
  - id: custom-rule
    severity: WARNING  # Downgrade severity
    options:
      taint_only: true  # More precise analysis
```

---

## Best Practices

### 1. **Fix Critical/High Before Merge**
Block PR merge if critical/high vulnerabilities found:
```yaml
- name: Check for critical findings
  run: |
    if grep -q "CRITICAL\|HIGH" semgrep-results.sarif; then
      echo "Critical/High vulnerabilities found!"
      exit 1
    fi
```

### 2. **Regular Dependency Updates**
```bash
# Weekly: Update dependencies
npm update
npm audit fix

# Monthly: Major version updates
npm outdated
npm install <package>@latest
```

### 3. **Developer Training**
- Monthly security training
- Share SAST findings in team meetings
- Code review focus on security patterns

### 4. **Continuous Improvement**
- Review false positives weekly
- Add custom rules for project-specific patterns
- Tune severity levels based on context

---

## Related Documentation

- [SQL Injection Prevention](./SQL_INJECTION_PREVENTION.md)
- [Security Configuration Guide](./SECURITY_CONFIGURATION.md)
- [Rate Limiting Setup](./RATE_LIMITING_SETUP.md)

---

**Last Updated**: 2025-10-01
**Maintained By**: Security Engineering Team
