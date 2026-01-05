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

// Mount routes
router.use('/register', register);
router.use('/login', login);
router.use('/forgot_password', forgotPassword);
router.use('/reset_password', resetPassword);

module.exports = router;
