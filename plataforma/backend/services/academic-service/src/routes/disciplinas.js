const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireProfessor } = require('../middleware/auth');

router.get('/', requireAuth, async (_req, res) => {
  const result = await pool.query(`
    SELECT d.*, p.nome AS professor_nome
    FROM disciplinas d
    LEFT JOIN professores p ON p.id = d.professor_id
    ORDER BY d.nome
  `);
  res.json(result.rows);
});

router.post('/', requireAuth, requireProfessor, async (req, res) => {
  const { nome, codigo, carga_horaria, professor_id } = req.body;
  if (!nome || !codigo || !carga_horaria)
    return res.status(400).json({ error: 'nome, codigo e carga_horaria são obrigatórios' });
  try {
    const result = await pool.query(
      'INSERT INTO disciplinas (nome, codigo, carga_horaria, professor_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [nome, codigo, carga_horaria, professor_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Código já cadastrado' });
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM disciplinas WHERE id=$1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
  res.json(result.rows[0]);
});

router.put('/:id', requireAuth, requireProfessor, async (req, res) => {
  const { nome, codigo, carga_horaria, professor_id } = req.body;
  if (!nome || !codigo || !carga_horaria)
    return res.status(400).json({ error: 'nome, codigo e carga_horaria são obrigatórios' });
  try {
    const result = await pool.query(
      'UPDATE disciplinas SET nome=$1, codigo=$2, carga_horaria=$3, professor_id=$4 WHERE id=$5 RETURNING *',
      [nome, codigo, carga_horaria, professor_id || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Código já cadastrado' });
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', requireAuth, requireProfessor, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM disciplinas WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno — verifique se há turmas vinculadas' });
  }
});

module.exports = router;
