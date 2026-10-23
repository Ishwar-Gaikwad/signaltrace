import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Schema for an individual excerpt extracted from an incident report or authoritative bulletin
 */
const ExcerptSchema = new Schema(
  {
    excerptText: {
      type: String,
      required: true,
      trim: true
    },
    sourceRef: {
      type: String,
      default: null,
      trim: true
    },
    sourceName: {
      type: String,
      default: null,
      trim: true
    },
    url: {
      type: String,
      default: null,
      trim: true
    }
  },
  { _id: false }
);

/**
 * Geographic relevance schema
 */
const GeographicRelevanceSchema = new Schema(
  {
    locationMatched: {
      type: Boolean,
      default: null
    },
    distanceKm: {
      type: Number,
      default: null,
      min: 0
    },
    notes: {
      type: String,
      default: null,
      trim: true
    }
  },
  { _id: false }
);

/**
 * Evidence Schema
 * Represents evidence items associated with a specific claim or atomic claim.
 * NOTE: Automated final verdicts are NOT assigned here in Phase 2.
 */
const EvidenceSchema = new Schema(
  {
    claimId: {
      type: Schema.Types.ObjectId,
      ref: 'Claim',
      required: [true, 'claimId is required'],
      index: true
    },
    atomicClaimId: {
      type: String,
      default: null,
      trim: true
    },
    incidentReportIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'IncidentReport'
        }
      ],
      default: []
    },
    excerpts: {
      type: [ExcerptSchema],
      default: []
    },
    role: {
      type: String,
      required: [true, 'role is required'],
      enum: {
        values: ['supporting', 'contradicting', 'contextual', 'insufficient'],
        message: 'Invalid evidence role: {VALUE}'
      }
    },
    evidenceTimestamp: {
      type: Date,
      default: null
    },
    geographicRelevance: {
      type: GeographicRelevanceSchema,
      default: null
    },
    explanation: {
      type: String,
      required: [true, 'explanation is required'],
      trim: true
    },
    /**
     * When true, this contradicting evidence record asserts that a newer authoritative
     * update explicitly cancels, expires, or supersedes an earlier alert or directive
     * that the parent claim was referencing. Used by the verification engine as the
     * structural anchor for OUTDATED verdict classification.
     *
     * Must be set explicitly by the evidence curator / seeder; defaults to false.
     * Only meaningful when role === 'contradicting'.
     */
    supersedes: {
      type: Boolean,
      default: false
    },
    isSynthetic: {
      type: Boolean,
      default: false
    },
    syntheticId: {
      type: String,
      default: undefined,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
EvidenceSchema.index({ claimId: 1, role: 1 });
EvidenceSchema.index({ incidentReportIds: 1 });
EvidenceSchema.index({ isSynthetic: 1 });
EvidenceSchema.index({ syntheticId: 1 }, { unique: true, sparse: true });

export const Evidence = mongoose.models.Evidence || mongoose.model('Evidence', EvidenceSchema);
export default Evidence;
