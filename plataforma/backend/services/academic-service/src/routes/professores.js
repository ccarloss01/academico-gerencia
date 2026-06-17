const router = require('express').Router();
const { client } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (_req, res) => {
  const result = await client.execute('SELECT * FROM professores ORDER BY nome');
  res.json(result.rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { user_id, nome, siape, departamento } = req.body;
  if (!user_id || !nome || !siape || !departamento)
    return res.status(400).json({ error: 'user_id, nome, siape e departamento são obrigatórios' });

  if (req.user.id !== Number(user_id) && req.user.tipo !== 'professor')
    return res.status(403).json({ error: 'Você só pode criar seu próprio cadastro de professor' });

  try {
    const result = await client.execute({
      sql: 'INSERT INTO professores (user_id, nome, siape, departamento) VALUES (?,?,?,?) RETURNING *',
      args: [user_id, nome, siape, departamento],
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'Professor já cadastrado' });
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  const result = await client.execute({
    sql: 'SELECT * FROM professores WHERE id=?',
    args: [req.params.id],
  });
  if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
  res.json(result.rows[0]);
});

module.exports = router;
