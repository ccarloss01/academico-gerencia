const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('connect', (client) => {
  client.query('SET search_path TO academic');
});

async function init() {
  await pool.query('CREATE SCHEMA IF NOT EXISTS academic');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic.professores (
      id            SERIAL PRIMARY KEY,
      user_id       INT UNIQUE NOT NULL,
      nome          TEXT NOT NULL DEFAULT '',
      siape         TEXT UNIQUE NOT NULL,
      departamento  TEXT NOT NULL
    )
  `);
  await pool.query(`ALTER TABLE academic.professores ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT ''`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic.alunos (
      id        SERIAL PRIMARY KEY,
      user_id   INT UNIQUE NOT NULL,
      nome      TEXT NOT NULL DEFAULT '',
      matricula TEXT UNIQUE NOT NULL,
      curso     TEXT NOT NULL
    )
  `);
  await pool.query(`ALTER TABLE academic.alunos ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT ''`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic.disciplinas (
      id             SERIAL PRIMARY KEY,
      nome           TEXT NOT NULL,
      codigo         TEXT UNIQUE NOT NULL,
      carga_horaria  INT NOT NULL,
      professor_id   INT REFERENCES academic.professores(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic.turmas (
      id             SERIAL PRIMARY KEY,
      disciplina_id  INT NOT NULL REFERENCES academic.disciplinas(id),
      semestre       TEXT NOT NULL,
      horario        TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic.matriculas (
      id        SERIAL PRIMARY KEY,
      aluno_id  INT NOT NULL REFERENCES academic.alunos(id),
      turma_id  INT NOT NULL REFERENCES academic.turmas(id),
      data      DATE NOT NULL DEFAULT CURRENT_DATE,
      status    TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','trancada','concluida')),
      UNIQUE (aluno_id, turma_id)
    )
  `);
}

module.exports = { pool, init };
