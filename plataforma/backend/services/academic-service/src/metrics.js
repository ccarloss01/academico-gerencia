const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'academic_' });

const httpDuration = new client.Histogram({
  name: 'academic_http_request_duration_seconds',
  help: 'Duração das requisições HTTP do academic-service',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

const httpTotal = new client.Counter({
  name: 'academic_http_requests_total',
  help: 'Total de requisições HTTP do academic-service',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path ?? req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    httpDuration.observe(labels, duration);
    httpTotal.inc(labels);
  });
  next();
}

module.exports = { register, metricsMiddleware };
