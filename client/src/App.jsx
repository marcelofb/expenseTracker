import { useEffect, useMemo, useState } from 'react';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import { deleteExpense, getExpenses, getExpensesSummary } from './api.js';
import './App.css';

function formatArs(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value || 0);
}

function currentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [resolvedPeriod, setResolvedPeriod] = useState(currentMonth());
  const [summary, setSummary] = useState({
    totalGeneral: 0,
    totalPorPersona: [
      { person: 'Bicha', total: 0 },
      { person: 'Bicho', total: 0 },
      { person: 'Bicha y Bicho', total: 0 }
    ]
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const [error, setError] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('Todos');
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadExpenses({ trackLoading = true, month = selectedMonth } = {}) {
    try {
      if (trackLoading) setLoading(true);
      setError('');
      const [expensesData, summaryData] = await Promise.all([
        getExpenses(month),
        getExpensesSummary(month)
      ]);

      setResolvedPeriod(expensesData?.period || month);
      setExpenses(Array.isArray(expensesData?.expenses) ? expensesData.expenses : []);
      setSummary({
        totalGeneral: Number(summaryData?.totalGeneral || 0),
        totalPorPersona: Array.isArray(summaryData?.totalPorPersona)
          ? summaryData.totalPorPersona
          : [
              { person: 'Bicha', total: 0 },
              { person: 'Bicho', total: 0 },
              { person: 'Bicha y Bicho', total: 0 }
            ]
      });
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar los gastos.');
    } finally {
      if (trackLoading) setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    const slowTimer = setTimeout(() => {
      if (mounted) setSlowWarning(true);
    }, 4000);

    loadExpenses({ trackLoading: false, month: selectedMonth }).finally(() => {
      if (!mounted) return;
      clearTimeout(slowTimer);
      setInitialLoading(false);
      setSlowWarning(false);
    });

    return () => {
      mounted = false;
      clearTimeout(slowTimer);
    };
  }, []);

  useEffect(() => {
    if (initialLoading) return;
    loadExpenses({ month: selectedMonth });
  }, [selectedMonth]);

  async function handleDelete(id) {
    const confirmed = window.confirm('Se borrara el gasto. Deseas continuar?');
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await deleteExpense(id);
      await loadExpenses({ month: selectedMonth });
      if (editingExpense?.id === id) setEditingExpense(null);
    } catch (deleteError) {
      setError(deleteError.message || 'No se pudo borrar el gasto.');
    } finally {
      setDeletingId(null);
    }
  }

  const isCurrentMonth = useMemo(() => selectedMonth === currentMonth(), [selectedMonth]);

  return (
    <main className="container">
      <header className="panel header">
        <h1>Expense Tracker ARS</h1>
        <p>Registro simple de gastos con cierre mensual por Telegram.</p>
      </header>

      {initialLoading ? (
        <section className="panel loading-screen" role="status" aria-live="polite">
          <div className="spinner" />
          {slowWarning ? (
            <>
              <p className="loading-title">Despertando el servidor...</p>
              <p className="loading-hint">
                Esto puede tardar hasta 1 minuto la primera vez. Ya casi esta.
              </p>
            </>
          ) : (
            <p className="loading-title">Cargando gastos...</p>
          )}
        </section>
      ) : (
        <>
          <section className="panel period-bar">
            <div>
              <p className="period-label">Viendo periodo</p>
              <p className="period-value">{resolvedPeriod}</p>
            </div>

            <div className="period-actions">
              <label>
                Mes
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  disabled={loading}
                />
              </label>
              <button
                type="button"
                className="secondary"
                onClick={() => setSelectedMonth(currentMonth())}
                disabled={loading || isCurrentMonth}
              >
                Mes actual
              </button>
            </div>
          </section>

          <section className="panel totals">
            <h2>Resumen actual</h2>
            <p className="big">Total general: {formatArs(summary.totalGeneral)}</p>
            <ul>
              {summary.totalPorPersona.map((item) => (
                <li key={item.person}>
                  {item.person}: {formatArs(item.total)}
                </li>
              ))}
            </ul>
          </section>

          <ExpenseForm
            editingExpense={editingExpense}
            disabled={loading}
            onSaved={async () => {
              await loadExpenses({ month: selectedMonth });
              setEditingExpense(null);
            }}
            onCancelEdit={() => setEditingExpense(null)}
          />

          {error ? <p className="panel error">{error}</p> : null}

          {loading ? (
            <p className="panel">Actualizando gastos...</p>
          ) : (
            <ExpenseList
              expenses={expenses}
              selectedPerson={selectedPerson}
              period={resolvedPeriod}
              onSelectPerson={setSelectedPerson}
              onEdit={setEditingExpense}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          )}
        </>
      )}
    </main>
  );
}
