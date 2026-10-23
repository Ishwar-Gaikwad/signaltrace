import mongoose from 'mongoose';
import { config } from './env.js';

const readyStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

/**
 * Connect to MongoDB instance using Mongoose
 * Accepts optional customUri (useful for test isolation)
 * Gracefully logs failure and exits process with code 1 if connection fails during startup
 */
export const connectDB = async (customUri = null) => {
  const uri = customUri || config.mongodbUri;

  // If already connected to the requested URI, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // fail fast if database is unreachable
    });

    if (config.nodeEnv !== 'test') {
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    }
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB at "${uri}":`);
    console.error(`Reason: ${error.message}`);
    if (config.nodeEnv !== 'test') {
      console.error('[Database Error] Terminating server process (exit code 1)...');
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Disconnect from MongoDB instance
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    if (config.nodeEnv !== 'test') {
      console.log('[Database] MongoDB Disconnected gracefully.');
    }
  }
};

/**
 * Returns current database connection health and metadata
 */
export const getDatabaseStatus = () => {
  const stateCode = mongoose.connection.readyState;
  return {
    status: readyStates[stateCode] || 'unknown',
    statusCode: stateCode,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
};
