/*
=======================================================================================================================================
Auth Routes Index
=======================================================================================================================================
Aggregates all authentication routes.
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// Import route handlers
const register = require('./register');
const login = require('./login');
const forgotPassword = require('./forgot_password');
const resetPassword = require('./reset_password');

// Rate limiting for auth endpoints (see docs/SECURITY-HARDENING.md)
const { authLimiter } = require('../../middleware/rateLimiter');

// Mount routes (rate-limited where appropriate)
router.use('/register', authLimiter, register);
router.use('/login', authLimiter, login);
router.use('/forgot_password', authLimiter, forgotPassword);
router.use('/reset_password', resetPassword);

module.exports = router;
