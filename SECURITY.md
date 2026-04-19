# Security Policy

## Overview

This document outlines the security measures and vulnerability management for the PopChoice application. PopChoice is a Next.js movie recommendation app that integrates with OpenAI, PostgreSQL, and TMDB APIs.

## Security Checklist

### 🚨 **Critical Security Issues**

- [ ] **Input Validation & Sanitization**
  - [x] Add Zod validation schemas for all API endpoints
  - [x] Validate user input in `/api/movie-recommendation` route
  - [ ] Sanitize form data before processing
  - [ ] Implement input length limits (favoriteMovie: 500 chars, preferences: 200 chars)

- [x] **Rate Limiting**
  - [x] Implement a route-level rate-limit guard in `/api/movie-recommendation` using the helper in `src/lib/rateLimit.ts` (Redis-backed, per-IP)
  - [x] Set limits per IP address (10 requests per minute; enforced via atomic Lua INCR+EXPIRE)
  - [x] Add rate limiting for expensive operations (OpenAI API calls via `/api/movie-recommendation`)
  - [x] Configure appropriate 429 responses (returns `Retry-After: 60`)

- [ ] **Authentication & Authorization**
  - [ ] Add CSRF protection for state-changing operations
  - [ ] Implement session management
  - [ ] Add request origin validation

- [ ] **Request Size & Timeout Management**
  - [ ] Set maximum request body size limits
  - [ ] Configure API timeouts for external services (OpenAI, TMDB)
  - [ ] Implement retry logic with exponential backoff

### ⚠️ **Medium Priority Security Issues**

- [x] **Data Storage Security**
  - [x] Replace localStorage with secure alternatives
  - [ ] Implement httpOnly cookies for sensitive data
  - [ ] Add data encryption for stored recommendations
  - [ ] Implement secure session storage

- [ ] **Error Handling & Information Disclosure**
  - [ ] Remove sensitive information from error responses
  - [ ] Implement generic error messages for clients
  - [x] Remove console.log statements in production
  - [x] Add proper error logging without exposing internals

- [ ] **HTTP Security Headers**
  - [ ] Implement Content Security Policy (CSP)
  - [ ] Add Strict-Transport-Security (HSTS) header
  - [ ] Configure X-Frame-Options
  - [ ] Set X-Content-Type-Options: nosniff
  - [ ] Add Referrer-Policy header

- [ ] **API Security**
  - [ ] Validate environment variables on application startup
  - [ ] Implement API key rotation procedures
  - [ ] Add monitoring for unusual API usage patterns
  - [ ] Implement circuit breaker pattern for external APIs

### 🛡️ **Additional Security Measures**

- [ ] **Code Security**
  - [ ] Regular dependency vulnerability scanning
  - [ ] Implement static code analysis
  - [ ] Add security linting rules
  - [ ] Regular security code reviews

- [ ] **Infrastructure Security**
  - [ ] Secure environment variable management
  - [ ] Implement proper secrets management
  - [ ] Add monitoring and alerting for security events
  - [ ] Regular security audits

- [ ] **Database Security**
  - [ ] Implement proper PostgreSQL row-level security policies if needed
  - [ ] Regular database security reviews
  - [ ] Implement data encryption at rest
  - [ ] Add database query monitoring

## Implementation Priority

### Phase 1 (Immediate - Critical Issues)

1. ~~Input validation on API routes~~ (Completed)
2. ~~Rate limiting implementation~~ (Completed)
3. ~~Remove sensitive console logs~~ (Completed)
4. Add request timeouts

### Phase 2 (Short-term - Medium Issues)

1. Implement security headers
2. Add proper error handling
3. CSRF protection

### Phase 3 (Long-term - Additional Measures)

1. Comprehensive monitoring
2. Security automation
3. Regular security audits
4. Advanced threat protection

## API Endpoints Security Status

### `/api/movie-recommendation`

- [x] Input validation
- [x] Rate limiting (Redis-backed, 10 req/min per IP; requires `REDIS_URL`)
- [ ] Error sanitization
- [ ] Request size limits
- [ ] Timeout configuration

## Environment Variables

Ensure these environment variables are properly secured:

- `OPENAI_API_KEY` - OpenAI API access
- `DATABASE_URL` - PostgreSQL database connection string
- `TMDB_API_KEY` - The Movie Database API key
- `REDIS_URL` - Redis connection string for rate limiting (optional; may contain credentials — store as a secret, never commit to source control)

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please:

1. **Do not** open a public issue
2. Email security concerns to [your-security-email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

## Security Updates

- Review this checklist monthly
- Update security measures as new threats emerge
- Monitor dependencies for security vulnerabilities
- Regular security testing and audits

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Guidelines](https://nextjs.org/docs/advanced-features/security-headers)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---
