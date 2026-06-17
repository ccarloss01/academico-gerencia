const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_URL || 'file:./academic.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function init() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS professores (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER UNIQUE NOT NULL,
      nome         TEXT NOT NULL DEFAULT '',
      siape        TEXT UNIQUE NOT NULL,
      departamento TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS alunos (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER UNIQUE NOT NULL,
      nome      TEXT NOT NULL DEFAULT '',
      matricula TEXT UNIQUE NOT NULL,
      curso     TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS disciplinas (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome          TEXT NOT NULL,
      codigo        TEXT UNIQUE NOT NULL,
      carga_horaria INTEGER NOT NULL,
      professor_id  INTEGER REFERENCES professores(id)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS turmas (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      disciplina_id INTEGER NOT NULL REFERENCES disciplinas(id),
      semestre      TEXT NOT NULL,
      horario       TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS matriculas (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL REFERENCES alunos(id),
      turma_id INTEGER NOT NULL REFERENCES turmas(id),
      data     TEXT NOT NULL DEFAULT (date('now')),
      status   TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','trancada','concluida')),
      UNIQUE (aluno_id, turma_id)
    )
  `);
}

module.exports = { client, init };
