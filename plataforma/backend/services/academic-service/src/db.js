const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS professores (
      id            SERIAL PRIMARY KEY,
      user_id       INT UNIQUE NOT NULL,
      nome          TEXT NOT NULL DEFAULT '',
      siape         TEXT UNIQUE NOT NULL,
      departamento  TEXT NOT NULL
    )
  `);
  await pool.query(`ALTER TABLE professores ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT ''`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alunos (
      id        SERIAL PRIMARY KEY,
      user_id   INT UNIQUE NOT NULL,
      nome      TEXT NOT NULL DEFAULT '',
      matricula TEXT UNIQUE NOT NULL,
      curso     TEXT NOT NULL
    )
  `);
  await pool.query(`ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT ''`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS disciplinas (
      id             SERIAL PRIMARY KEY,
      nome           TEXT NOT NULL,
      codigo         TEXT UNIQUE NOT NULL,
      carga_horaria  INT NOT NULL,
      professor_id   INT REFERENCES professores(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS turmas (
      id             SERIAL PRIMARY KEY,
      disciplina_id  INT NOT NULL REFERENCES disciplinas(id),
      semestre       TEXT NOT NULL,
      horario        TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS matriculas (
      id        SERIAL PRIMARY KEY,
      aluno_id  INT NOT NULL REFERENCES alunos(id),
      turma_id  INT NOT NULL REFERENCES turmas(id),
      data      DATE NOT NULL DEFAULT CURRENT_DATE,
      status    TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','trancada','concluida')),
      UNIQUE (aluno_id, turma_id)
    )
  `);
}

module.exports = { pool, init };
