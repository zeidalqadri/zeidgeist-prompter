# User Authentication Migration Plan
## Transitioning from IP-Based to User-Based Isolation

### Phase 1: Foundation (Week 1)
#### 1.1 Database Schema Updates
```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB
);

-- Create sessions table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW(),
  is_revoked BOOLEAN DEFAULT false
);

-- Create migration mapping table
CREATE TABLE ip_to_user_migration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45) NOT NULL,
  user_id UUID REFERENCES users(id),
  migrated_at TIMESTAMP,
  history_count INTEGER,
  status VARCHAR(50) DEFAULT 'pending'
);

-- Add user_id to existing tables
ALTER TABLE prompt_history ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE feedback ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE enhancement_logs ADD COLUMN user_id UUID REFERENCES users(id);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_history_user ON prompt_history(user_id);
```

#### 1.2 Authentication Service Implementation
```typescript
// /functions/_shared/auth-service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  async register(email: string, password: string): Promise<User> {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await db.insert(users).values({
      email,
      passwordHash,
      emailVerified: false
    }).returning();
    
    // Send verification email
    await this.sendVerificationEmail(user.email);
    
    return user;
  }
  
  async login(email: string, password: string): Promise<Session> {
    // Verify credentials
    const user = await db.select().from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      throw new Error('Invalid credentials');
    }
    
    // Create session
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    await db.insert(userSessions).values({
      userId: user.id,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    return { token, user };
  }
  
  async validateSession(token: string): Promise<User | null> {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check session in database
    const session = await db.select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.tokenHash, this.hashToken(token)),
          gt(userSessions.expiresAt, new Date()),
          eq(userSessions.isRevoked, false)
        )
      )
      .limit(1);
    
    if (!session) return null;
    
    // Update last accessed
    await db.update(userSessions)
      .set({ lastAccessed: new Date() })
      .where(eq(userSessions.id, session.id));
    
    return await this.getUserById(decoded.userId);
  }
}
```

### Phase 2: Migration Strategy (Week 2)

#### 2.1 Dual-Mode Operation
```typescript
// Support both IP and user-based access during transition
export async function getHistoryWithDualMode(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    // New authentication mode
    const user = await authService.validateSession(token);
    if (user) {
      return db.select()
        .from(promptHistory)
        .where(eq(promptHistory.userId, user.id));
    }
  }
  
  // Fallback to IP-based (legacy mode)
  const clientIP = getClientIP(request);
  return db.select()
    .from(promptHistory)
    .where(eq(promptHistory.ipAddress, clientIP));
}
```

#### 2.2 Data Migration Script
```typescript
// /scripts/migrate-ip-to-users.ts
export async function migrateIPHistoryToUsers() {
  // Get unique IPs with history
  const uniqueIPs = await db
    .selectDistinct({ ipAddress: promptHistory.ipAddress })
    .from(promptHistory)
    .where(isNotNull(promptHistory.ipAddress));
  
  for (const { ipAddress } of uniqueIPs) {
    // Check if already migrated
    const existing = await db.select()
      .from(ipToUserMigration)
      .where(eq(ipToUserMigration.ipAddress, ipAddress))
      .limit(1);
    
    if (existing && existing.status === 'completed') continue;
    
    // Count history items
    const historyCount = await db.select({ count: count() })
      .from(promptHistory)
      .where(eq(promptHistory.ipAddress, ipAddress));
    
    // Create migration record
    await db.insert(ipToUserMigration).values({
      ipAddress,
      historyCount: historyCount[0].count,
      status: 'pending'
    });
    
    console.log(`Prepared migration for IP ${ipAddress}: ${historyCount[0].count} items`);
  }
}
```

### Phase 3: Frontend Updates (Week 2-3)

#### 3.1 Login/Register Components
```tsx
// /components/auth/login-form.tsx
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const { token } = await response.json();
      localStorage.setItem('authToken', token);
      window.location.reload();
    }
  };
  
  return (
    <form onSubmit={handleLogin}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}
```

#### 3.2 API Client Updates
```typescript
// /lib/api-client.ts
class APIClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  
  async fetchHistory() {
    const response = await fetch('/api/engineer/history', {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }
}
```

### Phase 4: Rollout Plan (Week 3-4)

#### 4.1 Feature Flags
```typescript
export const FEATURES = {
  USER_AUTH_ENABLED: process.env.ENABLE_USER_AUTH === 'true',
  IP_FALLBACK_ENABLED: process.env.ENABLE_IP_FALLBACK !== 'false',
  REQUIRE_AUTH: process.env.REQUIRE_AUTH === 'true'
};
```

#### 4.2 Gradual Rollout
1. **Week 1**: Deploy auth system, disabled by default
2. **Week 2**: Enable registration for beta users
3. **Week 3**: Enable dual-mode for all users
4. **Week 4**: Migrate existing IP-based histories
5. **Week 5**: Make authentication default
6. **Week 6**: Deprecate IP-based access

### Phase 5: Monitoring & Validation

#### 5.1 Migration Metrics
```typescript
export async function getMigrationMetrics() {
  const stats = await db.select({
    total: count(),
    migrated: count(ipToUserMigration.userId),
    pending: count(sql`CASE WHEN status = 'pending' THEN 1 END`)
  }).from(ipToUserMigration);
  
  return {
    totalIPs: stats.total,
    migratedUsers: stats.migrated,
    pendingMigrations: stats.pending,
    completionRate: (stats.migrated / stats.total) * 100
  };
}
```

#### 5.2 Success Criteria
- [ ] 100% of active users registered
- [ ] 95% of historical data migrated
- [ ] Zero data loss during migration
- [ ] No increase in error rates
- [ ] User satisfaction maintained

### Phase 6: Cleanup (Week 5-6)

#### 6.1 Remove IP-Based Code
```sql
-- After successful migration
ALTER TABLE prompt_history DROP COLUMN ip_address;
ALTER TABLE feedback DROP COLUMN ip_address;
DROP TABLE ip_to_user_migration;
```

#### 6.2 Update Documentation
- User authentication guide
- API documentation updates
- Privacy policy updates
- Security best practices

### Risk Mitigation

#### Rollback Plan
1. Keep IP-based code in feature flag
2. Maintain database backups
3. Test rollback procedure
4. Monitor error rates

#### Data Safety
1. Never delete IP data until verified
2. Run migration in transactions
3. Validate data integrity
4. Keep audit logs

### Timeline Summary
- **Week 1**: Foundation & Database
- **Week 2**: Auth Service & Migration Prep
- **Week 3**: Frontend & API Updates
- **Week 4**: Beta Rollout
- **Week 5**: Full Migration
- **Week 6**: Cleanup & Documentation

### Success Metrics
- Zero data loss
- < 1% error rate increase
- 100% user adoption within 30 days
- Improved security posture
- GDPR/CCPA compliance achieved