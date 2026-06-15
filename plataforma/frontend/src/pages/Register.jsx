import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, alunos, professores } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', tipo: 'aluno', matricula: '', curso: '', siape: '', departamento: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await auth.register({ nome: form.nome, email: form.email, senha: form.senha, tipo: form.tipo });

      const session = await auth.login({ email: form.email, senha: form.senha });
      login(session.token, session.user);

      if (form.tipo === 'aluno') {
        await alunos.create({ user_id: user.id, nome: form.nome, matricula: form.matricula, curso: form.curso });
      } else {
        await professores.create({ user_id: user.id, nome: form.nome, siape: form.siape, departamento: form.departamento });
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div style={styles.page}>
      <div className="card" style={styles.card}>
        <h1 style={styles.title}>Criar conta</h1>
        {error && <p className="alert-error" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Nome completo</label>
          <input type="text" required value={form.nome} onChange={set('nome')} />

          <label style={styles.label}>E-mail</label>
          <input type="email" required value={form.email} onChange={set('email')} />

          <label style={styles.label}>Senha</label>
          <input type="password" required minLength={6} value={form.senha} onChange={set('senha')} />

          <label style={styles.label}>Tipo</label>
          <select value={form.tipo} onChange={set('tipo')}>
            <option value="aluno">Aluno</option>
            <option value="professor">Professor</option>
          </select>

          {form.tipo === 'aluno' && (
            <>
              <label style={styles.label}>Matrícula</label>
              <input required value={form.matricula} onChange={set('matricula')} placeholder="Ex: 2024001" />

              <label style={styles.label}>Curso</label>
              <input required value={form.curso} onChange={set('curso')} placeholder="Ex: Ciência da Computação" />
            </>
          )}

          {form.tipo === 'professor' && (
            <>
              <label style={styles.label}>SIAPE</label>
              <input required value={form.siape} onChange={set('siape')} placeholder="Ex: 1234567" />

              <label style={styles.label}>Departamento</label>
              <input required value={form.departamento} onChange={set('departamento')} placeholder="Ex: DCC" />
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '0.65rem' }}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' },
  card: { width: '100%', maxWidth: '420px' },
  title: { fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '1.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  label: { fontSize: '0.85rem', fontWeight: 500, color: 'var(--muted)' },
};
