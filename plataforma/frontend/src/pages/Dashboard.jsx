import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { alunos, turmas, atividades } from '../api';

function StatCard({ label, value, to }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div className="card" style={styles.statCard}>
        <p style={styles.statValue}>{value ?? '—'}</p>
        <p style={styles.statLabel}>{label}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    Promise.allSettled([
      alunos.list(),
      turmas.list(),
      atividades.list(),
    ]).then(([a, t, at]) => {
      setCounts({
        alunos: a.status === 'fulfilled' ? a.value.length : '—',
        turmas: t.status === 'fulfilled' ? t.value.length : '—',
        atividades: at.status === 'fulfilled' ? at.value.length : '—',
      });
    });
  }, []);

  return (
    <div>
      <h2 style={styles.heading}>Bem-vindo, {user?.email}</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Tipo de conta: <span className="badge">{user?.tipo}</span>
      </p>

      <div style={styles.grid}>
        <StatCard label="Alunos cadastrados" value={counts.alunos} to="/alunos" />
        <StatCard label="Turmas ativas" value={counts.turmas} to="/turmas" />
        <StatCard label="Atividades" value={counts.atividades} to="/atividades" />
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Acesso rápido</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {[
            { to: '/alunos', label: 'Gerenciar Alunos' },
            { to: '/professores', label: 'Gerenciar Professores' },
            { to: '/disciplinas', label: 'Gerenciar Disciplinas' },
            { to: '/turmas', label: 'Gerenciar Turmas' },
            { to: '/atividades', label: 'Gerenciar Atividades' },
          ].map((l) => (
            <Link key={l.to} to={l.to}>
              <button className="btn-ghost">{l.label}</button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  heading: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' },
  statCard: { cursor: 'pointer', transition: 'box-shadow 0.15s', textDecoration: 'none' },
  statValue: { fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)' },
  statLabel: { color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.25rem' },
};
