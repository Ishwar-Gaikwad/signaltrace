import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Sub-schema for atomic claims extracted from a social media post or message
 * Each atomic claim expresses one independently verifiable assertion.
 */
const AtomicClaimSchema = new Schema(
  {
    atomicClaimId: {
      type: String,
      required: true,
      trim: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    // Maintained for backward-compatibility with Phase 2 synthetic dataset & tests
    claimText: {
      type: String,
      trim: true,
      default: function () {
        return this.text;
      }
    },
    claimType: {
      type: String,
      enum: {
        values: ['event', 'casualty', 'damage', 'evacuation', 'location', 'other'],
        message: 'Invalid claimType: {VALUE}'
      },
      default: 'other'
    },
    entities: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          category: {
            type: String,
            enum: ['location', 'organization', 'quantity', 'person', 'date_time', 'hazard', 'other'],
            default: 'other',
            trim: true
          }
        }
      ],
      default: []
    },
    location: {
      type: Schema.Types.Mixed,
      default: null
    },
    claimedLocation: {
      type: Schema.Types.Mixed,
      default: function () {
        return this.location;
      }
    },
    eventTime: {
      type: Schema.Types.Mixed,
      default: null
    },
    claimedTimestamp: {
      type: Date,
      default: null
    },
    attribution: {
      type: String,
      default: null,
      trim: true
    },
    uncertainty: {
      isUncertain: {
        type: Boolean,
        default: false
      },
      qualification: {
        type: String,
        default: null,
        trim: true
      }
    },
    sourceSpan: {
      text: { type: String, default: null },
      startOffset: { type: Number, default: null },
      endOffset: { type: Number, default: null }
    },
    extractionMethod: {
      type: String,
      enum: ['llm', 'deterministic_fallback', 'manual', 'synthetic'],
      default: 'deterministic_fallback'
    },
    // -------------------------------------------------------------------------
    // Phase 4: Deterministic verification result for this atomic claim
    // -------------------------------------------------------------------------
    verificationStatus: {
      type: String,
      enum: {
        values: ['Verified', 'Conflicting', 'Outdated', 'Unverified', 'pending'],
        message: 'Invalid verificationStatus: {VALUE}'
      },
      default: 'pending'
    },
    verificationExplanation: {
      type: String,
      default: null,
      trim: true
    },
    linkedEvidenceIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Evidence' }],
      default: []
    },
    // Optional predicate breakdown for backward-compatibility
    subject: {
      type: String,
      default: null,
      trim: true
    },
    predicate: {
      type: String,
      default: null,
      trim: true
    },
    object: {
      type: String,
      default: null,
      trim: true
    }
  },
  { _id: false }
);

/**
 * Structured location data schema
 */
const ClaimedLocationSchema = new Schema(
  {
    rawText: {
      type: String,
      default: null,
      trim: true
    },
    city: {
      type: String,
      default: null,
      trim: true
    },
    region: {
      type: String,
      default: null,
      trim: true
    },
    country: {
      type: String,
      default: null,
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        default: null,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        default: null,
        min: -180,
        max: 180
      }
    }
  },
  { _id: false }
);

/**
 * Main Claim Schema
 * Represents an individual claim or crisis message submitted for verification.
 */
const ClaimSchema = new Schema(
  {
    originalText: {
      type: String,
      required: [true, 'originalText is required'],
      trim: true,
      minlength: [5, 'originalText must be at least 5 characters']
    },
    sourcePlatform: {
      type: String,
      required: [true, 'sourcePlatform is required'],
      trim: true,
      lowercase: true
    },
    authorId: {
      type: String,
      default: null,
      trim: true
    },
    authorDisplayName: {
      type: String,
      default: null,
      trim: true
    },
    publishedAt: {
      type: Date,
      default: null
    },
    claimedLocation: {
      type: ClaimedLocationSchema,
      default: null
    },
    atomicClaims: {
      type: [AtomicClaimSchema],
      default: []
    },
    processingStatus: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'completed', 'failed'],
        message: 'Invalid processingStatus: {VALUE}'
      },
      default: 'pending'
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

// Indexes for deterministic sorting, status filtering, and synthetic seeding
ClaimSchema.index({ createdAt: -1, _id: -1 });
ClaimSchema.index({ processingStatus: 1 });
ClaimSchema.index({ isSynthetic: 1 });
ClaimSchema.index({ syntheticId: 1 }, { unique: true, sparse: true });

export const Claim = mongoose.models.Claim || mongoose.model('Claim', ClaimSchema);
export default Claim;
