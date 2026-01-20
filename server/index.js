
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'nexus_wms',
    dateStrings: true // Return dates as strings to preserve formatting
};

const pool = mysql.createPool(dbConfig);

// Helper function for queries
async function query(sql, params) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error(`Database Error [${sql}]:`, error);
        throw error;
    }
}

// --- ROUTES ---

// 1. ITEMS
app.get('/api/items', async (req, res) => {
    try {
        const items = await query('SELECT * FROM items');
        // Map database fields back to frontend types if needed
        const formatted = items.map(i => ({
            ...i,
            active: !!i.active,
            price: Number(i.price),
            stock: Number(i.stock),
            ratio2: i.ratio2 ? Number(i.ratio2) : undefined,
            ratio3: i.ratio3 ? Number(i.ratio3) : undefined
        }));
        res.json(formatted);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/items', async (req, res) => {
    const i = req.body;
    try {
        await query(
            `INSERT INTO items (id, sku, name, category, price, location, unit, stock, min_level, active, unit2, ratio2, op2, unit3, ratio3, op3)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=?, category=?, price=?, location=?, unit=?, stock=?, min_level=?, active=?, unit2=?, ratio2=?, op2=?, unit3=?, ratio3=?, op3=?`,
            [
                i.id, i.sku, i.name, i.category, i.price, i.location, i.unit, i.stock, i.minLevel, i.active, i.unit2, i.ratio2, i.op2, i.unit3, i.ratio3, i.op3,
                i.name, i.category, i.price, i.location, i.unit, i.stock, i.minLevel, i.active, i.unit2, i.ratio2, i.op2, i.unit3, i.ratio3, i.op3
            ]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/items/:id', async (req, res) => {
    try {
        await query('DELETE FROM items WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. TRANSACTIONS
app.get('/api/transactions', async (req, res) => {
    try {
        const txs = await query('SELECT * FROM transactions ORDER BY date DESC LIMIT 1000');
        // Fetch items for these transactions
        for (let t of txs) {
            const items = await query('SELECT * FROM transaction_items WHERE transaction_id = ?', [t.id]);
            t.items = items.map(it => ({
                itemId: it.item_id,
                sku: it.sku,
                name: it.name,
                qty: it.qty,
                uom: it.uom,
                unitPrice: Number(it.unit_price),
                total: Number(it.total)
            }));
            t.totalValue = Number(t.total_value);
            // Map keys
            t.poNumber = t.po_number;
            t.deliveryNote = t.delivery_note;
            t.userId = t.user_id;
        }
        res.json(txs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions', async (req, res) => {
    const t = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Insert Header
        await conn.execute(
            `INSERT INTO transactions (id, type, date, total_value, user_id, supplier, po_number, delivery_note, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [t.id, t.type, t.date, t.totalValue, t.userId, t.supplier, t.poNumber, t.deliveryNote, t.notes]
        );

        // 2. Insert Items & Update Stock
        for (const item of t.items) {
            await conn.execute(
                `INSERT INTO transaction_items (transaction_id, item_id, sku, name, qty, uom, unit_price, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [t.id, item.itemId, item.sku, item.name, item.qty, item.uom, item.unitPrice, item.total]
            );

            // Update Stock
            if (t.type === 'inbound') {
                await conn.execute('UPDATE items SET stock = stock + ? WHERE id = ?', [item.qty, item.itemId]);
            } else {
                await conn.execute('UPDATE items SET stock = stock - ? WHERE id = ?', [item.qty, item.itemId]);
            }
        }

        await conn.commit();
        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        conn.release();
    }
});

// 3. USERS & LOGIN
app.get('/api/users', async (req, res) => {
    try {
        const users = await query('SELECT id, username, role, name FROM users');
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        if (u.password) {
            // In real app, hash this backend side again or verify hash
            const crypto = require('crypto'); // Simple shim if hash sent from front
            // Assuming frontend sends hash or plain text. For safety we just store what is sent (Demo mode)
            await query(
                `INSERT INTO users (id, username, password_hash, role, name) VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE username=?, password_hash=?, role=?, name=?`,
                [u.id, u.username, u.password, u.role, u.name, u.username, u.password, u.role, u.name]
            );
        } else {
            await query(
                `INSERT INTO users (id, username, role, name) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE username=?, role=?, name=?`,
                [u.id, u.username, u.role, u.name, u.username, u.role, u.name]
            );
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
    const { username, hash } = req.body;
    try {
        const users = await query('SELECT * FROM users WHERE username = ? AND password_hash = ?', [username, hash]);
        if (users.length > 0) {
            const u = users[0];
            res.json({ id: u.id, username: u.username, role: u.role, name: u.name });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. REJECT MODULE

app.get('/api/reject_master', async (req, res) => {
    try {
        const items = await query('SELECT * FROM reject_master');
        const formatted = items.map(i => ({
            id: i.id, sku: i.sku, name: i.name, baseUnit: i.base_unit,
            unit2: i.unit2, ratio2: i.ratio2 ? Number(i.ratio2) : undefined, op2: i.op2,
            unit3: i.unit3, ratio3: i.ratio3 ? Number(i.ratio3) : undefined, op3: i.op3,
            lastUpdated: i.last_updated
        }));
        res.json(formatted);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reject_master', async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        for (const i of items) {
             await conn.execute(
                `INSERT INTO reject_master (id, sku, name, base_unit, unit2, ratio2, op2, unit3, ratio3, op3, last_updated)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE sku=?, name=?, base_unit=?, unit2=?, ratio2=?, op2=?, unit3=?, ratio3=?, op3=?, last_updated=?`,
                [
                    i.id, i.sku, i.name, i.baseUnit, i.unit2, i.ratio2, i.op2, i.unit3, i.ratio3, i.op3, new Date(),
                    i.sku, i.name, i.baseUnit, i.unit2, i.ratio2, i.op2, i.unit3, i.ratio3, i.op3, new Date()
                ]
             );
        }
        await conn.commit();
        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        conn.release();
    }
});

app.get('/api/reject_logs', async (req, res) => {
    try {
        const logs = await query('SELECT * FROM reject_logs ORDER BY date DESC');
        const formatted = logs.map(l => ({
            id: l.id,
            date: l.date, // MySQL date string
            notes: l.notes,
            timestamp: l.timestamp,
            items: typeof l.items_json === 'string' ? JSON.parse(l.items_json) : l.items_json
        }));
        res.json(formatted);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reject_logs', async (req, res) => {
    const log = req.body;
    try {
        // FIX: Ensure timestamp is a valid Date object for MySQL driver
        // Parsing the ISO string from frontend
        const timestamp = new Date(log.timestamp);
        
        await query(
            `INSERT INTO reject_logs (id, date, notes, timestamp, items_json) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE date=?, notes=?, timestamp=?, items_json=?`,
            [
                log.id, log.date, log.notes, timestamp, JSON.stringify(log.items),
                log.date, log.notes, timestamp, JSON.stringify(log.items)
            ]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Error saving reject log:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/reject_logs/:id', async (req, res) => {
    // Re-use logic for consistency
    const log = req.body;
    try {
        const timestamp = new Date(log.timestamp);
        await query(
            `UPDATE reject_logs SET date=?, notes=?, timestamp=?, items_json=? WHERE id=?`,
            [log.date, log.notes, timestamp, JSON.stringify(log.items), req.params.id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/reject_logs/:id', async (req, res) => {
    try {
        await query('DELETE FROM reject_logs WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Connected to database: ${dbConfig.database} on ${dbConfig.host}`);
});
