/*
=======================================================================================================================================
Request Logger Middleware
=======================================================================================================================================
Monitors request frequency per IP without blocking. Logs when IPs hit notable thresholds (50, 100, 200 req/min).
Use this data to inform rate limit settings later.

To check logs after launch:
    grep "RATE-WATCH" /path/to/your/logs

See: docs/SECURITY-HARDENING.md
=======================================================================================================================================
*/

const requestCounts = new Map();

const requestLogger = (req, res, next) => {
    const ip = req.ip;
    const minute = Math.floor(Date.now() / 60000);
    const key = `${ip}:${minute}`;

    const count = (requestCounts.get(key) || 0) + 1;
    requestCounts.set(key, count);

    // Log when someone hits notable thresholds
    if (count === 50 || count === 100 || count === 200) {
        console.log(`[RATE-WATCH] ${ip} hit ${count} req/min at ${new Date().toISOString()}`);
    }

    // Cleanup old entries periodically (roughly every 1000 requests)
    if (Math.random() < 0.001) {
        const cutoff = minute - 5;
        for (const k of requestCounts.keys()) {
            if (parseInt(k.split(':')[1]) < cutoff) requestCounts.delete(k);
        }
    }

    next();
};

module.exports = { requestLogger };
