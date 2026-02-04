/*
=======================================================================================================================================
Rate Limiter Middleware
=======================================================================================================================================
Protects sensitive endpoints from brute force attacks.

Auth limiter: 10 attempts per 15 minutes per IP
- Applies to: login, register, forgot_password
- Protects against: credential stuffing, brute force password attacks

See: docs/SECURITY-HARDENING.md
=======================================================================================================================================
*/

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
});

module.exports = { authLimiter };
