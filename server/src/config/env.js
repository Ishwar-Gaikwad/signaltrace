import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory first, then root directory fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Validates and sanitizes environment variables
 */
export const validateEnv = () => {
  const errors = [];

  const port = process.env.PORT || '5000';
  const portNum = Number(port);
  if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
    errors.push(`PORT must be a valid integer between 1 and 65535. Received: "${port}"`);
  }

  const mongodbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/verialert';
  if (!mongodbUri.startsWith('mongodb://') && !mongodbUri.startsWith('mongodb+srv://')) {
    errors.push('MONGODB_URI must start with "mongodb://" or "mongodb+srv://". The configured value is omitted from logs.');
  }

  if (errors.length > 0) {
    const errorDetails = errors.map((err) => ` - ${err}`).join('\n');
    throw new Error(`Environment Validation Error:\n${errorDetails}`);
  }
};

export const config = Object.freeze({
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/verialert',
  nodeEnv: process.env.NODE_ENV || 'development',

  // LLM Provider Configuration (Optional — falls back to deterministic fallback if not set)
  llmProvider: process.env.LLM_PROVIDER || 'fallback',
  llmApiKey: process.env.LLM_API_KEY || null,
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
  llmBaseUrl: process.env.LLM_BASE_URL || null,
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 8000,

  // Disaster Feed Ingestion (USGS & GDACS)
  usgsFeedUrl: process.env.USGS_FEED_URL || 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  gdacsFeedUrl: process.env.GDACS_FEED_URL || 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=FL,TC,EQ,VO,DR&alertlevel=green;orange;red',
  ingestionTimeoutMs: Number(process.env.INGESTION_TIMEOUT_MS) || 10000,
  ingestionMaxRecords: Number(process.env.INGESTION_MAX_RECORDS) || 100
});
