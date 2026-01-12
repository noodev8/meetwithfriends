/*
=======================================================================================================================================
Meet With Friends - API Server
=======================================================================================================================================
Main entry point for the Express server.
Configures middleware, routes, and starts the server.
=======================================================================================================================================
*/

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config/config');

const app = express();

// =======================================================================================================================================
// Middleware
// =======================================================================================================================================

// Parse JSON request bodies
app.use(express.json());

// Enable CORS for frontend
app.use(cors({
    origin: config.corsOrigin,
    credentials: true
}));

// =======================================================================================================================================
// Routes
// =======================================================================================================================================

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// User routes
app.use('/api/users', require('./routes/users'));

// Group routes
app.use('/api/groups', require('./routes/groups'));

// Event routes
app.use('/api/events', require('./routes/events'));

// Comment routes
app.use('/api/comments', require('./routes/comments'));

// Support routes
app.use('/api/support', require('./routes/support'));

// =======================================================================================================================================
// Health check
// =======================================================================================================================================
app.get('/api/health', (req, res) => {
    res.json({ return_code: 'SUCCESS', message: 'API is running' });
});

// =======================================================================================================================================
// Start server
// =======================================================================================================================================
const PORT = config.port;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`MWF Server running on http://0.0.0.0:${PORT}`);
});
