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
const rsvp = require('./rsvp');
const updateRsvp = require('./update_rsvp');
const getAttendees = require('./get_attendees');
const manageAttendee = require('./manage_attendee');
const getHosts = require('./get_hosts');
const addHost = require('./add_host');
const removeHost = require('./remove_host');
const submitOrder = require('./submit_order');
const updateOrder = require('./update_order');
const contactHost = require('./contact_host');
const exportPreorders = require('./export_preorders');
const calendar = require('./calendar');
const venueAccess = require('./venue_access');
const magicLink = require('./magic_link');

// =======================================================================
// Route definitions
// =======================================================================
router.use('/', listEvents);      // GET /api/events - list all upcoming events (with optional ?group_id=)
router.use('/', createEvent);     // POST /api/events/create - create new event
router.use('/', updateEvent);     // POST /api/events/:id/update - update event (organiser/creator only)
router.use('/', cancelEvent);     // POST /api/events/:id/cancel - delete event (organiser/creator only)
router.use('/', rsvp);            // POST /api/events/:id/rsvp - join or leave event
router.use('/', updateRsvp);      // POST /api/events/:id/rsvp/update - update guest count
router.use('/', getAttendees);    // GET /api/events/:id/attendees - list attendees
router.use('/', manageAttendee);  // POST /api/events/:id/manage-attendee - organiser/host manage attendees
router.use('/', getHosts);        // GET /api/events/:id/hosts - list hosts
router.use('/', addHost);         // POST /api/events/:id/hosts/add - add a host
router.use('/', removeHost);      // POST /api/events/:id/hosts/remove - remove a host or step down
router.use('/', submitOrder);     // POST /api/events/:id/submit-order - submit food order
router.use('/', updateOrder);     // POST /api/events/:id/update-order - host updates another's order
router.use('/', contactHost);     // POST /api/events/:id/contact-host - contact event host(s)
router.use('/', exportPreorders); // GET /api/events/:id/preorders/pdf - export pre-orders as PDF
router.use('/', calendar);        // GET /api/events/:id/calendar.ics - download calendar file
router.use('/', venueAccess);     // GET/POST/DELETE /api/events/:id/venue-access - manage venue access
router.use('/', magicLink);       // POST /api/events/:id/magic-link/* - manage magic invite links (organiser/host)
router.use('/', getEvent);        // GET /api/events/:id - get single event (must be last)

module.exports = router;
