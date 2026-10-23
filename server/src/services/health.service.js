import { getDatabaseStatus } from '../config/db.js';
import { config } from '../config/env.js';

/**
 * Service to aggregate health and status metrics for VeriAlert backend
 */
export const getHealthMetrics = () => {
  const dbStatus = getDatabaseStatus();

  return {
    status: 'healthy',
    service: 'SignalTrace — VeriAlert API',
    version: '1.0.0',
    environment: config.nodeEnv,
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    system: {
      nodeVersion: process.version,
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }
  };
};
