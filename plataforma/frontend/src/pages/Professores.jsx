import { useEffect, useState } from 'react';
import { professores } from '../api';

export default function Professores() {
  const [list, setList] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    professores.list()
      .then(setList)
      .catch((err) => setLoadError(err.message));
  }, []);

  return (
    <div>
      <h2 style={styles.heading}>Professores</h2>
      <div className="card">
        <h3 style={styles.subheading}>Professores cadastrados ({list.length})</h3>
        {loadError && <p className="alert-error" style={{ marginBottom: '1rem' }}>Erro ao carregar: {loadError}</p>}
        {!loadError && list.length === 0 && (
          <p style={{ color: 'var(--muted)' }}>Nenhum professor cadastrado ainda.</p>
        )}
        {list.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>SIAPE</th>
                <th>Departamento</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{p.siape}</td>
                  <td>{p.departamento}</td>
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
