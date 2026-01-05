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

// =======================================================================
// Mount routes
// =======================================================================
router.use('/profile', getProfile);              // GET /api/users/profile
router.use('/update_profile', updateProfile);    // POST /api/users/update_profile
router.use('/change_password', changePassword);  // POST /api/users/change_password
router.use('/delete_account', deleteAccount);    // POST /api/users/delete_account

module.exports = router;
