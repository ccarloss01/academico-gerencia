const router = require('express').Router();
const { client } = require('../db');
const { requireAuth, requireProfessor } = require('../middleware/auth');

router.get('/', requireAuth, async (_req, res) => {
  const result = await client.execute(`
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
    const result = await client.execute({
      sql: 'INSERT INTO disciplinas (nome, codigo, carga_horaria, professor_id) VALUES (?,?,?,?) RETURNING *',
      args: [nome, codigo, carga_horaria, professor_id || null],
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'Código já cadastrado' });
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  const result = await client.execute({
    sql: 'SELECT * FROM disciplinas WHERE id=?',
    args: [req.params.id],
  });
  if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
  res.json(result.rows[0]);
});

router.put('/:id', requireAuth, requireProfessor, async (req, res) => {
  const { nome, codigo, carga_horaria, professor_id } = req.body;
  if (!nome || !codigo || !carga_horaria)
    return res.status(400).json({ error: 'nome, codigo e carga_horaria são obrigatórios' });
  try {
    const result = await client.execute({
      sql: 'UPDATE disciplinas SET nome=?, codigo=?, carga_horaria=?, professor_id=? WHERE id=? RETURNING *',
      args: [nome, codigo, carga_horaria, professor_id || null, req.params.id],
    });
    if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'Código já cadastrado' });
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', requireAuth, requireProfessor, async (req, res) => {
  try {
    const result = await client.execute({
      sql: 'DELETE FROM disciplinas WHERE id=? RETURNING id',
      args: [req.params.id],
    });
    if (!result.rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno — verifique se há turmas vinculadas' });
  }
});

module.exports = router;
