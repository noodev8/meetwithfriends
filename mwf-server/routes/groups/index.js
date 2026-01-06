/*
=======================================================================================================================================
Groups Routes Index
=======================================================================================================================================
Aggregates all group routes.
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// Import route handlers
const listGroups = require('./list_groups');
const getGroup = require('./get_group');
const createGroup = require('./create_group');

// TODO: Import these route handlers as they are created
// const getMembers = require('./get_members');
// const pendingMembers = require('./pending_members');
// const joinGroup = require('./join_group');
// const approveMember = require('./approve_member');
// const rejectMember = require('./reject_member');
// const removeMember = require('./remove_member');
// const assignRole = require('./assign_role');

// =======================================================================
// Route definitions
// =======================================================================
router.use('/', listGroups);           // GET /api/groups - list all groups
router.use('/create', createGroup);    // POST /api/groups/create - create new group
router.use('/', getGroup);             // GET /api/groups/:id - get single group (must be after list)

module.exports = router;
