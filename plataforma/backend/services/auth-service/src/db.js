const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      nome      TEXT NOT NULL,
      email     TEXT UNIQUE NOT NULL,
      senha     TEXT NOT NULL,
      tipo      TEXT NOT NULL CHECK (tipo IN ('aluno', 'professor')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

module.exports = { pool, init };
