
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

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

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

app.get('/api/items', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM items');
        res.json(rows.map(i => ({
            ...i, 
            active: !!i.active, 
            price: Number(i.price || 0), 
            stock: Number(i.stock || 0),
            minLevel: Number(i.min_level || 0),
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
                i.id, i.sku, i.name, i.category || 'General', i.price || 0, i.location || 'A-01', i.unit || 'Pcs', i.stock || 0, i.minLevel || 0, i.active === false ? 0 : 1, i.unit2, i.ratio2, i.op2, i.unit3, i.ratio3, i.op3,
                i.name, i.category || 'General', i.price || 0, i.location || 'A-01', i.unit || 'Pcs', i.stock || 0, i.minLevel || 0, i.active === false ? 0 : 1, i.unit2, i.ratio2, i.op2, i.unit3, i.ratio3, i.op3
            ]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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
            t.documents = t.documents ? JSON.parse(t.documents) : [];
        }
        res.json(txs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions', async (req, res) => {
    const t = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const docsJson = JSON.stringify(t.documents || []);
        
        await conn.execute(
            `INSERT INTO transactions (id, type, date, total_value, user_id, supplier, po_number, delivery_note, notes, documents)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [t.id, t.type, t.date, t.totalValue || 0, t.userId || 'admin', t.supplier || '', t.poNumber || '', t.deliveryNote || '', t.notes || '', docsJson]
        );

        for (const item of t.items) {
            const qty = Number(item.qty) || 0;
            const price = Number(item.unitPrice) || 0;
            const total = Number(item.total) || 0;

            await conn.execute(
                `INSERT INTO transaction_items (transaction_id, item_id, sku, name, qty, uom, unit_price, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [t.id, item.itemId, item.sku, item.name, qty, item.uom, price, total]
            );
            
            const stockOp = t.type === 'inbound' ? '+' : '-';
            await conn.execute(`UPDATE items SET stock = stock ${stockOp} ? WHERE id = ?`, [qty, item.itemId]);
        }
        await conn.commit();
        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        console.error("TX Error:", e);
        res.status(500).json({ error: e.message });
    } finally {
        conn.release();
    }
});

app.post('/api/login', async (req, res) => {
    const { username, hash } = req.body;
    try {
        const users = await query('SELECT * FROM users WHERE username = ? AND password_hash = ?', [username, hash]);
        if (users.length > 0) {
            const u = users[0];
            res.json({ id: u.id, username: u.username, role: u.role, name: u.name });
        } else { res.status(401).json({ error: 'Invalid credentials' }); }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const rows = await query('SELECT id, username, role, name FROM users');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NEXUS API IS LIVE: http://0.0.0.0:${PORT}`);
});
