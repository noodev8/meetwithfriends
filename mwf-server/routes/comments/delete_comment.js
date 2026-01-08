/*
=======================================================================================================================================
API Route: delete_comment
=======================================================================================================================================
Method: POST
Purpose: Deletes a comment. User must be either the comment owner, or a host/organiser of the group.
=======================================================================================================================================
Request Payload:
{
  "comment_id": 1    // integer, required - ID of the comment to delete
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Comment deleted"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"COMMENT_NOT_FOUND"
"FORBIDDEN"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { comment_id } = req.body;

        // =======================================================================
        // Validate required fields
        // =======================================================================
        if (!comment_id) {
            return res.json({
                return_code: 'MISSING_FIELDS',
                message: 'Comment ID is required'
            });
        }

        // =======================================================================
        // Fetch comment with event and group info in a single query
        // =======================================================================
        const commentResult = await query(
            `SELECT
                c.id,
                c.user_id AS comment_owner_id,
                c.event_id,
                e.group_id
             FROM event_comment c
             JOIN event_list e ON c.event_id = e.id
             WHERE c.id = $1`,
            [comment_id]
        );

        if (commentResult.rows.length === 0) {
            return res.json({
                return_code: 'COMMENT_NOT_FOUND',
                message: 'Comment not found'
            });
        }

        const comment = commentResult.rows[0];
        const isCommentOwner = comment.comment_owner_id === userId;

        // =======================================================================
        // If not comment owner, check if user is host/organiser
        // =======================================================================
        let canDelete = isCommentOwner;

        if (!canDelete) {
            const membershipResult = await query(
                `SELECT role FROM group_member
                 WHERE group_id = $1 AND user_id = $2 AND status = 'active'`,
                [comment.group_id, userId]
            );

            if (membershipResult.rows.length > 0) {
                const role = membershipResult.rows[0].role;
                canDelete = role === 'organiser' || role === 'host';
            }
        }

        // =======================================================================
        // Check permission
        // =======================================================================
        if (!canDelete) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'You do not have permission to delete this comment'
            });
        }

        // =======================================================================
        // Delete the comment
        // =======================================================================
        await query(
            `DELETE FROM event_comment WHERE id = $1`,
            [comment_id]
        );

        // =======================================================================
        // Return success
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            message: 'Comment deleted'
        });

    } catch (error) {
        console.error('Delete comment error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
