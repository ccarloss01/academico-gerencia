const request = require('supertest');

process.env.TURSO_URL = 'file::memory:';
process.env.JWT_SECRET = 'test-secret';

jest.mock('../db', () => ({
  client: { execute: jest.fn() },
  init: jest.fn().mockResolvedValue(),
}));

const app = require('../index');
const { client } = require('../db');

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /auth/register', () => {
  it('returns 400 when fields missing', async () => {
    const res = await request(app).post('/auth/register').send({});
    expect(res.status).toBe(400);
  });

  it('creates user', async () => {
    client.execute.mockResolvedValueOnce({
      rows: [{ id: 1, nome: 'Ana', email: 'ana@test.com', tipo: 'aluno' }],
    });

    const res = await request(app)
      .post('/auth/register')
      .send({ nome: 'Ana', email: 'ana@test.com', senha: '123456', tipo: 'aluno' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('ana@test.com');
  });
});
