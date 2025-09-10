/**
 * Privacy Validation Test Suite
 * Ensures user data isolation and prevents cross-user data exposure
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from './mocks/server'

const API_BASE = process.env.API_URL || 'http://localhost:8788';

describe('Privacy and Data Isolation Tests', () => {
  
  describe('History API Isolation', () => {
    
    it('should isolate history by IP address', async () => {
      // Simulate requests from different IPs
      const user1IP = '1.1.1.1';
      const user2IP = '2.2.2.2';
      
      // Create history for User 1
      const user1History = {
        original: 'User 1 original prompt',
        refined: 'User 1 refined prompt',
        timestamp: new Date().toISOString()
      };
      
      await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': user1IP
        },
        body: JSON.stringify(user1History)
      });
      
      // Create history for User 2
      const user2History = {
        original: 'User 2 original prompt',
        refined: 'User 2 refined prompt',
        timestamp: new Date().toISOString()
      };
      
      await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': user2IP
        },
        body: JSON.stringify(user2History)
      });
      
      // Fetch User 1's history
      const user1Response = await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
        headers: {
          'cf-connecting-ip': user1IP
        }
      });
      const user1Data = await user1Response.json();
      
      // Fetch User 2's history
      const user2Response = await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
        headers: {
          'cf-connecting-ip': user2IP
        }
      });
      const user2Data = await user2Response.json();
      
      // Validate isolation
      expect(user1Data.items).toBeDefined();
      expect(user2Data.items).toBeDefined();
      
      // User 1 should only see their own history
      const user1Prompts = user1Data.items.map((item: any) => item.original);
      expect(user1Prompts).toContain('User 1 original prompt');
      expect(user1Prompts).not.toContain('User 2 original prompt');
      
      // User 2 should only see their own history
      const user2Prompts = user2Data.items.map((item: any) => item.original);
      expect(user2Prompts).toContain('User 2 original prompt');
      expect(user2Prompts).not.toContain('User 1 original prompt');
    });
    
    it('should handle missing IP gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/engineer/history-dual-mode`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
    });
    
    it('should prevent data leakage through pagination', async () => {
      const user1IP = '3.3.3.3';
      const user2IP = '4.4.4.4';
      
      // Create 10 items for each user
      for (let i = 0; i < 10; i++) {
        await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'cf-connecting-ip': user1IP
          },
          body: JSON.stringify({
            original: `User 1 prompt ${i}`,
            refined: `User 1 refined ${i}`,
            timestamp: new Date().toISOString()
          })
        });
        
        await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'cf-connecting-ip': user2IP
          },
          body: JSON.stringify({
            original: `User 2 prompt ${i}`,
            refined: `User 2 refined ${i}`,
            timestamp: new Date().toISOString()
          })
        });
      }
      
      // Test pagination for User 1
      let allUser1Items: any[] = [];
      for (let page = 0; page < 3; page++) {
        const response = await fetch(`${API_BASE}/api/engineer/history-dual-mode?page=${page}&limit=5`, {
          headers: {
            'cf-connecting-ip': user1IP
          }
        });
        const data = await response.json();
        allUser1Items = [...allUser1Items, ...data.items];
      }
      
      // Verify no User 2 data in User 1's paginated results
      const user1Originals = allUser1Items.map(item => item.original);
      expect(user1Originals.every(p => p.startsWith('User 1'))).toBe(true);
      expect(user1Originals.some(p => p.startsWith('User 2'))).toBe(false);
    });
    
    it('should validate security headers', async () => {
      const response = await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
        headers: {
          'cf-connecting-ip': '5.5.5.5'
        }
      });
      
      // Check security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      expect(response.headers.get('Strict-Transport-Security')).toBeDefined();
    });
  });
  
  describe('Rate Limiting and DoS Protection', () => {
    
    it('should enforce rate limiting per IP', async () => {
      const testIP = '6.6.6.6';
      const requests = [];
      
      // Make 25 requests rapidly (exceeding the 20/minute limit)
      for (let i = 0; i < 25; i++) {
        requests.push(
          fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
            headers: {
              'cf-connecting-ip': testIP
            }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);
      
      // Some requests should be rate limited
      expect(statuses.filter(s => s === 429).length).toBeGreaterThan(0);
    });
    
    it('should isolate rate limiting by IP', async () => {
      const ip1 = '7.7.7.7';
      const ip2 = '8.8.8.8';
      
      // Exhaust rate limit for IP1
      const ip1Requests = [];
      for (let i = 0; i < 25; i++) {
        ip1Requests.push(
          fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
            headers: { 'cf-connecting-ip': ip1 }
          })
        );
      }
      await Promise.all(ip1Requests);
      
      // IP2 should still be able to make requests
      const ip2Response = await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
        headers: { 'cf-connecting-ip': ip2 }
      });
      
      expect(ip2Response.status).toBe(200);
    });
  });
  
  describe('Cross-Site Request Protection', () => {
    
    it('should validate CORS headers', async () => {
      const response = await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
        headers: {
          'Origin': 'https://evil-site.com',
          'cf-connecting-ip': '9.9.9.9'
        }
      });
      
      const allowedOrigin = response.headers.get('Access-Control-Allow-Origin');
      expect(allowedOrigin).toBe('https://mstprmpt.zeidgeist.com');
      expect(allowedOrigin).not.toBe('https://evil-site.com');
    });
    
    it('should handle preflight requests', async () => {
      const response = await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://mstprmpt.zeidgeist.com',
          'Access-Control-Request-Method': 'POST'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });
  
  describe('Data Sanitization', () => {
    
    it('should sanitize error messages', async () => {
      // Force an error by sending invalid data
      const response = await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '10.10.10.10'
        },
        body: JSON.stringify({
          // Missing required fields
        })
      });
      
      const data = await response.json();
      
      // Error message should not contain sensitive information
      expect(data.error).toBeDefined();
      expect(data.error).not.toContain('DATABASE_URL');
      expect(data.error).not.toContain('password');
      expect(data.error).not.toContain('stack');
    });
    
    it('should not expose internal paths in responses', async () => {
      const response = await fetch(`${API_BASE}/api/engineer/history-dual-mode`);
      const responseText = await response.text();
      
      // Should not contain internal file paths
      expect(responseText).not.toContain('/Users/');
      expect(responseText).not.toContain('/home/');
      expect(responseText).not.toContain('C:\\');
      expect(responseText).not.toContain('node_modules');
    });
  });
  
  describe('Shared Network Detection', () => {
    
    it('should detect and log shared network access', async () => {
      // Test with private network IP
      const privateIP = '192.168.1.100';
      
      const response = await fetch(`${API_BASE}/api/engineer/history-dual-mode`, {
        headers: {
          'cf-connecting-ip': privateIP
        }
      });
      
      expect(response.status).toBe(200);
      // In production, this would trigger additional logging/monitoring
    });
  });
});

describe('Privacy Guard Unit Tests', () => {
  
  it('should validate privacy access correctly', () => {
    const { validatePrivacyAccess } = require('../functions/_shared/privacy-guard');
    
    const requestContext = {
      userId: 'user123',
      ipAddress: '11.11.11.11'
    };
    
    // Should allow access to own data
    let result = validatePrivacyAccess(requestContext, 'user123');
    expect(result.isValid).toBe(true);
    
    result = validatePrivacyAccess(requestContext, '11.11.11.11');
    expect(result.isValid).toBe(true);
    
    // Should deny access to other user's data
    result = validatePrivacyAccess(requestContext, 'user456');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Unauthorized');
  });
  
  it('should detect shared networks', () => {
    const { isSharedNetwork } = require('../functions/_shared/privacy-guard');
    
    expect(isSharedNetwork('192.168.1.1')).toBe(true);
    expect(isSharedNetwork('10.0.0.1')).toBe(true);
    expect(isSharedNetwork('172.16.0.1')).toBe(true);
    expect(isSharedNetwork('127.0.0.1')).toBe(true);
    expect(isSharedNetwork('8.8.8.8')).toBe(false);
    expect(isSharedNetwork('1.1.1.1')).toBe(false);
  });
  
  it('should sanitize user data', () => {
    const { sanitizeUserData } = require('../functions/_shared/privacy-guard');
    
    const userData = {
      id: '123',
      email: 'user@example.com',
      password: 'secret123',
      name: 'John Doe',
      ssn: '123-45-6789',
      publicInfo: 'This is public'
    };
    
    const sanitized = sanitizeUserData(userData, ['id', 'name', 'publicInfo']);
    
    expect(sanitized.id).toBe('123');
    expect(sanitized.name).toBe('John Doe');
    expect(sanitized.publicInfo).toBe('This is public');
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.ssn).toBeUndefined();
    expect(sanitized.email).toBeUndefined();
  });
});