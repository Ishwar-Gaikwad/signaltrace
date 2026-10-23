import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Claim, IncidentReport, Evidence } from '../src/models/index.js';

describe('Phase 2 — Mongoose Model Validation & Constraints', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Clean up test-created non-synthetic records
    await Claim.deleteMany({ isSynthetic: false });
    await IncidentReport.deleteMany({ isSynthetic: false });
    await Evidence.deleteMany({ isSynthetic: false });
    await disconnectDB();
  });

  describe('Claim Model Validation', () => {
    it('should fail validation if required fields (originalText, sourcePlatform) are missing', async () => {
      const claim = new Claim({});
      let err;
      try {
        await claim.validate();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.originalText).toBeDefined();
      expect(err.errors.sourcePlatform).toBeDefined();
    });

    it('should default atomicClaims to an empty array and processingStatus to "pending"', async () => {
      const claim = new Claim({
        originalText: 'Test claim without atomic breakdown initially',
        sourcePlatform: 'twitter'
      });

      expect(claim.atomicClaims).toEqual([]);
      expect(claim.processingStatus).toBe('pending');
      expect(claim.isSynthetic).toBe(false);
      expect(claim.authorId).toBeNull();
      expect(claim.claimedLocation).toBeNull();
    });

    it('should reject invalid processingStatus values', async () => {
      const claim = new Claim({
        originalText: 'Valid text for testing status enum rejection',
        sourcePlatform: 'telegram',
        processingStatus: 'not_a_valid_status'
      });

      let err;
      try {
        await claim.validate();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.processingStatus).toBeDefined();
    });
  });

  describe('IncidentReport Model Validation & Uniqueness Constraint', () => {
    it('should fail validation when required incident report fields are missing', async () => {
      const incident = new IncidentReport({});
      let err;
      try {
        await incident.validate();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.sourceReportId).toBeDefined();
      expect(err.errors.sourceName).toBeDefined();
      expect(err.errors.sourceType).toBeDefined();
      expect(err.errors.eventType).toBeDefined();
      expect(err.errors.title).toBeDefined();
      expect(err.errors.description).toBeDefined();
    });

    it('should enforce compound uniqueness constraint on { sourceName, sourceReportId }', async () => {
      const uniqueSourceId = `TEST-UNIQUE-${Date.now()}`;
      const sourceName = 'Test Agency (Synthetic)';

      // Ensure indexes are synced
      await IncidentReport.syncIndexes();

      // Create first report
      await IncidentReport.create({
        sourceReportId: uniqueSourceId,
        sourceName,
        sourceType: 'official_agency',
        eventType: 'earthquake',
        title: 'Original Incident Alert',
        description: 'First alert for uniqueness test',
        isSynthetic: false
      });

      // Attempt creating duplicate with identical sourceName and sourceReportId
      let duplicateErr;
      try {
        await IncidentReport.create({
          sourceReportId: uniqueSourceId,
          sourceName,
          sourceType: 'official_agency',
          eventType: 'earthquake',
          title: 'Duplicate Alert Attempt',
          description: 'Should trigger duplicate key error',
          isSynthetic: false
        });
      } catch (error) {
        duplicateErr = error;
      }

      expect(duplicateErr).toBeDefined();
      expect(duplicateErr.code).toBe(11000); // MongoDB duplicate key error code
    });
  });

  describe('Evidence Model Validation', () => {
    it('should fail validation if claimId, role, or explanation are missing', async () => {
      const evidence = new Evidence({});
      let err;
      try {
        await evidence.validate();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.claimId).toBeDefined();
      expect(err.errors.role).toBeDefined();
      expect(err.errors.explanation).toBeDefined();
    });

    it('should reject invalid evidence roles', async () => {
      const evidence = new Evidence({
        claimId: new mongoose.Types.ObjectId(),
        role: 'invalid_role_xyz',
        explanation: 'Testing invalid role'
      });

      let err;
      try {
        await evidence.validate();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.role).toBeDefined();
    });
  });
});
