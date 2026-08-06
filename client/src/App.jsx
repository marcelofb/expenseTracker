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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('Todos');
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadExpenses() {
    try {
      setLoading(true);
      setError('');
      const data = await getExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar los gastos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
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
        onSaved={async () => {
          await loadExpenses();
          setEditingExpense(null);
        }}
        onCancelEdit={() => setEditingExpense(null)}
      />

      {error ? <p className="panel error">{error}</p> : null}

      {loading ? (
        <p className="panel">Cargando gastos...</p>
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
    </main>
  );
}
