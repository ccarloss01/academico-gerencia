import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Alunos from './pages/Alunos';
import Professores from './pages/Professores';
import Disciplinas from './pages/Disciplinas';
import Turmas from './pages/Turmas';
import Atividades from './pages/Atividades';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {children}
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
        <Route path="/alunos" element={<Protected><Layout><Alunos /></Layout></Protected>} />
        <Route path="/professores" element={<Protected><Layout><Professores /></Layout></Protected>} />
        <Route path="/disciplinas" element={<Protected><Layout><Disciplinas /></Layout></Protected>} />
        <Route path="/turmas" element={<Protected><Layout><Turmas /></Layout></Protected>} />
        <Route path="/atividades" element={<Protected><Layout><Atividades /></Layout></Protected>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
