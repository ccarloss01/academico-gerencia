require('dotenv').config();
const express = require('express');
const { init } = require('./db');
const { register, metricsMiddleware } = require('./metrics');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(metricsMiddleware);

app.use((req, _res, next) => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), method: req.method, path: req.path }));
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'assignment-service' }));
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/atividades', require('./routes/atividades'));
app.use('/', require('./routes/entregas'));

const PORT = process.env.PORT || 3003;

init()
  .then(() => app.listen(PORT, () => console.log(`assignment-service running on port ${PORT}`)))
  .catch(err => { console.error('DB init failed', err); process.exit(1); });

module.exports = app;
