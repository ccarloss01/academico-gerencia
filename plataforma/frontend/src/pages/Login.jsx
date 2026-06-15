import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await auth.login(form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div className="card" style={styles.card}>
        <h1 style={styles.title}>Plataforma Acadêmica</h1>
        <p style={styles.subtitle}>Entre com sua conta</p>
        {error && <p className="alert-error" style={{ marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>E-mail</label>
          <input
            type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <label style={styles.label}>Senha</label>
          <input
            type="password" required value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
          />
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '0.65rem' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
          Não tem conta? <Link to="/register">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' },
  card: { width: '100%', maxWidth: '400px' },
  title: { fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.25rem' },
  subtitle: { color: 'var(--muted)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  label: { fontSize: '0.85rem', fontWeight: 500, color: 'var(--muted)' },
};
