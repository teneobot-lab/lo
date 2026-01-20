
app.post('/api/reject_logs', async (req, res) => {
    const log = req.body;
    try {
        // Ensure timestamp is a valid Date object for MySQL driver
        const timestamp = new Date(log.timestamp);
        
        await query(
            `INSERT INTO reject_logs (id, date, notes, timestamp, items_json) VALUES (?,?,?,?,?)`,
            [log.id, log.date, log.notes, timestamp, JSON.stringify(log.items)]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Error saving reject log:", err);
        res.status(500).json({ error: err.message });
    }
});
