/*
=======================================================================================================================================
Events Routes Index
=======================================================================================================================================
Aggregates all event routes.
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// TODO: Import route handlers as they are created
// const createEvent = require('./create_event');
// const getEvent = require('./get_event');
// const updateEvent = require('./update_event');
// const cancelEvent = require('./cancel_event');
// const rsvp = require('./rsvp');
// const cancelRsvp = require('./cancel_rsvp');
// const removeRsvp = require('./remove_rsvp');

// Placeholder - remove when routes are implemented
router.get('/', (req, res) => {
    res.json({ return_code: 'SUCCESS', message: 'Events API' });
});

module.exports = router;
