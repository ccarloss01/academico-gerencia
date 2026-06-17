const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_URL || 'file:./auth.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function init() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT NOT NULL,
      email      TEXT UNIQUE NOT NULL,
      senha      TEXT NOT NULL,
      tipo       TEXT NOT NULL CHECK (tipo IN ('aluno', 'professor')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

module.exports = { client, init };
