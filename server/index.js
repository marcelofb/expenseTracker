import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import expensesRouter from './routes/expenses.js';
import monthlyReportRouter from './routes/monthlyReport.js';
import { initDB } from './db/database.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'expense-tracker-ars' });
});

app.use('/api/expenses', expensesRouter);
app.use('/api/monthly-report', monthlyReportRouter);

initDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
