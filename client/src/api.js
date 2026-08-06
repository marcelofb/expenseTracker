const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

async function parseResponse(response) {
  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export async function getExpenses() {
  const response = await fetch(`${API_URL}/expenses`);
  return parseResponse(response);
}

export async function createExpense(payload) {
  const response = await fetch(`${API_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function updateExpense(id, payload) {
  const response = await fetch(`${API_URL}/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function deleteExpense(id) {
  const response = await fetch(`${API_URL}/expenses/${id}`, {
    method: 'DELETE'
  });
  return parseResponse(response);
}
