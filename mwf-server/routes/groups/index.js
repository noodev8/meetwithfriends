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
const discoverGroups = require('./discover_groups');
const getGroup = require('./get_group');
const createGroup = require('./create_group');
const updateGroup = require('./update_group');
const joinGroup = require('./join_group');
const getMembers = require('./get_members');
const approveMember = require('./approve_member');
const rejectMember = require('./reject_member');
const removeMember = require('./remove_member');
const assignRole = require('./assign_role');
const leaveGroup = require('./leave_group');
const contactOrganiser = require('./contact_organiser');

// =======================================================================
// Route definitions
// =======================================================================
router.use('/', listGroups);           // GET /api/groups - list all groups
router.use('/discover', discoverGroups); // GET /api/groups/discover - listed groups user is not in
router.use('/create', createGroup);    // POST /api/groups/create - create new group
router.use('/join', joinGroup);        // POST /api/groups/join - join a group
router.use('/', updateGroup);          // POST /api/groups/:id/update - update group (organiser only)
router.use('/', getMembers);           // GET /api/groups/:id/members - list group members
router.use('/', approveMember);        // POST /api/groups/:id/members/approve - approve pending member
router.use('/', rejectMember);         // POST /api/groups/:id/members/reject - reject pending member
router.use('/', removeMember);         // POST /api/groups/:id/members/remove - remove member (organiser only)
router.use('/', assignRole);           // POST /api/groups/:id/members/role - assign role (organiser only)
router.use('/', leaveGroup);           // POST /api/groups/:id/leave - leave a group (members only)
router.use('/', contactOrganiser);     // POST /api/groups/:id/contact-organiser - contact group organiser
router.use('/', getGroup);             // GET /api/groups/:id - get single group (must be last)

module.exports = router;
