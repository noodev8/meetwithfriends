/*
=======================================================================================================================================
API Route: update_group
=======================================================================================================================================
Method: POST
Purpose: Updates a group's settings. Only the group organiser can update the group.
=======================================================================================================================================
Request Payload:
{
  "name": "New Group Name",              // string, optional (max 100 chars)
  "description": "Updated description",  // string, optional (null to clear)
  "image_url": "https://...",            // string, optional (null to clear, max 500 chars)
  "image_position": "top",               // string, optional ("top", "center", "bottom")
  "join_policy": "auto",                 // string, optional ("auto" or "approval")
  "visibility": "listed"                 // string, optional ("listed" or "unlisted")
}

Success Response:
{
  "return_code": "SUCCESS",
  "group": {
    "id": 1,
    "name": "New Group Name",
    "description": "Updated description",
    "image_url": "https://...",
    "image_position": "top",
    "join_policy": "auto",
    "visibility": "listed",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-07T10:30:00.000Z"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"NOT_FOUND"
"FORBIDDEN"
"INVALID_NAME"
"DUPLICATE_NAME"
"INVALID_JOIN_POLICY"
"INVALID_VISIBILITY"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');

router.post('/:id/update', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image_url, image_position, join_policy, visibility } = req.body;
        const userId = req.user.id;

        // =======================================================================
        // Validate group ID is a number
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        // =======================================================================
        // Check if group exists
        // =======================================================================
        const groupResult = await query(
            'SELECT id, name, description, image_url, image_position, join_policy, visibility FROM group_list WHERE id = $1',
            [id]
        );

        if (groupResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Group not found'
            });
        }

        const currentGroup = groupResult.rows[0];

        // =======================================================================
        // Check if current user is the organiser of this group
        // =======================================================================
        const organiserCheck = await query(
            `SELECT id FROM group_member
             WHERE group_id = $1 AND user_id = $2 AND role = 'organiser' AND status = 'active'`,
            [id, userId]
        );

        if (organiserCheck.rows.length === 0) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only the group organiser can update group settings'
            });
        }

        // =======================================================================
        // Validate name if provided
        // =======================================================================
        const finalName = name !== undefined ? name : currentGroup.name;

        if (finalName && finalName.trim() === '') {
            return res.json({
                return_code: 'INVALID_NAME',
                message: 'Group name cannot be empty'
            });
        }

        if (finalName && finalName.length > 100) {
            return res.json({
                return_code: 'INVALID_NAME',
                message: 'Group name must be 100 characters or less'
            });
        }

        // =======================================================================
        // Check for duplicate group name (excluding current group)
        // =======================================================================
        if (name !== undefined && name.trim().toLowerCase() !== currentGroup.name.toLowerCase()) {
            const duplicateCheck = await query(
                'SELECT id FROM group_list WHERE LOWER(name) = LOWER($1) AND id != $2',
                [name.trim(), id]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.json({
                    return_code: 'DUPLICATE_NAME',
                    message: 'A group with this name already exists'
                });
            }
        }

        // =======================================================================
        // Validate join_policy if provided
        // =======================================================================
        const validPolicies = ['auto', 'approval'];
        const finalJoinPolicy = join_policy !== undefined ? join_policy : currentGroup.join_policy;

        if (!validPolicies.includes(finalJoinPolicy)) {
            return res.json({
                return_code: 'INVALID_JOIN_POLICY',
                message: 'Join policy must be either "auto" or "approval"'
            });
        }

        // =======================================================================
        // Validate visibility if provided
        // =======================================================================
        const validVisibilities = ['listed', 'unlisted'];
        const finalVisibility = visibility !== undefined ? visibility : currentGroup.visibility;

        if (!validVisibilities.includes(finalVisibility)) {
            return res.json({
                return_code: 'INVALID_VISIBILITY',
                message: 'Visibility must be either "listed" or "unlisted"'
            });
        }

        // =======================================================================
        // Determine final values (use provided value or keep current)
        // =======================================================================
        const finalDescription = description !== undefined ? description : currentGroup.description;
        const finalImageUrl = image_url !== undefined ? image_url : currentGroup.image_url;
        const finalImagePosition = image_position !== undefined ? image_position : currentGroup.image_position;

        // =======================================================================
        // Update the group
        // =======================================================================
        const updateResult = await query(
            `UPDATE group_list
             SET name = $1, description = $2, image_url = $3, image_position = $4, join_policy = $5, visibility = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7
             RETURNING id, name, description, image_url, image_position, join_policy, visibility, created_at, updated_at`,
            [finalName.trim(), finalDescription, finalImageUrl, finalImagePosition, finalJoinPolicy, finalVisibility, id]
        );

        const updatedGroup = updateResult.rows[0];

        // =======================================================================
        // Return success response
        // =======================================================================
        return res.json({
            return_code: 'SUCCESS',
            group: updatedGroup
        });

    } catch (error) {
        console.error('Update group error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        });
    }
});

module.exports = router;
