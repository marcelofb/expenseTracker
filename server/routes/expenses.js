import express from 'express';
import { pool } from '../db/database.js';
import { ALLOWED_PERSONS, ARG_TIMEZONE } from '../utils/constants.js';

const router = express.Router();

function isValidAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return false;

  const decimals = String(value).split('.')[1] || '';
  return decimals.length <= 2;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

function validateExpense(payload) {
  const errors = [];

  if (!payload.description || !String(payload.description).trim()) {
    errors.push('description is required');
  }

  if (!isValidAmount(payload.amount)) {
    errors.push('amount must be > 0 with up to 2 decimals');
  }

  if (!isValidDate(payload.expense_date)) {
    errors.push('expense_date must be in YYYY-MM-DD format');
  }

  if (!ALLOWED_PERSONS.includes(payload.person)) {
    errors.push(`person must be one of: ${ALLOWED_PERSONS.join(', ')}`);
  }

  return errors;
}

function getCurrentMonthInArg() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARG_TIMEZONE,
    year: 'numeric',
    month: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}`;
}

function parseMonthInput(value) {
  if (!value) return { ok: true, month: getCurrentMonthInArg() };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return { ok: false, error: 'month must be in YYYY-MM format' };
  }
  return { ok: true, month: value };
}

function monthBoundsFromYYYYMM(month) {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNumber = Number(monthStr);
  const start = `${yearStr}-${monthStr}-01`;

  const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));
  const nextYear = nextMonthDate.getUTCFullYear();
  const nextMonth = String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0');
  const end = `${nextYear}-${nextMonth}-01`;

  return { start, end };
}

function initPersonTotals() {
  return ALLOWED_PERSONS.map((person) => ({ person, total: 0 }));
}

router.get('/summary', async (req, res) => {
  const parsedMonth = parseMonthInput(req.query.month);
  if (!parsedMonth.ok) {
    return res.status(400).json({ error: parsedMonth.error });
  }

  const { start, end } = monthBoundsFromYYYYMM(parsedMonth.month);

  try {
    const [totalResult, byPersonResult] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::float8 AS total
         FROM expenses
         WHERE expense_date >= $1 AND expense_date < $2;`,
        [start, end]
      ),
      pool.query(
        `SELECT person, COALESCE(SUM(amount), 0)::float8 AS total
         FROM expenses
         WHERE expense_date >= $1 AND expense_date < $2
         GROUP BY person;`,
        [start, end]
      )
    ]);

    const totalsMap = new Map(byPersonResult.rows.map((row) => [row.person, Number(row.total)]));
    const totalPorPersona = initPersonTotals().map((item) => ({
      person: item.person,
      total: totalsMap.get(item.person) || 0
    }));

    return res.json({
      period: parsedMonth.month,
      totalGeneral: Number(totalResult.rows[0].total || 0),
      totalPorPersona
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    return res.status(500).json({ error: 'Failed to fetch expenses summary' });
  }
});

router.get('/', async (req, res) => {
  const parsedMonth = parseMonthInput(req.query.month);
  if (!parsedMonth.ok) {
    return res.status(400).json({ error: parsedMonth.error });
  }

  const { start, end } = monthBoundsFromYYYYMM(parsedMonth.month);

  try {
    const { rows } = await pool.query(
      `SELECT id, description, amount::float8 AS amount, expense_date, person, created_at, updated_at
       FROM expenses
       WHERE expense_date >= $1 AND expense_date < $2
       ORDER BY expense_date DESC, created_at DESC;`
      ,
      [start, end]
    );

    res.json({ period: parsedMonth.month, expenses: rows });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/', async (req, res) => {
  const payload = {
    description: String(req.body.description || '').trim(),
    amount: req.body.amount,
    expense_date: req.body.expense_date,
    person: req.body.person
  };

  const errors = validateExpense(payload);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' | ') });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO expenses (description, amount, expense_date, person)
       VALUES ($1, $2, $3, $4)
       RETURNING id, description, amount::float8 AS amount, expense_date, person, created_at, updated_at;`,
      [payload.description, payload.amount, payload.expense_date, payload.person]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating expense:', error);
    return res.status(500).json({ error: 'Failed to create expense' });
  }
});

router.put('/:id', async (req, res) => {
  const payload = {
    description: String(req.body.description || '').trim(),
    amount: req.body.amount,
    expense_date: req.body.expense_date,
    person: req.body.person
  };

  const errors = validateExpense(payload);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' | ') });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE expenses
       SET description = $1, amount = $2, expense_date = $3, person = $4
       WHERE id = $5
       RETURNING id, description, amount::float8 AS amount, expense_date, person, created_at, updated_at;`,
      [payload.description, payload.amount, payload.expense_date, payload.person, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('Error updating expense:', error);
    return res.status(500).json({ error: 'Failed to update expense' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting expense:', error);
    return res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
