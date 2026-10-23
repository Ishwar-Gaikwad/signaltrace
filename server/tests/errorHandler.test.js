import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Centralized Error Handling Middleware', () => {
  it('should return 400 Bad Request with JSON error envelope on malformed JSON payload', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"badJson": true,'); // intentional syntax error

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'INVALID_JSON_PAYLOAD');
    expect(res.body.error.message).toContain('Malformed JSON');
    expect(res.body).toHaveProperty('timestamp');
  });
});
