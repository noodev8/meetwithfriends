/*
=======================================================================================================================================
Invite Routes Index
=======================================================================================================================================
Aggregates all invite-related routes for magic link invitations.
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// Import route handlers
const validate = require('./validate');
const accept = require('./accept');
const acceptWithSignup = require('./accept_with_signup');

// =======================================================================
// Route definitions
// =======================================================================
router.use('/validate', validate);         // GET /api/invite/validate/:token - validate and get invite details
router.use('/accept', accept);             // POST /api/invite/accept/:token - accept invite (logged in user)
router.use('/accept-with-signup', acceptWithSignup); // POST /api/invite/accept-with-signup/:token - signup + accept

module.exports = router;
