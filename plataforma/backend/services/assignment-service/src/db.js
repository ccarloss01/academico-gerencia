const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS atividades (
      id        SERIAL PRIMARY KEY,
      turma_id  INT NOT NULL,
      titulo    TEXT NOT NULL,
      descricao TEXT,
      prazo     TIMESTAMPTZ NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entregas (
      id           SERIAL PRIMARY KEY,
      atividade_id INT NOT NULL REFERENCES atividades(id),
      aluno_id     INT NOT NULL,
      data_entrega TIMESTAMPTZ DEFAULT NOW(),
      nota         NUMERIC(5,2),
      UNIQUE (atividade_id, aluno_id)
    )
  `);
}

module.exports = { pool, init };
