import { connectDB, disconnectDB } from '../config/db.js';
import { validateEnv } from '../config/env.js';
import { seedSyntheticData } from '../services/seed.service.js';

const runSeedScript = async () => {
  try {
    console.log('====================================================');
    console.log(' SignalTrace — Synthetic Disaster Dataset Seeder');
    console.log('====================================================');

    validateEnv();
    await connectDB();

    const result = await seedSyntheticData();

    console.log('----------------------------------------------------');
    console.log(` Seed Result Summary:`);
    console.log(` - Incident Reports : ${result.incidentsCount}`);
    console.log(` - Claims           : ${result.claimsCount}`);
    console.log(` - Evidence Records : ${result.evidenceCount}`);
    console.log('====================================================');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error] Failed to seed synthetic dataset:', error.message);
    if (error.stack) console.error(error.stack);
    await disconnectDB().catch(() => {});
    process.exit(1);
  }
};

runSeedScript();
