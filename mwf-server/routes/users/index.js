/*
=======================================================================================================================================
Users Routes Index
=======================================================================================================================================
Aggregates all user routes.
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// TODO: Import route handlers as they are created
// const getProfile = require('./get_profile');
// const updateProfile = require('./update_profile');
// const myGroups = require('./my_groups');
// const changePassword = require('./change_password');
// const deleteAccount = require('./delete_account');

// Placeholder - remove when routes are implemented
router.get('/', (req, res) => {
    res.json({ return_code: 'SUCCESS', message: 'Users API' });
});

module.exports = router;
