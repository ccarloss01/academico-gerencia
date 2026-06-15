import { useEffect, useState } from 'react';
import { alunos } from '../api';

export default function Alunos() {
  const [list, setList] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    alunos.list()
      .then(setList)
      .catch((err) => setLoadError(err.message));
  }, []);

  return (
    <div>
      <h2 style={styles.heading}>Alunos</h2>
      <div className="card">
        <h3 style={styles.subheading}>Alunos cadastrados ({list.length})</h3>
        {loadError && <p className="alert-error" style={{ marginBottom: '1rem' }}>Erro ao carregar: {loadError}</p>}
        {!loadError && list.length === 0 && (
          <p style={{ color: 'var(--muted)' }}>Nenhum aluno cadastrado ainda.</p>
        )}
        {list.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Matrícula</th>
                <th>Curso</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>{a.nome}</td>
                  <td>{a.matricula}</td>
                  <td>{a.curso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  heading: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' },
  subheading: { fontWeight: 600, marginBottom: '1rem' },
};
