/*
=======================================================================================================================================
Venue Routes Index
=======================================================================================================================================
Aggregates all venue-facing routes.
These routes are PUBLIC (no auth required) - access is controlled via magic link tokens.
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();

// Import route handlers
const getVenueDashboard = require('./get_venue_dashboard');
const updateVenueNotes = require('./update_venue_notes');

// =======================================================================
// Route definitions
// =======================================================================
router.use('/', updateVenueNotes);    // PUT /api/venue/:token/notes - update venue notes
router.use('/', getVenueDashboard);   // GET /api/venue/:token - get venue dashboard (must be last)

module.exports = router;
