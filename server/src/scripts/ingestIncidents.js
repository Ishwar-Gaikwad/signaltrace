/**
 * SignalTrace — Disaster Incident Ingestion Script
 * Runs manual / automated synchronization from authoritative disaster feeds.
 *
 * Usage:
 *   node src/scripts/ingestIncidents.js
 *   npm run ingest:usgs
 */

import { connectDB, disconnectDB } from '../config/db.js';
import { validateEnv } from '../config/env.js';
import { syncIncidents } from '../services/ingestion/incidentIngestion.service.js';
import { usgsEarthquakeAdapter } from '../services/ingestion/adapters/usgsEarthquakeAdapter.js';

const runIngestScript = async () => {
  try {
    console.log('====================================================');
    console.log(' SignalTrace — Authoritative Disaster Feed Ingestion');
    console.log('====================================================');

    validateEnv();
    await connectDB();

    console.log(`[Ingestion] Starting sync from: ${usgsEarthquakeAdapter.sourceName}`);
    const result = await syncIncidents(usgsEarthquakeAdapter);

    console.log('----------------------------------------------------');
    console.log(` Ingestion Result Summary:`);
    console.log(` - Source      : ${result.sourceName}`);
    console.log(` - Fetched     : ${result.fetched}`);
    console.log(` - Validated   : ${result.validated}`);
    console.log(` - Inserted    : ${result.inserted}`);
    console.log(` - Updated     : ${result.updated}`);
    console.log(` - Skipped     : ${result.skipped}`);
    console.log(` - Failed      : ${result.failed}`);

    if (result.errors && result.errors.length > 0) {
      console.log('----------------------------------------------------');
      console.log(' Ingestion Errors encountered:');
      result.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. [${err.id}] ${err.message}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ...and ${result.errors.length - 10} more errors`);
      }
    }
    console.log('====================================================');

    await disconnectDB();
    process.exitCode = (result.failed > 0 && result.inserted === 0 && result.updated === 0 && result.skipped === 0 ? 1 : 0);
  } catch (error) {
    console.error('[Ingestion Error] Fatal error during incident ingestion:', error.message);
    if (error.stack) console.error(error.stack);
    await disconnectDB().catch(() => {});
    process.exitCode = 1;
  }
};

runIngestScript();
