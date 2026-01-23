/*
=======================================================================================================================================
Configuration
=======================================================================================================================================
Central configuration loaded from environment variables.
=======================================================================================================================================
*/

module.exports = {
    // Server
    port: process.env.PORT || 3019,
    corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),

    // Database
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'meetwithfriends',
        user: process.env.DB_USER || 'meetwithfriends_user',
        password: process.env.DB_PASSWORD
    },

    // JWT
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '90d',

    // Email (Resend)
    email: {
        resendApiKey: process.env.RESEND_API_KEY,
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        fromName: process.env.EMAIL_FROM_NAME || 'Meet With Friends',
        overrideRecipient: process.env.EMAIL_OVERRIDE_RECIPIENT || null,
        commentThrottleHours: parseInt(process.env.EMAIL_COMMENT_THROTTLE_HOURS, 10) || 2
    },

    // Frontend URL (for email links)
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};
