/*
=======================================================================================================================================
Comments Routes Index
=======================================================================================================================================
Aggregates all comment routes.

Routes:
- GET  /:event_id     - Get all comments for an event (public)
- POST /add           - Add a comment to an event (members only)
- POST /delete        - Delete a comment (owner or host/organiser)
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// Import route handlers
const getComments = require('./get_comments');
const addComment = require('./add_comment');
const deleteComment = require('./delete_comment');

// Mount routes
router.use('/', getComments);           // GET /:event_id
router.use('/add', addComment);         // POST /add
router.use('/delete', deleteComment);   // POST /delete

module.exports = router;
