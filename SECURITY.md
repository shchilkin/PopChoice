# Security Policy

## Overview

This document outlines the security measures and vulnerability management for the PopChoice application. PopChoice is a Next.js movie recommendation app that integrates with OpenAI, PostgreSQL, and TMDB APIs.

## Security Checklist

### 🚨 **Critical Security Issues**

- [x] **Input Validation & Sanitization**
  - [x] Add Zod validation schemas for all API endpoints
  - [x] Validate user input in `/api/movie-recommendation` route
  - [x] Sanitize form data before processing
  - [x] Implement input length limits (favoriteMovie: 500 chars, preferences: 200 chars)

- [x] **Rate Limiting**
  - [x] Implement a route-level rate-limit guard in `/api/movie-recommendation` using the helper in `src/lib/rateLimit.ts` (Redis-backed, per-IP)
  - [x] Set limits per IP address (10 requests per minute; enforced via atomic Lua INCR+EXPIRE)
  - [x] Add rate limiting for expensive operations (OpenAI API calls via `/api/movie-recommendation`)
  - [x] Configure appropriate 429 responses (returns `Retry-After: 60`)

- [x] **Authentication & Authorization**
  - [x] Add CSRF protection for state-changing operations (`src/middleware.ts` issues `__csrf` cookie; `withAuth` validates matching header/cookie pair)
  - [x] Add API key authentication for external callers (scrypt-derived key digests via `VALID_API_KEYS`; `Authorization: Bearer` or `X-API-Key` headers)
  - [x] Add request origin validation (same-origin check in `withAuth` using `NEXT_PUBLIC_BASE_URL`)
  - [ ] Implement session management

- [x] **Request Size & Timeout Management**
  - [x] Set maximum request body size limits (16 KB cap in `/api/movie-recommendation` and `/api/more-tmdb-picks`; rejects with 413)
  - [x] Configure API timeouts for external services (OpenAI, TMDB) (`AbortSignal.timeout()` on all OpenAI calls; TMDB fetch timeouts via `AbortSignal.timeout()`)
  - [ ] Implement retry logic with exponential backoff

### ⚠️ **Medium Priority Security Issues**

- [ ] **Data Storage Security**
  - [x] Replace localStorage with secure alternatives (migrated to BullMQ + TanStack Query in PR #367)
  - [ ] Implement httpOnly cookies for sensitive data
  - [ ] Add data encryption for stored recommendations
  - [ ] Implement secure session storage

- [x] **Error Handling & Information Disclosure**
  - [x] Remove sensitive information from error responses (catch blocks return generic messages; full error logged server-side via pino)
  - [x] Implement generic error messages for clients
  - [x] Remove console.log statements in production (structured pino logger used throughout; `console.error` replaced with `logger.error`)
  - [x] Add proper error logging without exposing internals (pino logger with `{ err }` context)

- [x] **HTTP Security Headers**
  - [x] Implement Content Security Policy (CSP) (`next.config.ts` — full CSP with `script-src`, `style-src`, `img-src`, `connect-src`, etc.)
  - [x] Add Strict-Transport-Security (HSTS) header (2-year max-age, includeSubDomains, preload)
  - [x] Configure X-Frame-Options (`DENY`)
  - [x] Set X-Content-Type-Options: nosniff
  - [x] Add Referrer-Policy header (`strict-origin-when-cross-origin`)
  - [x] Add Permissions-Policy header (camera, microphone, geolocation, payment, usb all disabled)

- [x] **API Security**
  - [x] Validate environment variables on application startup (`src/lib/env.ts` validated via Zod in `src/instrumentation.ts`; throws in production if required vars are missing)
  - [x] Implement API key rotation procedures (keys are hashed with scrypt; rotate by updating `VALID_API_KEYS` without touching code)
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

1. Input validation on API routes ✅
2. Rate limiting implementation ✅
3. Remove sensitive console logs ✅
4. Add request timeouts ✅

### Phase 2 (Short-term - Medium Issues)

1. Implement security headers ✅
2. Replace localStorage with secure storage ✅
3. Add proper error handling ✅
4. ~~CSRF protection~~ ✅ Done

### Phase 3 (Long-term - Additional Measures)

1. Comprehensive monitoring
2. Security automation
3. Regular security audits
4. Advanced threat protection

## API Endpoints Security Status

### `/api/movie-recommendation`

- [x] Input validation (Zod schema — `requestBodySchema.parse`)
- [x] Rate limiting (Redis-backed, 10 req/min per IP; requires `REDIS_URL`)
- [x] Error sanitization (generic 500 responses; full error logged server-side)
- [x] Request size limits (16 KB cap; rejects with 413)
- [x] Timeout configuration (`AbortSignal.timeout()` on all OpenAI API calls; TMDB fetches also time-bounded)

### `/api/more-tmdb-picks`

- [x] Input validation (Zod schema — `requestBodySchema.parse`)
- [x] Rate limiting (Redis-backed, 10 req/min per IP; requires `REDIS_URL`)
- [x] Error sanitization (generic 500 responses; full error logged server-side)
- [x] Request size limits (16 KB cap; rejects with 413)
- [x] Timeout configuration (`AbortSignal.timeout()` on all OpenAI and TMDB API calls)

## Environment Variables

Ensure these environment variables are properly secured:

- `OPENAI_API_KEY` - OpenAI API access (**required** in production)
- `API_KEY_HMAC_SECRET` - HMAC secret for API key derivation (**required** in production)
- `VALID_API_KEYS` - Comma-separated list of valid API keys (**required** in production)
- `DATABASE_URL` - PostgreSQL database connection string (optional — app degrades gracefully)
- `TMDB_API_KEY` - The Movie Database API key (optional — TMDB fallback skipped if absent)
- `REDIS_URL` - Redis connection string for rate limiting (optional — may contain credentials; store as a secret, never commit to source control)
- `NEXT_PUBLIC_BASE_URL` - Public base URL for same-origin validation (optional)

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

