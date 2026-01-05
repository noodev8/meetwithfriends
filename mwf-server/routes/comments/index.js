/*
=======================================================================================================================================
Comments Routes Index
=======================================================================================================================================
Aggregates all comment routes.
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// TODO: Import route handlers as they are created
// const addComment = require('./add_comment');
// const deleteComment = require('./delete_comment');

// Placeholder - remove when routes are implemented
router.get('/', (req, res) => {
    res.json({ return_code: 'SUCCESS', message: 'Comments API' });
});

module.exports = router;
