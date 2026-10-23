import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { seedSyntheticData } from '../src/services/seed.service.js';

describe('Phase 2 — Incident Reports Read-Only API Endpoints', () => {
  beforeAll(async () => {
    await connectDB();
    await seedSyntheticData();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('GET /api/incidents', () => {
    it('should return 200 with paginated incident reports and standard envelope', async () => {
      const res = await request(app).get('/api/incidents?page=1&limit=4');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(4);

      expect(res.body).toHaveProperty('meta');
      const { meta } = res.body;
      expect(meta).toHaveProperty('page', 1);
      expect(meta).toHaveProperty('limit', 4);
      expect(meta).toHaveProperty('totalRecords');
      expect(meta.totalRecords).toBeGreaterThanOrEqual(7);
      expect(meta).toHaveProperty('totalPages');
    });

    it('should exclude internal rawPayload from public incident list items', async () => {
      const res = await request(app).get('/api/incidents?limit=10');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((incident) => {
        expect(incident.rawPayload).toBeUndefined();
      });
    });

    it('should support filtering incidents by eventType', async () => {
      const res = await request(app).get('/api/incidents?eventType=flood');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((incident) => {
        expect(incident.eventType).toBe('flood');
      });
    });

    it('should support filtering incidents by severity', async () => {
      const res = await request(app).get('/api/incidents?severity=severe');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((incident) => {
        expect(incident.severity).toBe('severe');
      });
    });

    it('should return 400 when invalid pagination parameters are passed', async () => {
      const res = await request(app).get('/api/incidents?limit=-5');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'INVALID_PAGINATION_PARAMETERS');
    });
  });
});
