import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/alunos', label: 'Alunos' },
  { to: '/professores', label: 'Professores' },
  { to: '/disciplinas', label: 'Disciplinas' },
  { to: '/turmas', label: 'Turmas' },
  { to: '/atividades', label: 'Atividades' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>Acadêmico</span>
      <div style={styles.links}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.active : {}) })}
          >
            {l.label}
          </NavLink>
        ))}
      </div>
      <div style={styles.user}>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{user?.email}</span>
        <button onClick={handleLogout} className="btn-ghost" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}>
          Sair
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    background: '#1e293b', padding: '0 1.5rem', height: '56px',
    position: 'sticky', top: 0, zIndex: 100,
  },
  brand: { color: '#f8fafc', fontWeight: 700, fontSize: '1.1rem', marginRight: '1rem', whiteSpace: 'nowrap' },
  links: { display: 'flex', gap: '0.25rem', flex: 1 },
  link: { color: '#94a3b8', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem', textDecoration: 'none' },
  active: { color: '#f8fafc', background: 'rgba(255,255,255,0.1)' },
  user: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
};
