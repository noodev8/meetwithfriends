/*
=======================================================================================================================================
Database Connection Pool
=======================================================================================================================================
Central PostgreSQL connection pool.
All database queries should use the query function exported from this module.
=======================================================================================================================================
*/

const { Pool } = require('pg');
const config = require('./config/config');

// Create connection pool
const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    max: 20,                        // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,       // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000   // Return an error after 2 seconds if connection could not be established
});

// Log connection errors
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});

// Export query function for use throughout the application
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
