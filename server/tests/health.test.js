import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/health', () => {
  it('should return 200 OK with standardized JSON envelope', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('data');
  });

  it('should return operational health metrics and system info', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    const { data } = res.body;

    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('service', 'SignalTrace — VeriAlert API');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('environment');
    expect(data).toHaveProperty('uptimeSeconds');
    expect(typeof data.uptimeSeconds).toBe('number');
    expect(data).toHaveProperty('database');
    expect(data.database).toHaveProperty('status');
    expect(data).toHaveProperty('system');
    expect(data.system).toHaveProperty('nodeVersion');
  });

  it('should return valid ISO-8601 timestamps', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    const topLevelDate = new Date(res.body.timestamp);
    expect(topLevelDate.toISOString()).toBe(res.body.timestamp);

    const dataDate = new Date(res.body.data.timestamp);
    expect(dataDate.toISOString()).toBe(res.body.data.timestamp);
  });
});
