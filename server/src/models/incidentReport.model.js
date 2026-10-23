import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Geographic information schema for incident reports
 */
const IncidentGeographicSchema = new Schema(
  {
    locationName: {
      type: String,
      default: null,
      trim: true
    },
    adminRegion: {
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
    },
    affectedRadiusKm: {
      type: Number,
      default: null,
      min: 0
    },
    affectedAreaDescription: {
      type: String,
      default: null,
      trim: true
    }
  },
  { _id: false }
);

/**
 * Incident Report Schema
 * Represents an emergency alert or structured incident report from an authoritative or observational source.
 */
const IncidentReportSchema = new Schema(
  {
    sourceReportId: {
      type: String,
      required: [true, 'sourceReportId is required'],
      trim: true
    },
    sourceName: {
      type: String,
      required: [true, 'sourceName is required'],
      trim: true
    },
    sourceType: {
      type: String,
      required: [true, 'sourceType is required'],
      enum: {
        values: [
          'official_agency',
          'meteorological_service',
          'geological_survey',
          'emergency_management',
          'first_responder',
          'news_wire',
          'other'
        ],
        message: 'Invalid sourceType: {VALUE}'
      }
    },
    sourceUrl: {
      type: String,
      default: null,
      trim: true
    },
    eventType: {
      type: String,
      required: [true, 'eventType is required'],
      lowercase: true,
      trim: true,
      enum: {
        values: [
          'earthquake',
          'flood',
          'wildfire',
          'cyclone',
          'landslide',
          'tsunami',
          'industrial_hazard',
          'storm',
          'other'
        ],
        message: 'Invalid eventType: {VALUE}'
      }
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'description is required'],
      trim: true
    },
    severity: {
      type: String,
      default: null,
      enum: {
        values: ['minor', 'moderate', 'severe', 'extreme', 'unknown', null],
        message: 'Invalid severity: {VALUE}'
      }
    },
    geographicInfo: {
      type: IncidentGeographicSchema,
      default: null
    },
    publishedAt: {
      type: Date,
      default: null
    },
    updatedAtSource: {
      type: Date,
      default: null
    },
    eventOccurredAt: {
      type: Date,
      default: null
    },
    retrievedAt: {
      type: Date,
      default: Date.now
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      default: null
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

// Compound unique index ensuring no duplicate incident reports from the same source
IncidentReportSchema.index(
  { sourceName: 1, sourceReportId: 1 },
  { unique: true }
);

// Indexes for query performance and deterministic sorting
IncidentReportSchema.index({ publishedAt: -1, _id: -1 });
IncidentReportSchema.index({ eventType: 1 });
IncidentReportSchema.index({ severity: 1 });
IncidentReportSchema.index({ isSynthetic: 1 });
IncidentReportSchema.index({ syntheticId: 1 }, { unique: true, sparse: true });

export const IncidentReport = mongoose.models.IncidentReport || mongoose.model('IncidentReport', IncidentReportSchema);
export default IncidentReport;
