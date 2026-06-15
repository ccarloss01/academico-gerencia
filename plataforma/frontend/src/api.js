const AUTH = import.meta.env.VITE_AUTH_URL || 'http://localhost:3001';
const ACADEMIC = import.meta.env.VITE_ACADEMIC_URL || 'http://localhost:3002';
const ASSIGNMENT = import.meta.env.VITE_ASSIGNMENT_URL || 'http://localhost:3003';

function token() {
  return localStorage.getItem('token');
}

function authHeader() {
  return { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' };
}

async function req(url, options = {}) {
  const res = await fetch(url, { headers: authHeader(), ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

export const auth = {
  login: (body) =>
    fetch(`${AUTH}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
  register: (body) =>
    fetch(`${AUTH}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
};

export const alunos = {
  list: () => req(`${ACADEMIC}/alunos`),
  create: (body) => req(`${ACADEMIC}/alunos`, { method: 'POST', body: JSON.stringify(body) }),
  matriculas: (id) => req(`${ACADEMIC}/alunos/${id}/matriculas`),
};

export const professores = {
  list: () => req(`${ACADEMIC}/professores`),
  create: (body) => req(`${ACADEMIC}/professores`, { method: 'POST', body: JSON.stringify(body) }),
};

export const disciplinas = {
  list: () => req(`${ACADEMIC}/disciplinas`),
  create: (body) => req(`${ACADEMIC}/disciplinas`, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => req(`${ACADEMIC}/disciplinas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => req(`${ACADEMIC}/disciplinas/${id}`, { method: 'DELETE' }),
};

export const turmas = {
  list: () => req(`${ACADEMIC}/turmas`),
  get: (id) => req(`${ACADEMIC}/turmas/${id}`),
  create: (body) => req(`${ACADEMIC}/turmas`, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => req(`${ACADEMIC}/turmas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => req(`${ACADEMIC}/turmas/${id}`, { method: 'DELETE' }),
  matricular: (id, body) => req(`${ACADEMIC}/turmas/${id}/matriculas`, { method: 'POST', body: JSON.stringify(body) }),
  matriculas: (id) => req(`${ACADEMIC}/turmas/${id}/matriculas`),
};

export const atividades = {
  list: (turma_id) => req(`${ASSIGNMENT}/atividades${turma_id ? `?turma_id=${turma_id}` : ''}`),
  create: (body) => req(`${ASSIGNMENT}/atividades`, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => req(`${ASSIGNMENT}/atividades/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => req(`${ASSIGNMENT}/atividades/${id}`, { method: 'DELETE' }),
  entregar: (id, body) => req(`${ASSIGNMENT}/atividades/${id}/entregas`, { method: 'POST', body: JSON.stringify(body) }),
  entregas: (id) => req(`${ASSIGNMENT}/atividades/${id}/entregas`),
  entregasPorAluno: (aluno_id) => req(`${ASSIGNMENT}/entregas?aluno_id=${aluno_id}`),
  lancarNota: (id, body) => req(`${ASSIGNMENT}/entregas/${id}/nota`, { method: 'PATCH', body: JSON.stringify(body) }),
};
