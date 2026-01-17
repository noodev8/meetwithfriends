const express = require('express');
const router = express.Router();

// Email queue management
router.use('/', require('./process_queue'));

module.exports = router;
