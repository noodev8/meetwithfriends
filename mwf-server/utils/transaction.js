/*
=======================================================================================================================================
Transaction Utility
=======================================================================================================================================
Wrapper for executing multiple database operations in a transaction.
Automatically commits on success, rolls back on error.
=======================================================================================================================================
*/

const { pool } = require('../database');

/*
=======================================================================================================================================
withTransaction
=======================================================================================================================================
Executes a callback function within a database transaction.

Usage:
    const result = await withTransaction(async (client) => {
        await client.query('INSERT INTO ...');
        await client.query('UPDATE ...');
        return { success: true };
    });

If any query fails, the entire transaction is rolled back.
=======================================================================================================================================
*/
const withTransaction = async (callback) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await callback(client);

        await client.query('COMMIT');

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    withTransaction
};
