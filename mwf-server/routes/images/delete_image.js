/*
=======================================================================================================================================
API Route: delete_image
=======================================================================================================================================
Method: POST
Purpose: Deletes an image from Cloudinary. Extracts the public_id from the provided URL and calls Cloudinary's destroy API.
=======================================================================================================================================
Request Headers:
Authorization: Bearer <token>          // Required JWT token

Request Payload:
{
  "image_url": "https://res.cloudinary.com/dnrevr0pi/image/upload/..."  // string, required - full Cloudinary URL
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Image deleted successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_URL"
"DELETE_FAILED"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { verifyToken } = require('../../middleware/auth');

// =======================================================================
// Configure Cloudinary with credentials from environment
// =======================================================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// =======================================================================
// Helper: Extract public_id from Cloudinary URL
// URL format: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/v{version}/{folder}/{filename}.{ext}
// We need to extract: {folder}/{filename} (without extension)
// =======================================================================
function extractPublicId(url) {
    try {
        // Match the pattern after /upload/ and optional transformations
        // Example: https://res.cloudinary.com/dnrevr0pi/image/upload/w_200,h_200,c_fill/v1234567890/mwf-avatars/abc123.jpg
        const regex = /\/upload\/(?:[^/]+\/)*v\d+\/(.+)\.[a-zA-Z]+$/;
        const match = url.match(regex);

        if (match && match[1]) {
            return match[1]; // Returns "mwf-avatars/abc123"
        }

        // Fallback: try simpler pattern without version
        // Example: https://res.cloudinary.com/dnrevr0pi/image/upload/mwf-avatars/abc123.jpg
        const simpleRegex = /\/upload\/(?:[^/]+\/)*([^/]+\/[^.]+)\.[a-zA-Z]+$/;
        const simpleMatch = url.match(simpleRegex);

        if (simpleMatch && simpleMatch[1]) {
            return simpleMatch[1];
        }

        return null;
    } catch {
        return null;
    }
}

router.post('/', verifyToken, async (req, res) => {
    try {
        const { image_url } = req.body;

        // =======================================================================
        // Validate required field
        // =======================================================================
        if (!image_url) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'image_url is required'
            });
        }

        // =======================================================================
        // Validate it's a Cloudinary URL
        // =======================================================================
        if (!image_url.includes('res.cloudinary.com')) {
            return res.json({
                return_code: 'INVALID_URL',
                message: 'URL must be a valid Cloudinary URL'
            });
        }

        // =======================================================================
        // Extract public_id from URL
        // =======================================================================
        const publicId = extractPublicId(image_url);

        if (!publicId) {
            return res.json({
                return_code: 'INVALID_URL',
                message: 'Could not extract public_id from URL'
            });
        }

        // =======================================================================
        // Delete image from Cloudinary
        // =======================================================================
        const result = await cloudinary.uploader.destroy(publicId);

        // Cloudinary returns { result: 'ok' } on success
        // Returns { result: 'not found' } if image doesn't exist (still considered success)
        if (result.result === 'ok' || result.result === 'not found') {
            return res.json({
                return_code: 'SUCCESS',
                message: 'Image deleted successfully'
            });
        }

        // =======================================================================
        // Handle unexpected Cloudinary response
        // =======================================================================
        return res.json({
            return_code: 'DELETE_FAILED',
            message: 'Failed to delete image from Cloudinary'
        });

    } catch (error) {
        console.error('Delete image error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
