import { useEffect, useMemo, useState } from 'react';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import { deleteExpense, getExpenses } from './api.js';
import './App.css';

function formatArs(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value || 0);
}

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const [error, setError] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('Todos');
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadExpenses({ trackLoading = true } = {}) {
    try {
      if (trackLoading) setLoading(true);
      setError('');
      const data = await getExpenses();
      setExpenses(Array.isArray(data) ? data : []);
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

    loadExpenses({ trackLoading: false }).finally(() => {
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
      await loadExpenses();
      if (editingExpense?.id === id) setEditingExpense(null);
    } catch (deleteError) {
      setError(deleteError.message || 'No se pudo borrar el gasto.');
    } finally {
      setDeletingId(null);
    }
  }

  const totalGeneral = useMemo(
    () => expenses.reduce((acc, item) => acc + Number(item.amount || 0), 0),
    [expenses]
  );

  const totalPorPersona = useMemo(() => {
    return ['Bicha', 'Bicho', 'Bicha y Bicho'].map((person) => ({
      person,
      total: expenses
        .filter((item) => item.person === person)
        .reduce((acc, item) => acc + Number(item.amount || 0), 0)
    }));
  }, [expenses]);

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
          <section className="panel totals">
            <h2>Resumen actual</h2>
            <p className="big">Total general: {formatArs(totalGeneral)}</p>
            <ul>
              {totalPorPersona.map((item) => (
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
              await loadExpenses();
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
