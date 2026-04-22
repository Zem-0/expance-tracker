const { allowedOrigin } = require('./config');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();

app.use(helmet());
app.use(cors({ origin: allowedOrigin }));
app.use(morgan('dev'));
app.use(express.json());

// ── Health ────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
});

// ── Helpers ───────────────────────────────────────
function formatExpense(row) {
  return {
    id:          row.id,
    amount:      row.amount_paise / 100,
    category:    row.category,
    description: row.description,
    date:        row.date,
    created_at:  row.created_at,
  };
}

// ── POST /expenses ────────────────────────────────
app.post('/expenses', (req, res) => {
  const { amount, category, description, date, idempotency_key } = req.body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
    return res.status(400).json({ error: 'amount must be a positive number' });
  if (!category || typeof category !== 'string' || !category.trim())
    return res.status(400).json({ error: 'category is required' });
  if (!date || isNaN(Date.parse(date)))
    return res.status(400).json({ error: 'date is required and must be a valid date' });

  const amountPaise = Math.round(Number(amount) * 100);
  const key = idempotency_key || uuidv4();

  const existing = db.prepare('SELECT * FROM expenses WHERE idempotency_key = ?').get(key);
  if (existing) return res.status(200).json(formatExpense(existing));

  try {
    const id  = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO expenses (id, amount_paise, category, description, date, idempotency_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, amountPaise, category.trim(), (description || '').trim(), date, key, now);

    return res.status(201).json(formatExpense(db.prepare('SELECT * FROM expenses WHERE id = ?').get(id)));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(200).json(formatExpense(
        db.prepare('SELECT * FROM expenses WHERE idempotency_key = ?').get(key)
      ));
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /expenses ─────────────────────────────────
app.get('/expenses', (req, res) => {
  const { category, sort } = req.query;

  let sql = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];

  if (category && category.trim()) {
    sql += ' AND category = ?';
    params.push(category.trim());
  }

  sql += sort === 'date_desc'
    ? ' ORDER BY date DESC, created_at DESC'
    : ' ORDER BY created_at DESC';

  res.json(db.prepare(sql).all(...params).map(formatExpense));
});

// ── DELETE /expenses/:id ──────────────────────────
app.delete('/expenses/:id', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT id FROM expenses WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Expense not found' });

  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = app;
