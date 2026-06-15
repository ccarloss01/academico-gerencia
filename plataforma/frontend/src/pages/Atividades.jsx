import { useEffect, useState } from 'react';
import { atividades, turmas, alunos } from '../api';
import { useAuth } from '../context/AuthContext';

const EMPTY = { turma_id: '', titulo: '', descricao: '', prazo: '' };

export default function Atividades() {
  const { user } = useAuth();
  const isProfessor = user?.tipo === 'professor';

  const [list, setList] = useState([]);
  const [turmasList, setTurmasList] = useState([]);
  const [alunosList, setAlunosList] = useState([]);

  // form state (criar / editar atividade)
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState({});
  const [loading, setLoading] = useState(false);

  // aluno: entrega rápida + mapa de suas entregas
  const [meuAlunoId, setMeuAlunoId] = useState(null);
  const [entregaForm, setEntregaForm] = useState({ atividade_id: '' });
  const [msgEnt, setMsgEnt] = useState({});
  const [minhasEntregas, setMinhasEntregas] = useState({}); // { atividade_id → entrega }

  // professor: painel de entregas expandido por atividade
  const [expandedId, setExpandedId] = useState(null);
  const [entregasAtividade, setEntregasAtividade] = useState([]); // entregas da atividade expandida
  const [notaInputs, setNotaInputs] = useState({}); // { entrega_id → valor }
  const [notaMsgs, setNotaMsgs] = useState({});     // { entrega_id → { type, text } }

  async function load() {
    try { setList(await atividades.list()); } catch { /* ignore */ }
    try { setTurmasList(await turmas.list()); } catch { /* ignore */ }
    if (isProfessor) {
      try { setAlunosList(await alunos.list()); } catch { /* ignore */ }
    }
  }

  async function loadMinhasEntregas(alunoId) {
    try {
      const entregas = await atividades.entregasPorAluno(alunoId);
      const map = {};
      for (const e of entregas) map[e.atividade_id] = e;
      setMinhasEntregas(map);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    if (user?.tipo === 'aluno') {
      alunos.list().then((todos) => {
        const eu = todos.find((a) => a.user_id === user?.id);
        if (eu) {
          setMeuAlunoId(eu.id);
          loadMinhasEntregas(eu.id);
        }
      }).catch(() => {});
    }
  }, []);

  // ── Professor: expandir entregas de uma atividade ──
  async function toggleEntregas(atividadeId) {
    if (expandedId === atividadeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(atividadeId);
    try {
      const data = await atividades.entregas(atividadeId);
      setEntregasAtividade(data);
      const inputs = {};
      for (const e of data) inputs[e.id] = e.nota !== null && e.nota !== undefined ? String(e.nota) : '';
      setNotaInputs(inputs);
      setNotaMsgs({});
    } catch { /* ignore */ }
  }

  async function handleLancarNota(entregaId) {
    const nota = parseFloat(notaInputs[entregaId]);
    if (isNaN(nota) || nota < 0 || nota > 10) {
      setNotaMsgs((m) => ({ ...m, [entregaId]: { type: 'error', text: 'Nota deve ser entre 0 e 10' } }));
      return;
    }
    try {
      await atividades.lancarNota(entregaId, { nota });
      setNotaMsgs((m) => ({ ...m, [entregaId]: { type: 'success', text: 'Salvo!' } }));
      // atualiza localmente
      setEntregasAtividade((prev) => prev.map((e) => e.id === entregaId ? { ...e, nota } : e));
    } catch (err) {
      setNotaMsgs((m) => ({ ...m, [entregaId]: { type: 'error', text: err.message } }));
    }
  }

  // ── Criar / Editar atividade ──
  function startEdit(a) {
    setEditing(a.id);
    const prazoLocal = a.prazo ? new Date(a.prazo).toISOString().slice(0, 16) : '';
    setForm({ turma_id: String(a.turma_id), titulo: a.titulo, descricao: a.descricao || '', prazo: prazoLocal });
    setMsg({});
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY);
    setMsg({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({});
    setLoading(true);
    const payload = { ...form, turma_id: Number(form.turma_id) };
    try {
      if (editing) {
        await atividades.update(editing, payload);
        setMsg({ type: 'success', text: 'Atividade atualizada!' });
      } else {
        await atividades.create(payload);
        setMsg({ type: 'success', text: 'Atividade criada!' });
      }
      setEditing(null);
      setForm(EMPTY);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover esta atividade?')) return;
    try {
      await atividades.remove(id);
      if (expandedId === id) setExpandedId(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  // ── Aluno: entregar ──
  async function handleEntrega(e) {
    e.preventDefault();
    setMsgEnt({});
    if (!meuAlunoId) return setMsgEnt({ type: 'error', text: 'Seu cadastro de aluno não foi encontrado.' });
    try {
      await atividades.entregar(entregaForm.atividade_id, { aluno_id: meuAlunoId });
      setMsgEnt({ type: 'success', text: 'Entrega registrada!' });
      setEntregaForm({ atividade_id: '' });
      loadMinhasEntregas(meuAlunoId);
    } catch (err) {
      setMsgEnt({ type: 'error', text: err.message });
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setEnt = (k) => (e) => setEntregaForm({ ...entregaForm, [k]: e.target.value });

  return (
    <div>
      <h2 style={styles.heading}>Atividades</h2>

      <div style={styles.layout}>
        {/* ── Coluna esquerda ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isProfessor && (
            <div className="card">
              <h3 style={styles.subheading}>{editing ? 'Editar atividade' : 'Criar atividade'}</h3>
              {msg.text && (
                <p className={msg.type === 'error' ? 'alert-error' : 'alert-success'} style={{ marginBottom: '1rem' }}>
                  {msg.text}
                </p>
              )}
              <form onSubmit={handleSubmit} style={styles.form}>
                <label style={styles.label}>Turma</label>
                <select required value={form.turma_id} onChange={set('turma_id')}>
                  <option value="">— Selecione —</option>
                  {turmasList.map((t) => <option key={t.id} value={t.id}>#{t.id} {t.disciplina_nome} — {t.semestre}</option>)}
                </select>
                <label style={styles.label}>Título</label>
                <input required value={form.titulo} onChange={set('titulo')} placeholder="Ex: Trabalho 1" />
                <label style={styles.label}>Descrição (opcional)</label>
                <textarea rows={3} value={form.descricao} onChange={set('descricao')} style={{ resize: 'vertical' }} />
                <label style={styles.label}>Prazo</label>
                <input required type="datetime-local" value={form.prazo} onChange={set('prazo')} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                    {loading ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
                  </button>
                  {editing && (
                    <button type="button" onClick={cancelEdit} style={styles.btnSecondary}>Cancelar</button>
                  )}
                </div>
              </form>
            </div>
          )}

          {user?.tipo === 'aluno' && (
            <div className="card">
              <h3 style={styles.subheading}>Entregar atividade</h3>
              {msgEnt.text && (
                <p className={msgEnt.type === 'error' ? 'alert-error' : 'alert-success'} style={{ marginBottom: '1rem' }}>
                  {msgEnt.text}
                </p>
              )}
              <form onSubmit={handleEntrega} style={styles.form}>
                <label style={styles.label}>Atividade</label>
                <select required value={entregaForm.atividade_id} onChange={setEnt('atividade_id')}>
                  <option value="">— Selecione —</option>
                  {list
                    .filter((a) => !minhasEntregas[a.id])
                    .map((a) => <option key={a.id} value={a.id}>#{a.id} {a.titulo}</option>)}
                </select>
                <button type="submit" className="btn-primary">Entregar</button>
              </form>
            </div>
          )}
        </div>

        {/* ── Coluna direita: lista ── */}
        <div className="card" style={{ flex: 2 }}>
          <h3 style={styles.subheading}>Lista de atividades ({list.length})</h3>
          {list.length === 0
            ? <p style={{ color: 'var(--muted)' }}>Nenhuma atividade cadastrada.</p>
            : (
              <table>
                <thead>
                  <tr>
                    {!isProfessor && <th style={{ width: 36 }}></th>}
                    <th>Título</th>
                    <th>Turma</th>
                    <th>Prazo</th>
                    {isProfessor && <th style={{ width: 150 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => {
                    const turma = turmasList.find((t) => t.id === a.turma_id);
                    const entrega = minhasEntregas[a.id];
                    const isExpanded = expandedId === a.id;

                    return (
                      <>
                        <tr key={a.id} style={editing === a.id ? { background: 'var(--surface-alt, #f0f4ff)' } : {}}>
                          {/* Ícone de status — apenas para aluno */}
                          {!isProfessor && (
                            <td style={{ textAlign: 'center' }}>
                              {entrega
                                ? <span title={`Entregue em ${new Date(entrega.data_entrega).toLocaleString('pt-BR')}`} style={styles.iconOk}>✓</span>
                                : <span title="Não entregue" style={styles.iconPending}>○</span>}
                            </td>
                          )}
                          <td>
                            <div style={{ fontWeight: 500 }}>{a.titulo}</div>
                            {/* Aluno: data de entrega e nota abaixo do título */}
                            {!isProfessor && entrega && (
                              <div style={styles.entregaInfo}>
                                Entregue: {new Date(entrega.data_entrega).toLocaleString('pt-BR')}
                                {entrega.nota !== null && entrega.nota !== undefined && (
                                  <span style={styles.notaBadge}>Nota: {Number(entrega.nota).toFixed(1)}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td>{turma ? `${turma.disciplina_nome} — ${turma.semestre}` : `#${a.turma_id}`}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                            {new Date(a.prazo).toLocaleString('pt-BR')}
                          </td>
                          {isProfessor && (
                            <td>
                              <div style={styles.actions}>
                                <button
                                  style={isExpanded ? styles.btnEntregasActive : styles.btnEntregas}
                                  onClick={() => toggleEntregas(a.id)}
                                >
                                  Entregas
                                </button>
                                <button style={styles.btnEdit} onClick={() => startEdit(a)}>Editar</button>
                                <button style={styles.btnDelete} onClick={() => handleDelete(a.id)}>✕</button>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Painel de entregas expandido — só professor */}
                        {isProfessor && isExpanded && (
                          <tr key={`${a.id}-entregas`}>
                            <td colSpan={4} style={styles.entregasPanel}>
                              <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                Entregas de "{a.titulo}"
                              </strong>
                              {entregasAtividade.length === 0
                                ? <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>Nenhuma entrega ainda.</p>
                                : (
                                  <table style={{ width: '100%' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', padding: '4px 8px' }}>Aluno</th>
                                        <th style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', padding: '4px 8px' }}>Data entrega</th>
                                        <th style={{ textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', padding: '4px 8px' }}>Nota (0–10)</th>
                                        <th></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {entregasAtividade.map((e) => {
                                        const aluno = alunosList.find((al) => al.id === e.aluno_id);
                                        const notaMsg = notaMsgs[e.id] || {};
                                        return (
                                          <tr key={e.id}>
                                            <td style={styles.entregaTd}>
                                              {aluno ? aluno.nome : `Aluno #${e.aluno_id}`}
                                            </td>
                                            <td style={{ ...styles.entregaTd, color: 'var(--muted)', fontSize: '0.8rem' }}>
                                              {new Date(e.data_entrega).toLocaleString('pt-BR')}
                                            </td>
                                            <td style={styles.entregaTd}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                step="0.1"
                                                value={notaInputs[e.id] ?? ''}
                                                onChange={(ev) => setNotaInputs((n) => ({ ...n, [e.id]: ev.target.value }))}
                                                style={styles.notaInput}
                                                placeholder="—"
                                              />
                                            </td>
                                            <td style={{ ...styles.entregaTd, minWidth: 100 }}>
                                              <button
                                                style={styles.btnSalvarNota}
                                                onClick={() => handleLancarNota(e.id)}
                                              >
                                                Salvar nota
                                              </button>
                                              {notaMsg.text && (
                                                <span style={{ fontSize: '0.75rem', marginLeft: 6, color: notaMsg.type === 'error' ? '#dc2626' : '#16a34a' }}>
                                                  {notaMsg.text}
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  heading: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' },
  subheading: { fontWeight: 600, marginBottom: '1rem' },
  layout: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  label: { fontSize: '0.85rem', fontWeight: 500, color: 'var(--muted)' },
  actions: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' },
  iconOk: { color: '#16a34a', fontWeight: 700, fontSize: '1rem' },
  iconPending: { color: '#9ca3af', fontWeight: 400, fontSize: '1rem' },
  entregaInfo: { fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 },
  notaBadge: {
    marginLeft: 8, background: '#f0fdf4', color: '#15803d',
    border: '1px solid #86efac', borderRadius: 4,
    padding: '1px 6px', fontSize: '0.75rem', fontWeight: 600,
  },
  entregasPanel: {
    background: 'var(--surface-alt, #f8fafc)',
    borderTop: '1px solid var(--border, #e5e7eb)',
    padding: '0.75rem 1rem',
  },
  entregaTd: { padding: '4px 8px', fontSize: '0.85rem' },
  notaInput: {
    width: 70, padding: '3px 6px', borderRadius: 5,
    border: '1px solid var(--border, #ddd)', fontSize: '0.85rem',
  },
  btnSalvarNota: {
    fontSize: '0.75rem', padding: '3px 8px', borderRadius: 5,
    border: '1px solid #16a34a', color: '#16a34a',
    background: 'transparent', cursor: 'pointer',
  },
  btnEntregas: {
    fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: 6,
    border: '1px solid var(--muted, #9ca3af)', color: 'var(--muted, #6b7280)',
    background: 'transparent', cursor: 'pointer',
  },
  btnEntregasActive: {
    fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: 6,
    border: '1px solid var(--primary, #4f46e5)', color: 'var(--primary, #4f46e5)',
    background: 'var(--primary-light, #ede9fe)', cursor: 'pointer',
  },
  btnEdit: {
    fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: 6,
    border: '1px solid var(--primary, #4f46e5)', color: 'var(--primary, #4f46e5)',
    background: 'transparent', cursor: 'pointer',
  },
  btnDelete: {
    fontSize: '0.78rem', padding: '0.25rem 0.5rem', borderRadius: 6,
    border: '1px solid #dc2626', color: '#dc2626',
    background: 'transparent', cursor: 'pointer',
  },
  btnSecondary: {
    padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border, #ddd)',
    background: 'transparent', cursor: 'pointer', fontWeight: 500,
  },
};
