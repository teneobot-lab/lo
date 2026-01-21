
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
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_wms',
    dateStrings: true
});

async function query(sql, params) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

// Root
app.get('/', (req, res) => res.send('<h1>Nexus WMS API is Online</h1>'));

// 1. ITEMS
app.get('/api/items', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM items');
        res.json(rows.map(i => ({
            ...i, active: !!i.active, price: Number(i.price), stock: Number(i.stock),
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

// 2. TRANSACTIONS
app.get('/api/transactions', async (req, res) => {
    try {
        const txs = await query('SELECT * FROM transactions ORDER BY date DESC LIMIT 100');
        for (let t of txs) {
            const items = await query('SELECT * FROM transaction_items WHERE transaction_id = ?', [t.id]);
            t.items = items.map(it => ({
                itemId: it.item_id, sku: it.sku, name: it.name, qty: it.qty, uom: it.uom,
                unitPrice: Number(it.unit_price), total: Number(it.total)
            }));
            t.totalValue = Number(t.total_value);
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

// 3. LOGIN
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
        const rows = await query('SELECT * FROM reject_master');
        res.json(rows.map(i => ({ ...i, ratio2: Number(i.ratio2), ratio3: Number(i.ratio3) })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reject_logs', async (req, res) => {
    const log = req.body;
    try {
        await query(
            `INSERT INTO reject_logs (id, date, notes, timestamp, items_json) VALUES (?, ?, ?, ?, ?)`,
            [log.id, log.date, log.notes, new Date(log.timestamp), JSON.stringify(log.items)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API LIVE: http://89.21.85.28:${PORT}`);
});
