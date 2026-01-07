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
const joinGroup = require('./join_group');
const getMembers = require('./get_members');
const approveMember = require('./approve_member');
const rejectMember = require('./reject_member');
const removeMember = require('./remove_member');

// =======================================================================
// Route definitions
// =======================================================================
router.use('/', listGroups);           // GET /api/groups - list all groups
router.use('/create', createGroup);    // POST /api/groups/create - create new group
router.use('/join', joinGroup);        // POST /api/groups/join - join a group
router.use('/', getMembers);           // GET /api/groups/:id/members - list group members
router.use('/', approveMember);        // POST /api/groups/:id/members/approve - approve pending member
router.use('/', rejectMember);         // POST /api/groups/:id/members/reject - reject pending member
router.use('/', removeMember);         // POST /api/groups/:id/members/remove - remove member (organiser only)
router.use('/', getGroup);             // GET /api/groups/:id - get single group (must be last)

module.exports = router;
