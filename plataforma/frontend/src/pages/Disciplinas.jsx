import { useEffect, useState } from 'react';
import { disciplinas, professores } from '../api';
import { useAuth } from '../context/AuthContext';

const EMPTY = { nome: '', codigo: '', carga_horaria: '', professor_id: '' };

export default function Disciplinas() {
  const { user } = useAuth();
  const isProfessor = user?.tipo === 'professor';
  const [list, setList] = useState([]);
  const [profs, setProfs] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // id being edited, or null
  const [msg, setMsg] = useState({});
  const [loading, setLoading] = useState(false);

  async function load() {
    try { setList(await disciplinas.list()); } catch { /* ignore */ }
    try { setProfs(await professores.list()); } catch { /* ignore */ }
  }

  useEffect(() => { load(); }, []);

  function startEdit(d) {
    setEditing(d.id);
    setForm({
      nome: d.nome,
      codigo: d.codigo,
      carga_horaria: String(d.carga_horaria),
      professor_id: d.professor_id ? String(d.professor_id) : '',
    });
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
    const payload = {
      ...form,
      carga_horaria: Number(form.carga_horaria),
      professor_id: form.professor_id ? Number(form.professor_id) : undefined,
    };
    try {
      if (editing) {
        await disciplinas.update(editing, payload);
        setMsg({ type: 'success', text: 'Disciplina atualizada!' });
      } else {
        await disciplinas.create(payload);
        setMsg({ type: 'success', text: 'Disciplina cadastrada!' });
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
    if (!window.confirm('Remover esta disciplina?')) return;
    try {
      await disciplinas.remove(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <h2 style={styles.heading}>Disciplinas</h2>
      <div style={styles.layout}>
        {isProfessor && (
          <div className="card" style={{ flex: 1 }}>
            <h3 style={styles.subheading}>{editing ? 'Editar disciplina' : 'Cadastrar disciplina'}</h3>
            {msg.text && (
              <p className={msg.type === 'error' ? 'alert-error' : 'alert-success'} style={{ marginBottom: '1rem' }}>
                {msg.text}
              </p>
            )}
            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>Nome</label>
              <input required value={form.nome} onChange={set('nome')} placeholder="Ex: Engenharia de Software" />
              <label style={styles.label}>Código</label>
              <input required value={form.codigo} onChange={set('codigo')} placeholder="Ex: ES101" />
              <label style={styles.label}>Carga horária (h)</label>
              <input required type="number" min="1" value={form.carga_horaria} onChange={set('carga_horaria')} />
              <label style={styles.label}>Professor (opcional)</label>
              <select value={form.professor_id} onChange={set('professor_id')}>
                <option value="">— Selecione —</option>
                {profs.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome} (SIAPE {p.siape})</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Salvando...' : editing ? 'Atualizar' : 'Cadastrar'}
                </button>
                {editing && (
                  <button type="button" onClick={cancelEdit} style={styles.btnSecondary}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ flex: 2 }}>
          <h3 style={styles.subheading}>Lista de disciplinas ({list.length})</h3>
          {list.length === 0
            ? <p style={{ color: 'var(--muted)' }}>Nenhuma disciplina cadastrada.</p>
            : (
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>C.H.</th>
                    <th>Professor</th>
                    {isProfessor && <th style={{ width: 110 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => (
                    <tr key={d.id} style={editing === d.id ? { background: 'var(--surface-alt, #f0f4ff)' } : {}}>
                      <td><span className="badge">{d.codigo}</span></td>
                      <td>{d.nome}</td>
                      <td>{d.carga_horaria}h</td>
                      <td>{d.professor_nome || '—'}</td>
                      {isProfessor && (
                        <td>
                          <div style={styles.actions}>
                            <button style={styles.btnEdit} onClick={() => startEdit(d)}>Editar</button>
                            <button style={styles.btnDelete} onClick={() => handleDelete(d.id)}>Remover</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
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
  actions: { display: 'flex', gap: '0.35rem' },
  btnEdit: {
    fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: 6,
    border: '1px solid var(--primary, #4f46e5)', color: 'var(--primary, #4f46e5)',
    background: 'transparent', cursor: 'pointer',
  },
  btnDelete: {
    fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: 6,
    border: '1px solid #dc2626', color: '#dc2626',
    background: 'transparent', cursor: 'pointer',
  },
  btnSecondary: {
    padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border, #ddd)',
    background: 'transparent', cursor: 'pointer', fontWeight: 500,
  },
};
