
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

// Database Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nexus_wms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true // Return dates as strings to simplify frontend parsing
});

// Helper: Query Wrapper
const query = async (sql, params) => {
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (error) {
    console.error("Database Error:", error.message);
    throw error;
  }
};

// --- AUTH ROUTES ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, hash } = req.body;
    const rows = await query('SELECT * FROM users WHERE username = ? AND password_hash = ?', [username, hash]);
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

app.get('/api/users', async (req, res) => {
  try {
    const rows = await query('SELECT id, username, role, name FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { id, username, role, name, password } = req.body;
    // Note: Password hash logic should ideally happen here if we sent raw password, 
    // but frontend sends pre-hashed for this demo structure or raw.
    // Assuming frontend sends the object. If password provided, update it.
    
    // Check exist
    const exist = await query('SELECT id FROM users WHERE id = ?', [id]);
    
    if (exist.length > 0) {
        let sql = 'UPDATE users SET name=?, role=? WHERE id=?';
        let params = [name, role, id];
        if (password) { // If password is provided (already hashed from frontend service or raw)
             // In real app, hash here.
             // For compatibility with storageService.ts which sends raw password in 'password' field only if changed
             const crypto = require('crypto');
             const hash = crypto.createHash('sha256').update(password).digest('hex');
             sql = 'UPDATE users SET name=?, role=?, password_hash=? WHERE id=?';
             params = [name, role, hash, id];
        }
        await query(sql, params);
    } else {
        const crypto = require('crypto');
        // Default password if not provided for new user
        const pwd = password || '12345';
        const hash = crypto.createHash('sha256').update(pwd).digest('hex');
        await query('INSERT INTO users (id, username, password_hash, role, name) VALUES (?,?,?,?,?)', [id, username, hash, role, name]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ITEMS ROUTES ---
app.get('/api/items', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM items');
    // Map DB columns to Frontend Interface
    const items = rows.map(r => ({
      id: r.id, sku: r.sku, name: r.name, category: r.category,
      price: Number(r.price), location: r.location, unit: r.unit,
      stock: r.stock, minLevel: r.min_level, active: !!r.active,
      unit2: r.unit2, ratio2: r.ratio2 ? Number(r.ratio2) : undefined, op2: r.op2,
      unit3: r.unit3, ratio3: r.ratio3 ? Number(r.ratio3) : undefined, op3: r.op3,
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
    const [exists] = await conn.query('SELECT id FROM items WHERE id = ?', [item.id]);
    
    if (exists.length > 0) {
      await conn.query(
        `UPDATE items SET sku=?, name=?, category=?, price=?, location=?, unit=?, stock=?, min_level=?, active=?, unit2=?, ratio2=?, op2=?, unit3=?, ratio3=?, op3=? WHERE id=?`,
        [item.sku, item.name, item.category, item.price, item.location, item.unit, item.stock, item.minLevel, item.active, item.unit2, item.ratio2, item.op2, item.unit3, item.ratio3, item.op3, item.id]
      );
    } else {
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
    await query('DELETE FROM items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TRANSACTIONS ROUTES ---
app.get('/api/transactions', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM transactions ORDER BY date DESC');
    const transactions = [];
    
    for (const t of rows) {
      const items = await query('SELECT * FROM transaction_items WHERE transaction_id = ?', [t.id]);
      transactions.push({
        id: t.id,
        type: t.type,
        date: t.date,
        totalValue: Number(t.total_value),
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
          unitPrice: Number(i.unit_price),
          total: Number(i.total)
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

      // Trigger Stock Update
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

// --- REJECT MODULE ROUTES ---

// 1. Reject Master Data
app.get('/api/reject_master', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM reject_master');
    const items = rows.map(r => ({
      id: r.id, sku: r.sku, name: r.name, baseUnit: r.base_unit,
      unit2: r.unit2, ratio2: r.ratio2 ? Number(r.ratio2) : undefined, op2: r.op2,
      unit3: r.unit3, ratio3: r.ratio3 ? Number(r.ratio3) : undefined, op3: r.op3,
      lastUpdated: r.last_updated
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reject_master', async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        for (const item of items) {
             const [exists] = await conn.query('SELECT id FROM reject_master WHERE id = ?', [item.id]);
             if (exists.length > 0) {
                 await conn.query(
                     `UPDATE reject_master SET sku=?, name=?, base_unit=?, unit2=?, ratio2=?, op2=?, unit3=?, ratio3=?, op3=?, last_updated=? WHERE id=?`,
                     [item.sku, item.name, item.baseUnit, item.unit2, item.ratio2, item.op2, item.unit3, item.ratio3, item.op3, new Date(), item.id]
                 );
             } else {
                 await conn.query(
                     `INSERT INTO reject_master (id, sku, name, base_unit, unit2, ratio2, op2, unit3, ratio3, op3, last_updated) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                     [item.id, item.sku, item.name, item.baseUnit, item.unit2, item.ratio2, item.op2, item.unit3, item.ratio3, item.op3, new Date()]
                 );
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

app.delete('/api/reject_master/:id', async (req, res) => {
    try {
        await query('DELETE FROM reject_master WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Reject Logs
app.get('/api/reject_logs', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM reject_logs ORDER BY timestamp DESC');
        const logs = rows.map(r => ({
            id: r.id,
            date: r.date,
            notes: r.notes,
            timestamp: r.timestamp,
            items: r.items_json // JSON column is auto-parsed by mysql2 usually, if not we parse it
        }));
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reject_logs', async (req, res) => {
    const log = req.body;
    try {
        await query(
            `INSERT INTO reject_logs (id, date, notes, timestamp, items_json) VALUES (?,?,?,?,?)`,
            [log.id, log.date, log.notes, log.timestamp, JSON.stringify(log.items)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/reject_logs/:id', async (req, res) => {
    const log = req.body;
    try {
        await query(
            `UPDATE reject_logs SET date=?, notes=?, items_json=? WHERE id=?`,
            [log.date, log.notes, JSON.stringify(log.items), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/reject_logs/:id', async (req, res) => {
    try {
        await query('DELETE FROM reject_logs WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Start
app.listen(PORT, () => {
  console.log(`Nexus WMS Backend running on port ${PORT}`);
});
