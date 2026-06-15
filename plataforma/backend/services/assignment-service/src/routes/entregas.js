const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/entregas', requireAuth, async (req, res) => {
  const { aluno_id } = req.query;
  if (!aluno_id) return res.status(400).json({ error: 'aluno_id é obrigatório' });
  const result = await pool.query(
    'SELECT * FROM entregas WHERE aluno_id=$1',
    [aluno_id]
  );
  res.json(result.rows);
});

router.post('/atividades/:id/entregas', requireAuth, async (req, res) => {
  const { aluno_id } = req.body;
  if (!aluno_id) return res.status(400).json({ error: 'aluno_id é obrigatório' });
  try {
    const result = await pool.query(
      'INSERT INTO entregas (atividade_id, aluno_id) VALUES ($1,$2) RETURNING *',
      [req.params.id, aluno_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Entrega já realizada' });
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.patch('/entregas/:id/nota', requireAuth, async (req, res) => {
  const { nota } = req.body;
  if (nota === undefined) return res.status(400).json({ error: 'nota é obrigatória' });
  const result = await pool.query(
    'UPDATE entregas SET nota=$1 WHERE id=$2 RETURNING *',
    [nota, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Entrega não encontrada' });
  res.json(result.rows[0]);
});

router.get('/atividades/:id/entregas', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM entregas WHERE atividade_id=$1 ORDER BY data_entrega',
    [req.params.id]
  );
  res.json(result.rows);
});

module.exports = router;
