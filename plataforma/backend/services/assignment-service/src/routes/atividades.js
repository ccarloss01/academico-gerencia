const router = require('express').Router();
const axios = require('axios');
const { pool } = require('../db');
const { requireAuth, requireProfessor } = require('../middleware/auth');

const ACADEMIC_URL = process.env.ACADEMIC_SERVICE_URL || 'http://academic-service:3002';

router.get('/', requireAuth, async (req, res) => {
  const { turma_id } = req.query;
  const query = turma_id
    ? pool.query('SELECT * FROM atividades WHERE turma_id=$1 ORDER BY prazo', [turma_id])
    : pool.query('SELECT * FROM atividades ORDER BY prazo');
  const result = await query;
  res.json(result.rows);
});

router.post('/', requireAuth, requireProfessor, async (req, res) => {
  const { turma_id, titulo, descricao, prazo } = req.body;
  if (!turma_id || !titulo || !prazo)
    return res.status(400).json({ error: 'turma_id, titulo e prazo são obrigatórios' });

  try {
    await axios.get(`${ACADEMIC_URL}/turmas/${turma_id}`, {
      headers: { Authorization: req.headers.authorization },
    });
  } catch {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO atividades (turma_id, titulo, descricao, prazo) VALUES ($1,$2,$3,$4) RETURNING *',
      [turma_id, titulo, descricao || null, prazo]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM atividades WHERE id=$1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
  res.json(result.rows[0]);
});

router.put('/:id', requireAuth, requireProfessor, async (req, res) => {
  const { turma_id, titulo, descricao, prazo } = req.body;
  if (!turma_id || !titulo || !prazo)
    return res.status(400).json({ error: 'turma_id, titulo e prazo são obrigatórios' });
  try {
    const result = await pool.query(
      'UPDATE atividades SET turma_id=$1, titulo=$2, descricao=$3, prazo=$4 WHERE id=$5 RETURNING *',
      [turma_id, titulo, descricao || null, prazo, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', requireAuth, requireProfessor, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM atividades WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno — verifique se há entregas vinculadas' });
  }
});

module.exports = router;
