const PERSONS = ['Todos', 'Bicha', 'Bicho', 'Bicha y Bicho'];

function formatArs(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value || 0);
}

function normalizeDate(value) {
  if (!value) return '';
  return String(value).split('T')[0];
}

function formatDateAr(value) {
  const normalized = normalizeDate(value);
  const parts = normalized.split('-');
  if (parts.length !== 3) return normalized;
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
}

function formatPeriodLabel(period) {
  if (!period) return '';
  const [year, month] = String(period).split('-');
  if (!year || !month) return period;
  return `${month}-${year}`;
}

export default function ExpenseList({
  expenses,
  selectedPerson,
  period,
  onSelectPerson,
  onEdit,
  onDelete,
  deletingId
}) {
  const filtered =
    selectedPerson === 'Todos' ? expenses : expenses.filter((item) => item.person === selectedPerson);

  return (
    <section className="panel">
      <div className="list-header">
        <h2>Gastos del periodo {formatPeriodLabel(period)}</h2>
        <div className="chips">
          {PERSONS.map((person) => (
            <button
              key={person}
              className={selectedPerson === person ? 'chip active' : 'chip'}
              onClick={() => onSelectPerson(person)}
              type="button"
            >
              {person}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">No hay gastos para mostrar.</p>
      ) : (
        <ul className="expense-list">
          {filtered.map((expense) => (
            <li key={expense.id} className="expense-item">
              <div>
                <p className="expense-description">{expense.description}</p>
                <p className="expense-meta">
                  {formatDateAr(expense.expense_date)} - {expense.person}
                </p>
              </div>

              <div className="right-col">
                <strong>{formatArs(expense.amount)}</strong>
                <div className="row-actions">
                  <button type="button" className="secondary" onClick={() => onEdit(expense)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={deletingId === expense.id}
                    onClick={() => onDelete(expense.id)}
                  >
                    {deletingId === expense.id ? 'Borrando...' : 'Borrar'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
