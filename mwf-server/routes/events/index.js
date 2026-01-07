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
const createEvent = require('./create_event');
const rsvp = require('./rsvp');
const getAttendees = require('./get_attendees');
const manageAttendee = require('./manage_attendee');

// =======================================================================
// Route definitions
// =======================================================================
router.use('/', listEvents);      // GET /api/events - list all upcoming events (with optional ?group_id=)
router.use('/', createEvent);     // POST /api/events/create - create new event
router.use('/', rsvp);            // POST /api/events/:id/rsvp - join or leave event
router.use('/', getAttendees);    // GET /api/events/:id/attendees - list attendees
router.use('/', manageAttendee);  // POST /api/events/:id/manage-attendee - organiser/host manage attendees
router.use('/', getEvent);        // GET /api/events/:id - get single event (must be last)

module.exports = router;
