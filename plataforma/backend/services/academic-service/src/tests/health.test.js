process.env.TURSO_URL = 'file::memory:';
process.env.AUTH_SERVICE_URL = 'http://localhost:3001';

jest.mock('../db', () => ({ client: { execute: jest.fn() }, init: jest.fn().mockResolvedValue() }));

jest.mock('axios');

const request = require('supertest');
const app = require('../index');

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
