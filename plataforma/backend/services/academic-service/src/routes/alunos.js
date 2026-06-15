const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (_req, res) => {
  const result = await pool.query('SELECT * FROM alunos ORDER BY nome');
  res.json(result.rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { user_id, nome, matricula, curso } = req.body;
  if (!user_id || !nome || !matricula || !curso)
    return res.status(400).json({ error: 'user_id, nome, matricula e curso são obrigatórios' });
  if (req.user.id !== Number(user_id) && req.user.tipo !== 'professor')
    return res.status(403).json({ error: 'Você só pode criar seu próprio cadastro de aluno' });
  try {
    const result = await pool.query(
      'INSERT INTO alunos (user_id, nome, matricula, curso) VALUES ($1,$2,$3,$4) RETURNING *',
      [user_id, nome, matricula, curso]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Aluno já cadastrado' });
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM alunos WHERE id=$1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
  res.json(result.rows[0]);
});

router.get('/:id/matriculas', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT m.*, t.semestre, t.horario, d.nome AS disciplina_nome
     FROM matriculas m
     JOIN turmas t ON t.id = m.turma_id
     JOIN disciplinas d ON d.id = t.disciplina_id
     WHERE m.aluno_id = $1`,
    [req.params.id]
  );
  res.json(result.rows);
});

module.exports = router;
