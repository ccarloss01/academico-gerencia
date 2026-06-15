const axios = require('axios');

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try {
    const { data } = await axios.get(`${AUTH_URL}/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!data.valid) return res.status(401).json({ error: 'Token inválido' });
    req.user = data.user;
    next();
  } catch (err) {
    if (err.response) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.error('auth-service unreachable:', err.message);
    res.status(503).json({ error: 'Serviço de autenticação indisponível' });
  }
}

function requireProfessor(req, res, next) {
  if (req.user?.tipo !== 'professor')
    return res.status(403).json({ error: 'Acesso restrito a professores' });
  next();
}

module.exports = { requireAuth, requireProfessor };
