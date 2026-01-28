/*
=======================================================================================================================================
API Route: export_preorders
=======================================================================================================================================
Method: GET
Purpose: Generates a PDF of pre-orders for an event. Host/Organiser only.
=======================================================================================================================================
Request Payload:
None (GET request with :id URL parameter)

Success Response:
PDF file (application/pdf)

=======================================================================================================================================
Return Codes:
"UNAUTHORIZED" - User not logged in
"FORBIDDEN" - User is not a host/organiser
"NOT_FOUND" - Event not found
"PREORDERS_DISABLED" - Pre-orders not enabled for this event
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const { query } = require('../../database');
const { verifyToken } = require('../../middleware/auth');
const React = require('react');
const { renderToBuffer, Document, Page, Text, View, StyleSheet } = require('@react-pdf/renderer');

// =======================================================================
// PDF Styles
// =======================================================================
const styles = StyleSheet.create({
    page: {
        padding: 32,
        paddingBottom: 50,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#1e293b',
    },
    header: {
        marginBottom: 14,
        borderBottom: '2px solid #7c3aed',
        paddingBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#7c3aed',
        marginBottom: 3,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 5,
    },
    eventInfo: {
        fontSize: 10,
        color: '#64748b',
        marginBottom: 2,
    },
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 6,
        paddingBottom: 3,
        borderBottom: '1px solid #e2e8f0',
    },
    table: {
        width: '100%',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        paddingVertical: 5,
        paddingHorizontal: 8,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #f1f5f9',
        paddingVertical: 5,
        paddingHorizontal: 8,
    },
    tableRowAlt: {
        flexDirection: 'row',
        borderBottom: '1px solid #f1f5f9',
        paddingVertical: 5,
        paddingHorizontal: 8,
        backgroundColor: '#fafafa',
    },
    colName: {
        width: '30%',
    },
    colOrder: {
        width: '45%',
    },
    colNotes: {
        width: '25%',
    },
    headerText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
    },
    cellText: {
        fontSize: 10,
        color: '#1e293b',
    },
    cellTextLight: {
        fontSize: 9,
        color: '#64748b',
        fontStyle: 'italic',
    },
    noOrder: {
        fontSize: 9,
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 32,
        right: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTop: '1px solid #e2e8f0',
        paddingTop: 8,
    },
    footerText: {
        fontSize: 9,
        color: '#64748b',
    },
    summary: {
        marginTop: 6,
        padding: 8,
        backgroundColor: '#f8fafc',
        borderRadius: 4,
    },
    summaryText: {
        fontSize: 10,
        color: '#64748b',
    },
});

// =======================================================================
// PDF Document Component
// =======================================================================
const PreOrdersPDF = ({ event, groupName, hostName, attendees, stats }) => {
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-GB', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const now = new Date();
    const generatedDate = now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    const generatedTime = now.toLocaleTimeString('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    return React.createElement(Document, {},
        React.createElement(Page, { size: 'A4', style: styles.page },
            // Header
            React.createElement(View, { style: styles.header },
                React.createElement(Text, { style: styles.title }, 'Pre-Orders'),
                React.createElement(Text, { style: styles.subtitle }, event.title),
                React.createElement(Text, { style: styles.eventInfo }, groupName),
                hostName && React.createElement(Text, { style: styles.eventInfo }, `Host: ${hostName}`),
                React.createElement(Text, { style: styles.eventInfo },
                    `${formatDate(event.date_time)} at ${formatTime(event.date_time)}`
                ),
                event.location && React.createElement(Text, { style: styles.eventInfo }, event.location)
            ),

            // Orders Table
            React.createElement(View, { style: styles.section },
                React.createElement(Text, { style: styles.sectionTitle }, 'Orders'),
                React.createElement(View, { style: styles.table },
                    // Table Header
                    React.createElement(View, { style: styles.tableHeader },
                        React.createElement(View, { style: styles.colName },
                            React.createElement(Text, { style: styles.headerText }, 'Guest')
                        ),
                        React.createElement(View, { style: styles.colOrder },
                            React.createElement(Text, { style: styles.headerText }, 'Order')
                        ),
                        React.createElement(View, { style: styles.colNotes },
                            React.createElement(Text, { style: styles.headerText }, 'Dietary Notes')
                        )
                    ),
                    // Table Rows
                    ...attendees.map((person, index) =>
                        React.createElement(View, {
                            key: person.user_id,
                            style: index % 2 === 0 ? styles.tableRow : styles.tableRowAlt,
                            wrap: false
                        },
                            React.createElement(View, { style: styles.colName },
                                React.createElement(Text, { style: styles.cellText }, person.name),
                                person.guest_count > 0 && React.createElement(Text, { style: styles.cellTextLight },
                                    `+${person.guest_count} guest${person.guest_count > 1 ? 's' : ''}`
                                )
                            ),
                            React.createElement(View, { style: styles.colOrder },
                                person.food_order
                                    ? React.createElement(Text, { style: styles.cellText }, person.food_order)
                                    : React.createElement(Text, { style: styles.noOrder }, 'No order submitted')
                            ),
                            React.createElement(View, { style: styles.colNotes },
                                person.dietary_notes
                                    ? React.createElement(Text, { style: styles.cellText }, person.dietary_notes)
                                    : React.createElement(Text, { style: styles.noOrder }, '-')
                            )
                        )
                    )
                )
            ),

            // Summary
            React.createElement(View, { style: styles.summary },
                React.createElement(Text, { style: styles.summaryText },
                    `${stats.attendingCount} guest${stats.attendingCount !== 1 ? 's' : ''} confirmed` +
                    ` \u2022 ${stats.ordersSubmitted} order${stats.ordersSubmitted !== 1 ? 's' : ''} submitted` +
                    (stats.notOrdered > 0 ? ` \u2022 ${stats.notOrdered} not yet ordered` : '')
                )
            ),

            // Footer (fixed = repeats on every page)
            React.createElement(View, { style: styles.footer, fixed: true },
                React.createElement(Text, { style: styles.footerText },
                    `Generated ${generatedDate} at ${generatedTime}`
                ),
                React.createElement(Text, { style: styles.footerText }, 'Powered by meetwithfriends.net')
            )
        )
    );
};

// =======================================================================
// Route Handler
// =======================================================================
router.get('/:id/preorders/pdf', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // =======================================================================
        // Validate ID
        // =======================================================================
        if (!id || isNaN(parseInt(id, 10))) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        // =======================================================================
        // Get event details
        // =======================================================================
        const eventResult = await query(
            `SELECT e.*, g.name AS group_name
             FROM event_list e
             JOIN group_list g ON e.group_id = g.id
             WHERE e.id = $1`,
            [id]
        );

        if (eventResult.rows.length === 0) {
            return res.json({
                return_code: 'NOT_FOUND',
                message: 'Event not found'
            });
        }

        const event = eventResult.rows[0];
        const groupName = event.group_name;

        // =======================================================================
        // Check if pre-orders are enabled
        // =======================================================================
        if (!event.preorders_enabled) {
            return res.json({
                return_code: 'PREORDERS_DISABLED',
                message: 'Pre-orders are not enabled for this event'
            });
        }

        // =======================================================================
        // Check if user is host or organiser
        // =======================================================================
        const hostResult = await query(
            `SELECT 1 FROM event_host WHERE event_id = $1 AND user_id = $2`,
            [id, userId]
        );

        const organiserResult = await query(
            `SELECT 1 FROM group_member
             WHERE group_id = $1 AND user_id = $2 AND role = 'organiser' AND status = 'active'`,
            [event.group_id, userId]
        );

        const isHost = hostResult.rows.length > 0;
        const isOrganiser = organiserResult.rows.length > 0;

        if (!isHost && !isOrganiser) {
            return res.json({
                return_code: 'FORBIDDEN',
                message: 'Only hosts and organisers can export pre-orders'
            });
        }

        // =======================================================================
        // Get first host name
        // =======================================================================
        const firstHostResult = await query(
            `SELECT u.name
             FROM event_host eh
             JOIN app_user u ON eh.user_id = u.id
             WHERE eh.event_id = $1
             ORDER BY eh.created_at ASC
             LIMIT 1`,
            [id]
        );
        const hostName = firstHostResult.rows.length > 0 ? firstHostResult.rows[0].name : null;

        // =======================================================================
        // Get attendees with their orders
        // =======================================================================
        const attendeesResult = await query(
            `SELECT
                r.user_id,
                u.name,
                r.guest_count,
                r.food_order,
                r.dietary_notes
             FROM event_rsvp r
             JOIN app_user u ON r.user_id = u.id
             WHERE r.event_id = $1 AND r.status = 'attending'
             ORDER BY u.name ASC`,
            [id]
        );

        const attendees = attendeesResult.rows;

        // Calculate stats
        const stats = {
            attendingCount: attendees.length,
            ordersSubmitted: attendees.filter(a => a.food_order).length,
            notOrdered: attendees.filter(a => !a.food_order).length,
        };

        // =======================================================================
        // Generate PDF
        // =======================================================================
        const pdfBuffer = await renderToBuffer(
            React.createElement(PreOrdersPDF, {
                event,
                groupName,
                hostName,
                attendees,
                stats
            })
        );

        // =======================================================================
        // Send PDF response
        // =======================================================================
        const filename = `preorders-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        return res.send(pdfBuffer);

    } catch (error) {
        console.error('Export pre-orders error:', error);
        return res.json({
            return_code: 'SERVER_ERROR',
            message: 'Failed to generate PDF'
        });
    }
});

module.exports = router;
