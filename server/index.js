
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// DB Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_wms',
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function query(sql, params) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

// 1. ITEMS (INVENTORY)
app.get('/api/items', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM items');
        res.json(rows.map(i => ({
            ...i, 
            active: !!i.active, 
            price: Number(i.price), 
            stock: Number(i.stock),
            minLevel: Number(i.min_level),
            ratio2: i.ratio2 ? Number(i.ratio2) : undefined,
            ratio3: i.ratio3 ? Number(i.ratio3) : undefined
        })));
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
        const txs = await query('SELECT * FROM transactions ORDER BY date DESC LIMIT 500');
        for (let t of txs) {
            const items = await query('SELECT * FROM transaction_items WHERE transaction_id = ?', [t.id]);
            t.items = items.map(it => ({
                itemId: it.item_id, sku: it.sku, name: it.name, qty: Number(it.qty), uom: it.uom,
                unitPrice: Number(it.unit_price), total: Number(it.total)
            }));
            t.totalValue = Number(t.total_value);
            t.userId = t.user_id;
            t.poNumber = t.po_number;
            t.deliveryNote = t.delivery_note;
        }
        res.json(txs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions', async (req, res) => {
    const t = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.execute(
            `INSERT INTO transactions (id, type, date, total_value, user_id, supplier, po_number, delivery_note, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [t.id, t.type, t.date, t.totalValue, t.userId, t.supplier, t.poNumber, t.deliveryNote, t.notes]
        );
        for (const item of t.items) {
            await conn.execute(
                `INSERT INTO transaction_items (transaction_id, item_id, sku, name, qty, uom, unit_price, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [t.id, item.itemId, item.sku, item.name, item.qty, item.uom, item.unitPrice, item.total]
            );
            const stockOp = t.type === 'inbound' ? '+' : '-';
            await conn.execute(`UPDATE items SET stock = stock ${stockOp} ? WHERE id = ?`, [item.qty, item.itemId]);
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

app.delete('/api/transactions/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [tx] = await conn.execute('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (tx.length === 0) throw new Error('Transaction not found');
        
        const items = await query('SELECT * FROM transaction_items WHERE transaction_id = ?', [req.params.id]);
        const type = tx[0].type;

        // Revert Stock
        for (const item of items) {
            const stockOp = type === 'inbound' ? '-' : '+';
            await conn.execute(`UPDATE items SET stock = stock ${stockOp} ? WHERE id = ?`, [item.qty, item.item_id]);
        }

        await conn.execute('DELETE FROM transactions WHERE id = ?', [req.params.id]);
        await conn.commit();
        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        conn.release();
    }
});

// 3. LOGIN & USERS
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

app.get('/api/users', async (req, res) => {
    try {
        const rows = await query('SELECT id, username, role, name FROM users');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        if (u.password) {
            await query(
                `INSERT INTO users (id, username, password_hash, role, name) VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name=?, role=?, password_hash=?`,
                [u.id, u.username, u.password, u.role, u.name, u.name, u.role, u.password]
            );
        } else {
            await query(
                `INSERT INTO users (id, username, role, name) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name=?, role=?`,
                [u.id, u.username, u.role, u.name, u.name, u.role]
            );
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. REJECT MODULE
app.get('/api/reject_master', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM reject_master');
        res.json(rows.map(i => ({ 
            ...i, 
            ratio2: i.ratio2 ? Number(i.ratio2) : undefined, 
            ratio3: i.ratio3 ? Number(i.ratio3) : undefined 
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reject_master', async (req, res) => {
    const items = req.body;
    try {
        await query('DELETE FROM reject_master'); // Clear and reload for bulk update
        for (const i of items) {
            await query(
                `INSERT INTO reject_master (id, sku, name, base_unit, unit2, ratio2, op2, unit3, ratio3, op3, last_updated)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [i.id, i.sku, i.name, i.baseUnit, i.unit2, i.ratio2, i.op2, i.unit3, i.ratio3, i.op3, i.lastUpdated]
            );
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reject_logs', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM reject_logs ORDER BY date DESC');
        res.json(rows.map(r => ({
            ...r,
            items: typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reject_logs', async (req, res) => {
    const log = req.body;
    try {
        await query(
            `INSERT INTO reject_logs (id, date, notes, timestamp, items_json) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE date=?, notes=?, items_json=?`,
            [log.id, log.date, log.notes, new Date(log.timestamp), JSON.stringify(log.items), log.date, log.notes, JSON.stringify(log.items)]
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NEXUS API IS LIVE: http://165.245.187.238:${PORT}`);
});
