const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireProfessor } = require('../middleware/auth');

router.get('/', requireAuth, async (_req, res) => {
  const result = await pool.query(
    `SELECT t.*, d.nome AS disciplina_nome FROM turmas t
     JOIN disciplinas d ON d.id = t.disciplina_id`
  );
  res.json(result.rows);
});

router.post('/', requireAuth, requireProfessor, async (req, res) => {
  const { disciplina_id, semestre, horario } = req.body;
  if (!disciplina_id || !semestre || !horario)
    return res.status(400).json({ error: 'disciplina_id, semestre e horario são obrigatórios' });
  try {
    const result = await pool.query(
      'INSERT INTO turmas (disciplina_id, semestre, horario) VALUES ($1,$2,$3) RETURNING *',
      [disciplina_id, semestre, horario]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM turmas WHERE id=$1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
  res.json(result.rows[0]);
});

router.put('/:id', requireAuth, requireProfessor, async (req, res) => {
  const { disciplina_id, semestre, horario } = req.body;
  if (!disciplina_id || !semestre || !horario)
    return res.status(400).json({ error: 'disciplina_id, semestre e horario são obrigatórios' });
  try {
    const result = await pool.query(
      'UPDATE turmas SET disciplina_id=$1, semestre=$2, horario=$3 WHERE id=$4 RETURNING *',
      [disciplina_id, semestre, horario, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', requireAuth, requireProfessor, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM turmas WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno — verifique se há matrículas vinculadas' });
  }
});

router.post('/:id/matriculas', requireAuth, async (req, res) => {
  const { aluno_id } = req.body;
  if (!aluno_id) return res.status(400).json({ error: 'aluno_id é obrigatório' });
  try {
    const result = await pool.query(
      'INSERT INTO matriculas (aluno_id, turma_id) VALUES ($1,$2) RETURNING *',
      [aluno_id, req.params.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Aluno já matriculado nesta turma' });
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id/matriculas', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT m.*, a.nome, a.matricula, a.curso
     FROM matriculas m JOIN alunos a ON a.id = m.aluno_id
     WHERE m.turma_id=$1 ORDER BY a.nome`,
    [req.params.id]
  );
  res.json(result.rows);
});

module.exports = router;
