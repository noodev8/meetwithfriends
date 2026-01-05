/*
=======================================================================================================================================
Authentication Middleware
=======================================================================================================================================
JWT verification middleware for protected routes.
- verifyToken: Requires valid JWT, returns 200 with UNAUTHORIZED if invalid
- optionalAuth: Attaches user if valid JWT present, continues without user if not
=======================================================================================================================================
*/

const jwt = require('jsonwebtoken');
const config = require('../config/config');

/*
=======================================================================================================================================
verifyToken
=======================================================================================================================================
Middleware that requires a valid JWT token.
If token is missing or invalid, returns UNAUTHORIZED.
If valid, attaches user_id to req.user and continues.
=======================================================================================================================================
*/
const verifyToken = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.json({
                return_code: 'UNAUTHORIZED',
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);

        // Attach user_id to request (only user_id is stored in token per API-Rules)
        req.user = {
            id: decoded.user_id
        };

        next();
    } catch (_error) {
        // Token is invalid or expired
        return res.json({
            return_code: 'UNAUTHORIZED',
            message: 'Invalid or expired token'
        });
    }
};

/*
=======================================================================================================================================
optionalAuth
=======================================================================================================================================
Middleware that optionally attaches user if valid JWT is present.
If no token or invalid token, continues without user (req.user will be undefined).
Useful for routes that behave differently for logged-in vs anonymous users.
=======================================================================================================================================
*/
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token - continue without user
            return next();
        }

        const token = authHeader.split(' ')[1];

        // Try to verify token
        const decoded = jwt.verify(token, config.jwtSecret);

        // Attach user_id to request
        req.user = {
            id: decoded.user_id
        };

        next();
    } catch (_error) {
        // Invalid token - continue without user (don't fail)
        next();
    }
};

module.exports = {
    verifyToken,
    optionalAuth
};
