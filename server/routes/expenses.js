import express from 'express';
import { pool } from '../db/database.js';
import { ALLOWED_PERSONS } from '../utils/constants.js';

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

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, description, amount::float8 AS amount, expense_date, person, created_at, updated_at
       FROM expenses
       ORDER BY expense_date DESC, created_at DESC;`
    );

    res.json(rows);
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
