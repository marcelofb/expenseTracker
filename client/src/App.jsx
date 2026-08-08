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

function nextPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function splitMonth(value) {
  const [year, month] = value.split('-');
  return { year, month };
}

function buildMonth(year, month) {
  if (!year || !month) return '';
  return `${year}-${month}`;
}

function getMonthOptions() {
  return [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ];
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const startYear = 2020;
  const endYear = currentYear + 1;
  const years = [];

  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(String(year));
  }

  return years;
}

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const initialPeriod = splitMonth(currentMonth());
  const [draftYear, setDraftYear] = useState(initialPeriod.year);
  const [draftMonth, setDraftMonth] = useState(initialPeriod.month);
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
  const [periodLoading, setPeriodLoading] = useState(false);
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

  async function applyMonth(nextMonth) {
    if (!nextMonth || nextMonth === selectedMonth) return;

    setSelectedMonth(nextMonth);
    setPeriodLoading(true);
    try {
      await nextPaint();
      await loadExpenses({ month: nextMonth });
    } finally {
      setPeriodLoading(false);
    }
  }

  async function commitDraftPeriod(nextYear = draftYear, nextMonth = draftMonth) {
    const nextPeriod = buildMonth(nextYear, nextMonth);
    if (!nextPeriod || nextPeriod === selectedMonth) return;
    await applyMonth(nextPeriod);
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

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const yearOptions = useMemo(() => getYearOptions(), []);
  const draftPeriod = buildMonth(draftYear, draftMonth);
  const hasPendingSelection = draftPeriod && draftPeriod !== selectedMonth;
  const isViewingCurrentPeriod = resolvedPeriod === currentMonth();

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
            <div className="period-header">
              <div>
                <p className="period-label">Viendo periodo</p>
                <p className="period-value">{resolvedPeriod}</p>
              </div>

              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const month = currentMonth();
                  const { year, month: currentMonthValue } = splitMonth(month);
                  setDraftYear(year);
                  setDraftMonth(currentMonthValue);
                  applyMonth(month);
                }}
                disabled={loading || periodLoading || isViewingCurrentPeriod}
              >
                Mes actual
              </button>
            </div>

            <div className="period-actions">
              <label>
                Año
                <select
                  value={draftYear}
                  onChange={(event) => {
                    setDraftYear(event.target.value);
                  }}
                  disabled={loading || periodLoading}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mes
                <select
                  value={draftMonth}
                  onChange={(event) => {
                    setDraftMonth(event.target.value);
                  }}
                  disabled={loading || periodLoading}
                >
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => commitDraftPeriod()}
                disabled={loading || periodLoading || !hasPendingSelection}
              >
                Aplicar
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
            disabled={loading || periodLoading}
            onSaved={async () => {
              await loadExpenses({ month: selectedMonth });
              setEditingExpense(null);
            }}
            onCancelEdit={() => setEditingExpense(null)}
          />

          {error ? <p className="panel error">{error}</p> : null}

          {loading || periodLoading ? (
            <section className="panel loading-screen loading-inline loading-overlay" role="status" aria-live="polite" aria-busy="true">
              <div className="spinner" />
              <p className="loading-title">Actualizando gastos...</p>
              <p className="loading-hint">Estamos cargando el periodo seleccionado. No cierres esta pantalla.</p>
            </section>
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
