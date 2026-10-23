import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Claim } from '../src/models/index.js';

describe('Phase 3 — POST /api/claims/extract Integration Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Clean up claims created in this test suite
    await Claim.deleteMany({ sourcePlatform: 'test-extraction-suite' });
    await disconnectDB();
  });

  describe('Successful Extraction & Persistence', () => {
    it('should ingest a multi-claim post, extract atomic claims, and return 201 Created', async () => {
      const payload = {
        text: 'Flooding has submerged three villages near Nashik. The main bridge collapsed yesterday. 200 families have been evacuated.',
        sourcePlatform: 'test-extraction-suite',
        authorId: '@nashik_reporter'
      };

      const res = await request(app).post('/api/claims/extract').send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');

      const savedClaim = res.body.data;
      expect(savedClaim).toHaveProperty('_id');
      // Verify original post is preserved verbatim
      expect(savedClaim.originalText).toBe(payload.text);
      expect(savedClaim.sourcePlatform).toBe('test-extraction-suite');
      expect(savedClaim.authorId).toBe('@nashik_reporter');
      expect(savedClaim.processingStatus).toBe('completed');

      // Verify atomic claims array
      expect(Array.isArray(savedClaim.atomicClaims)).toBe(true);
      expect(savedClaim.atomicClaims.length).toBe(3);

      expect(savedClaim.atomicClaims[0].text).toBe('Flooding has submerged three villages near Nashik.');
      expect(savedClaim.atomicClaims[0].atomicClaimId).toBe('ac-1');

      expect(savedClaim.atomicClaims[1].text).toBe('The main bridge collapsed yesterday.');
      expect(savedClaim.atomicClaims[1].atomicClaimId).toBe('ac-2');

      expect(savedClaim.atomicClaims[2].text).toBe('200 families have been evacuated.');
      expect(savedClaim.atomicClaims[2].atomicClaimId).toBe('ac-3');

      // Verify metadata envelope
      expect(res.body.meta).toHaveProperty('extractedClaimCount', 3);
      expect(res.body.meta).toHaveProperty('extractionMethod');

      // Verify that NO final verification verdict is assigned during extraction.
      // Phase 4 adds verificationStatus with a 'pending' default — 'pending' is acceptable here.
      expect(savedClaim).not.toHaveProperty('verdict');
      savedClaim.atomicClaims.forEach((ac) => {
        expect(ac).not.toHaveProperty('verdict');
        // verificationStatus may be 'pending' (Phase 4 schema default) but must NOT be a final verdict
        if (ac.verificationStatus !== undefined) {
          expect(ac.verificationStatus).toBe('pending');
        }
      });
    });

    it('should ingest and extract a single-claim post', async () => {
      const payload = {
        text: 'Water levels at Gangapur dam are within normal operating capacity.',
        sourcePlatform: 'test-extraction-suite'
      };

      const res = await request(app).post('/api/claims/extract').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.atomicClaims.length).toBe(1);
      expect(res.body.data.atomicClaims[0].text).toBe(payload.text);
      expect(res.body.data.processingStatus).toBe('completed');
    });

    it('should persist the extracted claims directly in MongoDB verifiable via GET /api/claims/:id', async () => {
      const payload = {
        text: 'Earthquake tremors felt in Koyna valley. No major structural cracks reported by local dam police.',
        sourcePlatform: 'test-extraction-suite'
      };

      const extractRes = await request(app).post('/api/claims/extract').send(payload);
      expect(extractRes.status).toBe(201);
      const claimId = extractRes.body.data._id;

      // Query via existing GET endpoint from Phase 2
      const getRes = await request(app).get(`/api/claims/${claimId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.originalText).toBe(payload.text);
      expect(getRes.body.data.atomicClaims.length).toBe(2);
      expect(getRes.body.data.processingStatus).toBe('completed');
    });
  });

  describe('Validation & Error Scenarios', () => {
    it('should return 400 Bad Request when "text" is missing', async () => {
      const res = await request(app).post('/api/claims/extract').send({
        sourcePlatform: 'test-extraction-suite'
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'INVALID_INPUT_TEXT');
      expect(res.body.error.message).toContain('required');
    });

    it('should return 400 Bad Request when "text" is empty or whitespace-only', async () => {
      const res1 = await request(app).post('/api/claims/extract').send({ text: '' });
      expect(res1.status).toBe(400);
      expect(res1.body.error).toHaveProperty('code', 'INVALID_INPUT_TEXT');

      const res2 = await request(app).post('/api/claims/extract').send({ text: '   \n  \t  ' });
      expect(res2.status).toBe(400);
      expect(res2.body.error).toHaveProperty('code', 'INVALID_INPUT_TEXT');
    });

    it('should return 400 Bad Request when "text" is too short', async () => {
      const res = await request(app).post('/api/claims/extract').send({ text: 'No' });
      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'TEXT_TOO_SHORT');
    });

    it('should return 400 Bad Request when "text" exceeds 2000 characters', async () => {
      const hugeText = 'River level rising! '.repeat(120); // ~2400 chars
      const res = await request(app).post('/api/claims/extract').send({ text: hugeText });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'TEXT_TOO_LONG');
      expect(res.body.error.message).toContain('maximum allowed length');
    });

    it('should return 400 Bad Request for malformed JSON request body', async () => {
      const res = await request(app)
        .post('/api/claims/extract')
        .set('Content-Type', 'application/json')
        .send('{"badJson": ');

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'INVALID_JSON_PAYLOAD');
    });
  });
});
