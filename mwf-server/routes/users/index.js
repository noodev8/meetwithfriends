/*
=======================================================================================================================================
Users Routes Index
=======================================================================================================================================
Aggregates all user routes.
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// Import route handlers
const getProfile = require('./get_profile');
const updateProfile = require('./update_profile');
const changePassword = require('./change_password');
const deleteAccount = require('./delete_account');
const myGroups = require('./my_groups');
const myEvents = require('./my_events');
const myRsvps = require('./my_rsvps');

// =======================================================================
// Mount routes
// =======================================================================
router.use('/profile', getProfile);              // GET /api/users/profile
router.use('/update_profile', updateProfile);    // POST /api/users/update_profile
router.use('/change_password', changePassword);  // POST /api/users/change_password
router.use('/delete_account', deleteAccount);    // POST /api/users/delete_account
router.use('/', myGroups);                       // GET /api/users/my-groups
router.use('/', myEvents);                       // GET /api/users/my-events
router.use('/', myRsvps);                        // GET /api/users/my-rsvps

module.exports = router;
