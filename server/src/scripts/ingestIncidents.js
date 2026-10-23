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
import { gdacsAdapter } from '../services/ingestion/adapters/gdacsAdapter.js';

const runIngestScript = async () => {
  try {
    console.log('====================================================');
    console.log(' SignalTrace — Authoritative Disaster Feed Ingestion');
    console.log('====================================================');

    validateEnv();
    await connectDB();

    const adapters = [usgsEarthquakeAdapter, gdacsAdapter];
    let grandInserted = 0;
    let grandUpdated = 0;

    for (const adapter of adapters) {
      console.log(`[Ingestion] Starting sync from: ${adapter.sourceName}`);
      const result = await syncIncidents(adapter);

      console.log('----------------------------------------------------');
      console.log(` Ingestion Result for ${result.sourceName}:`);
      console.log(` - Fetched     : ${result.fetched}`);
      console.log(` - Validated   : ${result.validated}`);
      console.log(` - Inserted    : ${result.inserted}`);
      console.log(` - Updated     : ${result.updated}`);
      console.log(` - Skipped     : ${result.skipped}`);
      console.log(` - Failed      : ${result.failed}`);

      grandInserted += result.inserted;
      grandUpdated += result.updated;

      if (result.errors && result.errors.length > 0) {
        result.errors.slice(0, 5).forEach((err, idx) => {
          console.log(`   ${idx + 1}. [${err.id}] ${err.message}`);
        });
      }
    }
    console.log('====================================================');

    await disconnectDB();
    process.exitCode = 0;
  } catch (error) {
    console.error('[Ingestion Error] Fatal error during incident ingestion:', error.message);
    if (error.stack) console.error(error.stack);
    await disconnectDB().catch(() => {});
    process.exitCode = 1;
  }
};

runIngestScript();
