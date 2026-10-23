import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('404 Route Not Found Handler', () => {
  it('should return 404 with standardized JSON error payload for unknown API routes', async () => {
    const res = await request(app).get('/api/unknown-endpoint-xyz');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error.message).toContain('/api/unknown-endpoint-xyz');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('should return 404 for unsupported HTTP methods on health endpoint', async () => {
    const res = await request(app).delete('/api/health');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
  });
});
