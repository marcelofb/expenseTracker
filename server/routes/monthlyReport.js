import express from 'express';
import { pool } from '../db/database.js';
import { sendTelegramMessage } from '../telegram/bot.js';
import { ARG_TIMEZONE } from '../utils/constants.js';

const router = express.Router();

function formatArs(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

function requireCronSecret(req, res, next) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return res.status(500).json({ error: 'CRON_SECRET is not configured' });
  if (req.header('x-cron-secret') !== expected) return res.status(401).json({ error: 'Unauthorized' });
  return next();
}

router.post('/', requireCronSecret, async (_req, res) => {
  try {
    const totalQuery = `
      WITH bounds AS (
        SELECT
          (date_trunc('month', NOW() AT TIME ZONE $1) - INTERVAL '1 month')::date AS start_date,
          date_trunc('month', NOW() AT TIME ZONE $1)::date AS end_date
      )
      SELECT COALESCE(SUM(e.amount), 0)::float8 AS total
      FROM expenses e
      CROSS JOIN bounds b
      WHERE e.expense_date >= b.start_date
        AND e.expense_date < b.end_date;
    `;

    const byPersonQuery = `
      WITH bounds AS (
        SELECT
          (date_trunc('month', NOW() AT TIME ZONE $1) - INTERVAL '1 month')::date AS start_date,
          date_trunc('month', NOW() AT TIME ZONE $1)::date AS end_date
      )
      SELECT e.person, COALESCE(SUM(e.amount), 0)::float8 AS total
      FROM expenses e
      CROSS JOIN bounds b
      WHERE e.expense_date >= b.start_date
        AND e.expense_date < b.end_date
      GROUP BY e.person
      ORDER BY e.person;
    `;

    const periodQuery = `
      SELECT TO_CHAR(date_trunc('month', NOW() AT TIME ZONE $1) - INTERVAL '1 month', 'YYYY-MM') AS period;
    `;

    const [totalResult, byPersonResult, periodResult] = await Promise.all([
      pool.query(totalQuery, [ARG_TIMEZONE]),
      pool.query(byPersonQuery, [ARG_TIMEZONE]),
      pool.query(periodQuery, [ARG_TIMEZONE])
    ]);

    const period = periodResult.rows[0].period;
    const total = Number(totalResult.rows[0].total || 0);
    const byPerson = byPersonResult.rows;

    let body = `<b>Cierre mensual de gastos (${period})</b>\n\n`;
    body += `Total general: <b>${formatArs(total)}</b>\n\n`;
    body += `<b>Total por persona</b>\n`;

    if (byPerson.length === 0) {
      body += `- Sin gastos registrados`;
    } else {
      body += byPerson.map((row) => `- ${row.person}: ${formatArs(Number(row.total))}`).join('\n');
    }

    await sendTelegramMessage(body);

    return res.json({
      ok: true,
      period,
      total,
      byPerson: byPerson.map((row) => ({ person: row.person, total: Number(row.total) }))
    });
  } catch (error) {
    console.error('Error building monthly report:', error);
    return res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

export default router;
