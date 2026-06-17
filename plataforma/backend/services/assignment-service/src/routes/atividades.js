const router = require('express').Router();
const axios = require('axios');
const { client } = require('../db');
const { requireAuth, requireProfessor } = require('../middleware/auth');

const ACADEMIC_URL = process.env.ACADEMIC_SERVICE_URL || 'http://academic-service:3002';

router.get('/', requireAuth, async (req, res) => {
  const { turma_id } = req.query;
  const result = turma_id
    ? await client.execute({ sql: 'SELECT * FROM atividades WHERE turma_id=? ORDER BY prazo', args: [turma_id] })
    : await client.execute('SELECT * FROM atividades ORDER BY prazo');
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
    const result = await client.execute({
      sql: 'INSERT INTO atividades (turma_id, titulo, descricao, prazo) VALUES (?,?,?,?) RETURNING *',
      args: [turma_id, titulo, descricao || null, prazo],
    });
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  const result = await client.execute({
    sql: 'SELECT * FROM atividades WHERE id=?',
    args: [req.params.id],
  });
  if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
  res.json(result.rows[0]);
});

router.put('/:id', requireAuth, requireProfessor, async (req, res) => {
  const { turma_id, titulo, descricao, prazo } = req.body;
  if (!turma_id || !titulo || !prazo)
    return res.status(400).json({ error: 'turma_id, titulo e prazo são obrigatórios' });
  try {
    const result = await client.execute({
      sql: 'UPDATE atividades SET turma_id=?, titulo=?, descricao=?, prazo=? WHERE id=? RETURNING *',
      args: [turma_id, titulo, descricao || null, prazo, req.params.id],
    });
    if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', requireAuth, requireProfessor, async (req, res) => {
  try {
    const result = await client.execute({
      sql: 'DELETE FROM atividades WHERE id=? RETURNING id',
      args: [req.params.id],
    });
    if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno — verifique se há entregas vinculadas' });
  }
});

module.exports = router;
