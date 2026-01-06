/*
=======================================================================================================================================
Events Routes Index
=======================================================================================================================================
Aggregates all event routes.
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// Import route handlers
const listEvents = require('./list_events');
const getEvent = require('./get_event');

// TODO: Import these route handlers as they are created
// const createEvent = require('./create_event');
// const updateEvent = require('./update_event');
// const cancelEvent = require('./cancel_event');
// const rsvp = require('./rsvp');
// const cancelRsvp = require('./cancel_rsvp');
// const removeRsvp = require('./remove_rsvp');

// =======================================================================
// Route definitions
// =======================================================================
router.use('/', listEvents);    // GET /api/events - list all upcoming events
router.use('/', getEvent);      // GET /api/events/:id - get single event (must be after list)

module.exports = router;
