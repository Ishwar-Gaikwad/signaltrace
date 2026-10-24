import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { seedSyntheticData } from '../src/services/seed.service.js';
import { Claim } from '../src/models/index.js';

describe('Phase 2 — Claims Read-Only API Endpoints', () => {
  let sampleClaimId;

  beforeAll(async () => {
    await connectDB();
    await seedSyntheticData();
    const claim = await Claim.findOne({ syntheticId: 'synth-claim-001' });
    sampleClaimId = claim._id.toString();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('GET /api/claims', () => {
    it('should return 200 with standard response envelope and pagination metadata', async () => {
      const res = await request(app).get('/api/claims?page=1&limit=5');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(5);

      expect(res.body).toHaveProperty('meta');
      const { meta } = res.body;
      expect(meta).toHaveProperty('page', 1);
      expect(meta).toHaveProperty('limit', 5);
      expect(meta).toHaveProperty('totalRecords');
      expect(meta.totalRecords).toBeGreaterThanOrEqual(6);
      expect(meta).toHaveProperty('totalPages');
      expect(meta).toHaveProperty('hasNextPage');
      expect(meta).toHaveProperty('hasPrevPage');
    });

    it('should return 400 when invalid page or limit parameters are supplied', async () => {
      const res1 = await request(app).get('/api/claims?page=0');
      expect(res1.status).toBe(400);
      expect(res1.body).toHaveProperty('success', false);
      expect(res1.body.error).toHaveProperty('code', 'INVALID_PAGINATION_PARAMETERS');

      const res2 = await request(app).get('/api/claims?limit=999');
      expect(res2.status).toBe(400);
      expect(res2.body.error).toHaveProperty('code', 'INVALID_PAGINATION_PARAMETERS');

      const res3 = await request(app).get('/api/claims?page=invalid');
      expect(res3.status).toBe(400);
      expect(res3.body.error).toHaveProperty('code', 'INVALID_PAGINATION_PARAMETERS');
    });

    it('should support filtering claims by processingStatus', async () => {
      const res = await request(app).get('/api/claims?status=pending');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((claim) => {
        expect(claim.processingStatus).toBe('pending');
      });
    });

    it('should support filtering claims by verification verdict', async () => {
      // Run verification on sample claim so it has Verified status
      await request(app).post(`/api/claims/${sampleClaimId}/verify`);

      const res = await request(app).get('/api/claims?verdict=Verified');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      res.body.data.forEach((claim) => {
        const hasVerified = claim.atomicClaims?.some((a) => a.verificationStatus === 'Verified');
        expect(hasVerified).toBe(true);
      });
    });
  });

  describe('GET /api/claims/:id', () => {
    it('should return 200 and include associated evidence items for a valid claim ID', async () => {
      const res = await request(app).get(`/api/claims/${sampleClaimId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', sampleClaimId);
      expect(res.body.data).toHaveProperty('originalText');
      expect(res.body.data).toHaveProperty('evidence');
      expect(Array.isArray(res.body.data.evidence)).toBe(true);
      expect(res.body.data.evidence.length).toBeGreaterThan(0);

      // Verify evidence item structure
      const firstEvidence = res.body.data.evidence[0];
      expect(firstEvidence).toHaveProperty('role', 'supporting');
      expect(firstEvidence).toHaveProperty('explanation');
      expect(firstEvidence).toHaveProperty('incidentReportIds');
    });

    it('should return 404 with RESOURCE_NOT_FOUND when valid ObjectId does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/claims/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
      expect(res.body.error.message).toContain(nonExistentId);
    });

    it('should return 400 with INVALID_IDENTIFIER when invalid ID format is passed', async () => {
      const res = await request(app).get('/api/claims/not-a-valid-hex-id-123');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'INVALID_IDENTIFIER');
    });
  });

  describe('POST /api/claims/:id/verify', () => {
    it('should verify an existing saved report and return its evidence details', async () => {
      const res = await request(app).post(`/api/claims/${sampleClaimId}/verify`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', sampleClaimId);
      expect(res.body.data.atomicClaims.length).toBeGreaterThan(0);
      expect(res.body.meta.verificationResults).toHaveLength(res.body.data.atomicClaims.length);
      expect(res.body.meta.verificationResults[0]).toHaveProperty('verificationStatus');
      expect(Array.isArray(res.body.meta.verificationResults[0].evidenceSummary)).toBe(true);
    });

    it('should return RESOURCE_NOT_FOUND for a nonexistent saved report', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).post(`/api/claims/${nonExistentId}/verify`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
    });
  });
});
