
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Database Connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nexus_wms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- ITEMS ROUTES ---

app.get('/api/items', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items');
    // Map snake_case to camelCase for frontend compatibility
    const items = rows.map(r => ({
      ...r,
      minLevel: r.min_level,
      unit2: r.unit2, ratio2: r.ratio2, op2: r.op2,
      unit3: r.unit3, ratio3: r.ratio3, op3: r.op3,
      active: !!r.active
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', async (req, res) => {
  const item = req.body;
  const conn = await pool.getConnection();
  try {
    // Check if exists
    const [exists] = await conn.query('SELECT id FROM items WHERE id = ?', [item.id]);
    
    if (exists.length > 0) {
      // Update
      await conn.query(
        `UPDATE items SET sku=?, name=?, category=?, price=?, location=?, unit=?, stock=?, min_level=?, active=?, unit2=?, ratio2=?, op2=?, unit3=?, ratio3=?, op3=? WHERE id=?`,
        [item.sku, item.name, item.category, item.price, item.location, item.unit, item.stock, item.minLevel, item.active, item.unit2, item.ratio2, item.op2, item.unit3, item.ratio3, item.op3, item.id]
      );
    } else {
      // Insert
      await conn.query(
        `INSERT INTO items (id, sku, name, category, price, location, unit, stock, min_level, active, unit2, ratio2, op2, unit3, ratio3, op3) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [item.id, item.sku, item.name, item.category, item.price, item.location, item.unit, item.stock, item.minLevel, item.active, item.unit2, item.ratio2, item.op2, item.unit3, item.ratio3, item.op3]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TRANSACTIONS ROUTES ---

app.get('/api/transactions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    const transactions = [];
    
    for (const t of rows) {
      const [items] = await pool.query('SELECT * FROM transaction_items WHERE transaction_id = ?', [t.id]);
      transactions.push({
        id: t.id,
        type: t.type,
        date: t.date,
        totalValue: t.total_value,
        userId: t.user_id,
        supplier: t.supplier,
        poNumber: t.po_number,
        deliveryNote: t.delivery_note,
        notes: t.notes,
        items: items.map(i => ({
          itemId: i.item_id,
          sku: i.sku,
          name: i.name,
          qty: i.qty,
          uom: i.uom,
          unitPrice: i.unit_price,
          total: i.total
        }))
      });
    }
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const t = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO transactions (id, type, date, total_value, user_id, supplier, po_number, delivery_note, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
      [t.id, t.type, new Date(t.date), t.totalValue, t.userId, t.supplier, t.poNumber, t.deliveryNote, t.notes]
    );

    for (const item of t.items) {
      await conn.query(
        `INSERT INTO transaction_items (transaction_id, item_id, sku, name, qty, uom, unit_price, total) VALUES (?,?,?,?,?,?,?,?)`,
        [t.id, item.itemId, item.sku, item.name, item.qty, item.uom, item.unitPrice, item.total]
      );

      // Update Stock
      if (t.type === 'inbound') {
        await conn.query('UPDATE items SET stock = stock + ? WHERE id = ?', [item.qty, item.itemId]);
      } else {
        await conn.query('UPDATE items SET stock = stock - ? WHERE id = ?', [item.qty, item.itemId]);
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// --- USERS ROUTES ---

app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows.map(u => ({...u, password_hash: undefined}))); // Don't send hash
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, hash } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password_hash = ?', [username, hash]);
    if (rows.length > 0) {
      const user = rows[0];
      res.json({ id: user.id, username: user.username, role: user.role, name: user.name });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Nexus WMS Backend running on port ${PORT}`);
});
