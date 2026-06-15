require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { init } = require('./db');
const { register, metricsMiddleware } = require('./metrics');

const app = express();
app.use(cors());
app.use(express.json());

app.use(metricsMiddleware);

app.use((req, _res, next) => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), method: req.method, path: req.path }));
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'academic-service' }));
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/alunos', require('./routes/alunos'));
app.use('/professores', require('./routes/professores'));
app.use('/disciplinas', require('./routes/disciplinas'));
app.use('/turmas', require('./routes/turmas'));

const PORT = process.env.PORT || 3002;

init()
  .then(() => app.listen(PORT, () => console.log(`academic-service running on port ${PORT}`)))
  .catch(err => { console.error('DB init failed', err); process.exit(1); });

module.exports = app;
