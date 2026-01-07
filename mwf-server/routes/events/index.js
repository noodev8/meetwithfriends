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
const updateEvent = require('./update_event');
const cancelEvent = require('./cancel_event');
const restoreEvent = require('./restore_event');
const rsvp = require('./rsvp');
const getAttendees = require('./get_attendees');
const manageAttendee = require('./manage_attendee');

// =======================================================================
// Route definitions
// =======================================================================
router.use('/', listEvents);      // GET /api/events - list all upcoming events (with optional ?group_id=)
router.use('/', createEvent);     // POST /api/events/create - create new event
router.use('/', updateEvent);     // POST /api/events/:id/update - update event (organiser/creator only)
router.use('/', cancelEvent);     // POST /api/events/:id/cancel - cancel event (organiser/creator only)
router.use('/', restoreEvent);    // POST /api/events/:id/restore - restore cancelled event (organiser/creator only)
router.use('/', rsvp);            // POST /api/events/:id/rsvp - join or leave event
router.use('/', getAttendees);    // GET /api/events/:id/attendees - list attendees
router.use('/', manageAttendee);  // POST /api/events/:id/manage-attendee - organiser/host manage attendees
router.use('/', getEvent);        // GET /api/events/:id - get single event (must be last)

module.exports = router;
