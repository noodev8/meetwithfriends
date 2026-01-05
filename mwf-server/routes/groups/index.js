/*
=======================================================================================================================================
Groups Routes Index
=======================================================================================================================================
Aggregates all group routes.
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// TODO: Import route handlers as they are created
// const createGroup = require('./create_group');
// const getGroup = require('./get_group');
// const getMembers = require('./get_members');
// const pendingMembers = require('./pending_members');
// const joinGroup = require('./join_group');
// const approveMember = require('./approve_member');
// const rejectMember = require('./reject_member');
// const removeMember = require('./remove_member');
// const assignRole = require('./assign_role');

// Placeholder - remove when routes are implemented
router.get('/', (req, res) => {
    res.json({ return_code: 'SUCCESS', message: 'Groups API' });
});

module.exports = router;
