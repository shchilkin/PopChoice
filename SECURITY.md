# Security Policy

## Overview

This document outlines the security measures and vulnerability management for the PopChoice application. PopChoice is a Next.js movie recommendation app that integrates with OpenAI, PostgreSQL, and TMDB APIs.

## Security Checklist

### 🚨 **Critical Security Issues**

- [x] **Input Validation & Sanitization**
  - [x] Add Zod validation schemas for all API endpoints (`requestBodySchema.parse(body)` in `/api/movie-recommendation` and `/api/more-tmdb-picks`)
  - [x] Validate user input in `/api/movie-recommendation` route
  - [x] Sanitize form data before processing (prompt injection detection via `checkForPromptInjection()` in `src/utils/ai/moderation.ts`; OpenAI Moderation API via `moderateInput()`; LLM-as-judge via `judgeForMoviePlatform()`)
  - [ ] Implement input length limits (favoriteMovie: 500 chars, preferences: 200 chars)

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

- [ ] **Request Size & Timeout Management**
  - [ ] Set maximum request body size limits
  - [x] Configure API timeouts for TMDB (`AbortSignal.timeout()` with 504 response in `more-tmdb-picks/route.ts`)
  - [ ] Configure API timeouts for OpenAI (no `AbortSignal` on `openai.chat.completions.create()` calls)
  - [ ] Implement retry logic with exponential backoff

### ⚠️ **Medium Priority Security Issues**

- [x] **Data Storage Security**
  - [x] Replace localStorage with secure alternatives (migrated to BullMQ + TanStack Query async flow in PR #367 — no more localStorage handoffs)
  - [ ] Implement httpOnly cookies for sensitive data
  - [ ] Add data encryption for stored recommendations
  - [ ] Implement secure session storage

- [ ] **Error Handling & Information Disclosure**
  - [ ] Remove sensitive information from error responses
  - [ ] Implement generic error messages for clients
  - [x] Remove console.log statements in production (replaced with structured pino logger via `src/lib/logger.ts` throughout the codebase)
  - [ ] Add proper error logging without exposing internals

- [x] **HTTP Security Headers**
  - [x] Implement Content Security Policy (CSP) — with `unsafe-inline` for Next.js hydration, `unsafe-eval` in dev only
  - [x] Add Strict-Transport-Security (HSTS) header — `max-age=63072000; includeSubDomains; preload` (production only)
  - [x] Configure X-Frame-Options — `DENY`
  - [x] Set X-Content-Type-Options: nosniff
  - [x] Add Referrer-Policy header — `strict-origin-when-cross-origin`
  - [x] Add Permissions-Policy — camera, microphone, geolocation, payment, usb, interest-cohort all disabled
  - All headers are applied via `securityHeaders` array in `apps/web/next.config.ts` to all routes

- [ ] **API Security**
  - [ ] Validate environment variables on application startup
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

1. ~~Input validation on API routes~~ ✅ Done (Zod schemas + AI moderation pipeline)
2. ~~Rate limiting implementation~~ ✅ Done
3. ~~Remove sensitive console logs~~ ✅ Done (pino logger)
4. Add request timeouts for OpenAI API calls
5. Add request body size limits

### Phase 2 (Short-term - Medium Issues)

1. ~~Implement security headers~~ ✅ Done
2. ~~Replace localStorage with secure storage~~ ✅ Done (PR #367)
3. Add proper error handling / generic error messages for clients
4. ~~CSRF protection~~ ✅ Done

### Phase 3 (Long-term - Additional Measures)

1. Comprehensive monitoring
2. Security automation
3. Regular security audits
4. Advanced threat protection

## API Endpoints Security Status

### `/api/movie-recommendation`

- [x] Input validation (Zod schema + prompt injection detection + OpenAI Moderation API + LLM content judge)
- [x] Rate limiting (Redis-backed, 10 req/min per IP; requires `REDIS_URL`)
- [ ] Error sanitization
- [ ] Request size limits
- [ ] Timeout configuration (OpenAI API calls have no `AbortSignal`)

### `/api/more-tmdb-picks`

- [x] Input validation (Zod schema)
- [x] Rate limiting (Redis-backed, 10 req/min per IP)
- [x] Timeout configuration (`AbortSignal.timeout()` with 504 response on TMDB fetch)
- [ ] Error sanitization
- [ ] Request size limits

### AI Moderation Pipeline (implemented security layer)

Both API endpoints pass user input through Zod validation. The `/api/movie-recommendation` endpoint additionally runs a multi-stage moderation pipeline before any LLM call:

1. **Prompt injection detection** — regex-based structural check (`checkForPromptInjection()` in `src/utils/ai/moderation.ts`) on `favoriteMovie` and `favoriteMovieWhy` fields
2. **OpenAI Moderation API** — `moderateInput()` flags harmful content categories (hate, self-harm, violence, etc.)
3. **LLM-as-judge** — `judgeForMoviePlatform()` evaluates suitability for a movie recommendation platform

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
