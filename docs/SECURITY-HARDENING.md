# Security Hardening Roadmap

This document tracks security improvements for the MWF server. Items are prioritized by risk level and likelihood of breaking existing functionality.

---

## Current State (Feb 2025)

### What's Already In Place
- [x] Database connection pooling (pg-pool, max 20 connections)
- [x] JWT authentication with expiry
- [x] Per-route rate limiting on contact forms (3/hour)
- [x] Email queue throttling (1/second)
- [x] CORS configured for frontend origin only
- [x] Passwords hashed (assumed bcrypt)

### What's Missing
- [ ] Global API rate limiting
- [ ] Auth endpoint rate limiting (login, register, forgot-password)
- [ ] Security headers (helmet)
- [ ] Explicit request body size limits
- [ ] Rate limit map cleanup (memory leak potential)

---

## Pre-Launch: Traffic Monitoring (No Blocking)

Before setting rate limits, monitor real traffic to inform your decisions. This middleware logs when IPs hit notable request thresholds but **never blocks anyone**.

### Request Logger Middleware

**Risk:** None - logging only
**Effort:** 5 minutes
**Purpose:** Gather data to set informed rate limits later

```javascript
// middleware/requestLogger.js
const requestCounts = new Map();

const requestLogger = (req, res, next) => {
    const ip = req.ip;
    const minute = Math.floor(Date.now() / 60000);
    const key = `${ip}:${minute}`;

    const count = (requestCounts.get(key) || 0) + 1;
    requestCounts.set(key, count);

    // Log when someone hits notable thresholds
    if (count === 50 || count === 100 || count === 200) {
        console.log(`[RATE-WATCH] ${ip} hit ${count} req/min`);
    }

    // Cleanup old entries periodically
    if (Math.random() < 0.001) {
        const cutoff = minute - 5;
        for (const k of requestCounts.keys()) {
            if (parseInt(k.split(':')[1]) < cutoff) requestCounts.delete(k);
        }
    }

    next();
};

module.exports = { requestLogger };
```

```javascript
// server.js - add near top, after express() initialization
const { requestLogger } = require('./middleware/requestLogger');
app.use(requestLogger);
```

**After launch, check logs:**
```bash
grep "RATE-WATCH" /path/to/your/logs
```

- No hits = users are well-behaved, 100 req/min is safe
- Hits at 50 but not 100 = 100 req/min is a good limit
- Hits at 200+ = investigate (could be abuse or a frontend bug)

---

## Priority 1: Safe to Implement Now

These have **very low risk** of breaking anything and provide immediate protection.

### 1.1 Security Headers (helmet)

**Risk:** None - only adds HTTP headers
**Effort:** 5 minutes
**Protection:** XSS, clickjacking, MIME sniffing attacks

```bash
cd mwf-server && npm install helmet
```

```javascript
// server.js - add after express() initialization
const helmet = require('helmet');
app.use(helmet());
```

---

### 1.2 Explicit Body Size Limit

**Risk:** None - Express defaults to 100kb anyway
**Effort:** 1 minute
**Protection:** Large payload attacks

```javascript
// server.js - update existing line
app.use(express.json({ limit: '10kb' }));
```

---

## Priority 2: Implement Before Public Launch

These require slightly more care but are important before wider rollout.

### 2.1 Global API Rate Limiting

**Risk:** Low - might block legitimate users if limits too strict
**Effort:** 15 minutes
**Protection:** DDoS, resource exhaustion, API abuse

```bash
cd mwf-server && npm install express-rate-limit
```

```javascript
// server.js - add after helmet
const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute window
    max: 100,                  // 100 requests per minute per IP
    message: {
        return_code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(globalLimiter);
```

**Recommended limits:**
- Start generous: 100-200 req/min per IP
- Monitor logs for legitimate usage patterns
- Tighten gradually if needed

---

### 2.2 Auth Endpoint Rate Limiting

**Risk:** Low - only affects repeated login failures
**Effort:** 10 minutes
**Protection:** Brute force password attacks, credential stuffing

```javascript
// Create: middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 10,                    // 10 attempts per window
    message: {
        return_code: 'RATE_LIMITED',
        message: 'Too many attempts, please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Only count failed attempts (optional, more complex)
    // skipSuccessfulRequests: true,
});

module.exports = { authLimiter };
```

```javascript
// routes/auth/index.js - apply to sensitive routes
const { authLimiter } = require('../../middleware/rateLimiter');

router.use('/login', authLimiter);
router.use('/register', authLimiter);
router.use('/forgot-password', authLimiter);
```

---

## Priority 3: Monitor and Address Later

These are lower priority but worth tracking.

### 3.1 Rate Limit Map Memory Cleanup

**Risk:** Very low - only matters at scale
**Current impact:** Minimal with small user base
**When to address:** If server memory grows unexpectedly

The in-memory rate limit maps in `contact_host.js`, `contact_organiser.js`, and `contact_support.js` filter old entries on access but never delete keys entirely. At scale, this could cause memory growth.

**Future fix:** Add periodic cleanup or switch to Redis-based rate limiting.

---

### 3.2 Database Connection Monitoring

**Risk:** None
**When to address:** When you need visibility into DB performance

Consider adding connection pool event logging:

```javascript
// database.js - optional monitoring
pool.on('connect', () => console.log('DB pool: new connection'));
pool.on('remove', () => console.log('DB pool: connection removed'));
```

---

## Implementation Checklist

Use this to track progress:

| Item | Priority | Status | Date |
|------|----------|--------|------|
| Request logger (monitoring) | Pre-launch | Done | Feb 2025 |
| Security headers (helmet) | P1 | Done | Feb 2025 |
| Body size limit | P1 | Done | Feb 2025 |
| Auth rate limiting | P2 | Done | Feb 2025 |
| Global rate limiting | P2 | Pending | |
| Rate limit map cleanup | P3 | Pending | |
| DB connection monitoring | P3 | Pending | |

---

## Notes

- Always test changes locally before deploying
- Monitor server logs after deploying rate limiting
- If legitimate users get blocked, increase limits
- Consider Redis for rate limiting if you scale to multiple server instances
