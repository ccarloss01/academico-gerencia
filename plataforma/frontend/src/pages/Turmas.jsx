import { useEffect, useState } from 'react';
import { turmas, disciplinas, alunos } from '../api';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { disciplina_id: '', semestre: '', horario: '' };

export default function Turmas() {
  const { user } = useAuth();
  const isAluno = user?.tipo === 'aluno';
  const isProfessor = user?.tipo === 'professor';
  const [list, setList] = useState([]);
  const [discs, setDiscs] = useState([]);
  const [alunosList, setAlunosList] = useState([]);
  const [minhasMatriculas, setMinhasMatriculas] = useState(new Set());
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [matriculaForm, setMatriculaForm] = useState({ turma_id: '', aluno_id: '' });
  const [msg, setMsg] = useState({});
  const [msgMat, setMsgMat] = useState({});
  const [loading, setLoading] = useState(false);
  const [meuAlunoId, setMeuAlunoId] = useState(null);

  async function load() {
    try { setList(await turmas.list()); } catch { /* ignore */ }
    try { setDiscs(await disciplinas.list()); } catch { /* ignore */ }

    if (isProfessor) {
      try { setAlunosList(await alunos.list()); } catch { /* ignore */ }
    } else {
      try {
        const todos = await alunos.list();
        const eu = todos.find((a) => a.user_id === user?.id);
        if (eu) {
          setMeuAlunoId(eu.id);
          const mats = await alunos.matriculas(eu.id);
          setMinhasMatriculas(new Set(mats.map((m) => m.turma_id)));
        }
      } catch { /* ignore */ }
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(t) {
    setEditing(t.id);
    setForm({ disciplina_id: String(t.disciplina_id), semestre: t.semestre, horario: t.horario });
    setMsg({});
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setMsg({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({});
    setLoading(true);
    const payload = { ...form, disciplina_id: Number(form.disciplina_id) };
    try {
      if (editing) {
        await turmas.update(editing, payload);
        setMsg({ type: 'success', text: 'Turma atualizada!' });
      } else {
        await turmas.create(payload);
        setMsg({ type: 'success', text: 'Turma criada!' });
      }
      setEditing(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover esta turma? Matrículas vinculadas também serão removidas.')) return;
    try {
      await turmas.remove(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleMatricula(e) {
    e.preventDefault();
    setMsgMat({});
    const aluno_id = isProfessor ? Number(matriculaForm.aluno_id) : meuAlunoId;
    if (!aluno_id) return setMsgMat({ type: 'error', text: 'Seu cadastro de aluno não foi encontrado.' });
    try {
      await turmas.matricular(matriculaForm.turma_id, { aluno_id });
      setMsgMat({ type: 'success', text: 'Matrícula realizada!' });
      setMatriculaForm({ turma_id: '', aluno_id: '' });
      load();
    } catch (err) {
      setMsgMat({ type: 'error', text: err.message });
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setMat = (k) => (e) => setMatriculaForm({ ...matriculaForm, [k]: e.target.value });

  return (
    <div>
      <h2 style={styles.heading}>Turmas</h2>

      <div style={styles.layout}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isAluno && (
            <div className="card">
              <h3 style={styles.subheading}>{editing ? 'Editar turma' : 'Criar turma'}</h3>
              {msg.text && (
                <p className={msg.type === 'error' ? 'alert-error' : 'alert-success'} style={{ marginBottom: '1rem' }}>
                  {msg.text}
                </p>
              )}
              <form onSubmit={handleSubmit} style={styles.form}>
                <label style={styles.label}>Disciplina</label>
                <select required value={form.disciplina_id} onChange={set('disciplina_id')}>
                  <option value="">— Selecione —</option>
                  {discs.map((d) => <option key={d.id} value={d.id}>{d.codigo} — {d.nome}</option>)}
                </select>
                <label style={styles.label}>Semestre</label>
                <input required value={form.semestre} onChange={set('semestre')} placeholder="Ex: 2024.1" />
                <label style={styles.label}>Horário</label>
                <input required value={form.horario} onChange={set('horario')} placeholder="Ex: Ter/Qui 10h" />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                    {loading ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
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

          <div className="card">
            <h3 style={styles.subheading}>
              {isAluno ? 'Solicitar matrícula' : 'Matricular aluno'}
            </h3>
            {msgMat.text && (
              <p className={msgMat.type === 'error' ? 'alert-error' : 'alert-success'} style={{ marginBottom: '1rem' }}>
                {msgMat.text}
              </p>
            )}
            <form onSubmit={handleMatricula} style={styles.form}>
              <label style={styles.label}>Turma</label>
              <select required value={matriculaForm.turma_id} onChange={setMat('turma_id')}>
                <option value="">— Selecione —</option>
                {list.map((t) => <option key={t.id} value={t.id}>{t.disciplina_nome} — {t.semestre}</option>)}
              </select>
              {!isAluno && (
                <>
                  <label style={styles.label}>Aluno</label>
                  <select required value={matriculaForm.aluno_id} onChange={setMat('aluno_id')}>
                    <option value="">— Selecione —</option>
                    {alunosList.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.matricula})</option>)}
                  </select>
                </>
              )}
              <button type="submit" className="btn-primary">
                {isAluno ? 'Solicitar matrícula' : 'Matricular'}
              </button>
            </form>
          </div>
        </div>

        <div className="card" style={{ flex: 2 }}>
          <h3 style={styles.subheading}>Lista de turmas ({list.length})</h3>
          {isAluno && (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              <span style={styles.iconMatriculado}>✓</span> matriculado &nbsp;
              <span style={styles.iconNaoMatriculado}>✗</span> não matriculado
            </p>
          )}
          {list.length === 0
            ? <p style={{ color: 'var(--muted)' }}>Nenhuma turma cadastrada.</p>
            : (
              <table>
                <thead>
                  <tr>
                    {isAluno && <th style={{ width: 40 }}></th>}
                    <th>Disciplina</th>
                    <th>Semestre</th>
                    <th>Horário</th>
                    {isProfessor && <th style={{ width: 110 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => {
                    const matriculado = minhasMatriculas.has(t.id);
                    return (
                      <tr key={t.id} style={editing === t.id ? { background: 'var(--surface-alt, #f0f4ff)' } : {}}>
                        {isAluno && (
                          <td style={{ textAlign: 'center' }}>
                            {matriculado
                              ? <span style={styles.iconMatriculado} title="Matriculado">✓</span>
                              : <span style={styles.iconNaoMatriculado} title="Não matriculado">✗</span>}
                          </td>
                        )}
                        <td>{t.disciplina_nome}</td>
                        <td><span className="badge">{t.semestre}</span></td>
                        <td>{t.horario}</td>
                        {isProfessor && (
                          <td>
                            <div style={styles.actions}>
                              <button style={styles.btnEdit} onClick={() => startEdit(t)}>Editar</button>
                              <button style={styles.btnDelete} onClick={() => handleDelete(t.id)}>Remover</button>
                            </div>
                          </td>
                        )}
                      </tr>
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
  iconMatriculado: { color: '#16a34a', fontWeight: 700, fontSize: '1rem' },
  iconNaoMatriculado: { color: '#dc2626', fontWeight: 700, fontSize: '1rem' },
};
