import { useEffect, useMemo, useState } from 'react';
import { createExpense, updateExpense } from '../api.js';

const PERSONS = ['Bicha', 'Bicho', 'Bicha y Bicho'];

function toToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpenseForm({ editingExpense, onSaved, onCancelEdit }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(toToday());
  const [person, setPerson] = useState(PERSONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = useMemo(() => Boolean(editingExpense?.id), [editingExpense]);

  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description || '');
      setAmount(editingExpense.amount != null ? String(editingExpense.amount) : '');
      setExpenseDate(editingExpense.expense_date || toToday());
      setPerson(editingExpense.person || PERSONS[0]);
      return;
    }

    setDescription('');
    setAmount('');
    setExpenseDate(toToday());
    setPerson(PERSONS[0]);
  }, [editingExpense]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('La descripcion es obligatoria.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('El monto debe ser mayor a 0.');
      return;
    }

    const decimals = (amount.split('.')[1] || '').length;
    if (decimals > 2) {
      setError('El monto permite hasta 2 decimales.');
      return;
    }

    if (!expenseDate) {
      setError('La fecha es obligatoria.');
      return;
    }

    if (!PERSONS.includes(person)) {
      setError('Persona invalida.');
      return;
    }

    const payload = {
      description: description.trim(),
      amount: Number(parsedAmount.toFixed(2)),
      expense_date: expenseDate,
      person
    };

    try {
      setLoading(true);
      if (isEdit) {
        await updateExpense(editingExpense.id, payload);
      } else {
        await createExpense(payload);
      }
      onSaved();
    } catch (submitError) {
      setError(submitError.message || 'No se pudo guardar el gasto.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h2>{isEdit ? 'Editar gasto' : 'Registrar gasto'}</h2>

      <label>
        Descripcion
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ej: Supermercado"
          maxLength={120}
          required
        />
      </label>

      <label>
        Monto (ARS)
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          required
        />
      </label>

      <label>
        Fecha
        <input
          type="date"
          value={expenseDate}
          onChange={(event) => setExpenseDate(event.target.value)}
          max={toToday()}
          required
        />
      </label>

      <label>
        Persona
        <select value={person} onChange={(event) => setPerson(event.target.value)}>
          {PERSONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="error">{error}</p> : null}

      <div className="actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : isEdit ? 'Actualizar gasto' : 'Guardar gasto'}
        </button>

        {isEdit ? (
          <button type="button" className="secondary" onClick={onCancelEdit} disabled={loading}>
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
