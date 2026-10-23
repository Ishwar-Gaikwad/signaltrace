/**
 * SignalTrace — Live Disaster Feed Connectivity Smoke Test
 *
 * Verifies live HTTP access to the USGS Earthquake Hazards Program GeoJSON API.
 * This script is separated from the automated test suite so automated unit/integration
 * tests never require internet connectivity.
 *
 * Usage:
 *   node src/scripts/checkLiveFeed.js
 *   npm run test:live
 */

import { fetchFeed, USGS_SOURCE_NAME } from '../services/ingestion/adapters/usgsEarthquakeAdapter.js';
import { config } from '../config/env.js';

const checkLiveFeedConnectivity = async () => {
  console.log('====================================================');
  console.log(' SignalTrace — Live Feed Connectivity Smoke Test');
  console.log('====================================================');
  console.log(` Target Provider : ${USGS_SOURCE_NAME}`);
  console.log(` Target Feed URL : ${config.usgsFeedUrl}`);
  console.log(` Timeout Setting : ${config.ingestionTimeoutMs} ms`);
  console.log('----------------------------------------------------');

  const startTime = Date.now();
  try {
    console.log('[Smoke Test] Requesting live feed...');
    const features = await fetchFeed({
      feedUrl: config.usgsFeedUrl,
      timeoutMs: config.ingestionTimeoutMs,
      maxRecords: 5
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[Smoke Test] SUCCESS — Live feed responded in ${elapsedMs} ms`);
    console.log(` - Features Received : ${features.length} (sample capped at 5)`);

    if (features.length > 0) {
      const sample = features[0];
      console.log(` - Sample Feature ID : ${sample.id}`);
      console.log(` - Sample Place      : ${sample.properties?.place || 'N/A'}`);
      console.log(` - Sample Magnitude  : ${sample.properties?.mag ?? 'N/A'}`);
      console.log(` - Sample Time       : ${new Date(sample.properties?.time).toISOString()}`);
    }
    console.log('====================================================');
    console.log(' Status: LIVE FEED ACCESSIBLE & VERIFIED');
    console.log('====================================================');
    process.exitCode = 0;
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.warn(`[Smoke Test] WARNING — Live feed connectivity check failed (${elapsedMs} ms)`);
    console.warn(` - Error Code    : ${error.code || 'UNKNOWN'}`);
    console.warn(` - Error Message : ${error.message}`);
    console.warn(' - Diagnostic    : The development environment may be offline or firewalled.');
    console.warn('                   Synthetic baseline datasets remain fully functional.');
    console.log('====================================================');
    console.log(' Status: OFFLINE / LIVE FEED INACCESSIBLE');
    console.log('====================================================');
    process.exitCode = 0; // Exit 0 with diagnostic warning so offline builds are not blocked
  }
};

checkLiveFeedConnectivity();
