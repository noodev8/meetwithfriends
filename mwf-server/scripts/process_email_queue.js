/*
=======================================================================================================================================
Script: process_email_queue.js
=======================================================================================================================================
Purpose: Process pending emails from the queue at rate-limited pace (1/second)
         Also cleans up old non-sent emails (older than 14 days)
Usage: node scripts/process_email_queue.js [limit]
Example: node scripts/process_email_queue.js 50
=======================================================================================================================================
*/

require('dotenv').config();
const { processEmailQueue, getQueueStats } = require('../services/email');
const { query } = require('../database');

async function cleanupOldEmails() {
    // Delete emails older than 14 days that are NOT 'sent'
    // Keep 'sent' emails for audit trail
    const result = await query(`
        DELETE FROM email_queue
        WHERE created_at < NOW() - INTERVAL '14 days'
        AND status != 'sent'
        RETURNING id
    `);
    return result.rows.length;
}

async function main() {
    const limit = parseInt(process.argv[2], 10) || 50;

    console.log('='.repeat(60));
    console.log('Email Queue Processor');
    console.log('='.repeat(60));

    // Cleanup old emails first
    console.log('\nCleaning up old emails (>14 days, non-sent)...');
    const cleaned = await cleanupOldEmails();
    if (cleaned > 0) {
        console.log(`  Deleted ${cleaned} old email${cleaned !== 1 ? 's' : ''}`);
    } else {
        console.log('  Nothing to clean up');
    }

    // Show current stats
    console.log('\nChecking queue stats...');
    const statsResult = await getQueueStats();
    if (statsResult.success) {
        console.log('Current queue status (last 7 days):');
        console.log(`  Pending:   ${statsResult.stats.pending}`);
        console.log(`  Sent:      ${statsResult.stats.sent}`);
        console.log(`  Failed:    ${statsResult.stats.failed}`);
        console.log(`  Cancelled: ${statsResult.stats.cancelled}`);
        console.log(`  Skipped:   ${statsResult.stats.skipped}`);
    }

    if (statsResult.stats?.pending === 0) {
        console.log('\nNo pending emails to process.');
        process.exit(0);
    }

    // Process the queue
    console.log(`\nProcessing up to ${limit} emails at 1/second...`);
    console.log('(This may take a while)\n');

    const result = await processEmailQueue(limit);

    console.log('='.repeat(60));
    console.log('Results:');
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Sent:      ${result.sent}`);
    console.log(`  Failed:    ${result.failed}`);
    console.log(`  Skipped:   ${result.skipped}`);
    console.log('='.repeat(60));

    if (!result.success) {
        console.error('Error:', result.error);
        process.exit(1);
    }

    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
