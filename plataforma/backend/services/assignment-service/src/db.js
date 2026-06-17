const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_URL || 'file:./assignment.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function init() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS atividades (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      turma_id  INTEGER NOT NULL,
      titulo    TEXT NOT NULL,
      descricao TEXT,
      prazo     TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS entregas (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      atividade_id INTEGER NOT NULL REFERENCES atividades(id),
      aluno_id     INTEGER NOT NULL,
      data_entrega TEXT DEFAULT CURRENT_TIMESTAMP,
      nota         REAL,
      UNIQUE (atividade_id, aluno_id)
    )
  `);
}

module.exports = { client, init };
