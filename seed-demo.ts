import { resetAndSeed } from './src/lib/seed';

async function runSeed() {
  console.log('🌱 Starting fresh seed (clearing all data first)...');
  await resetAndSeed();
  console.log('✅ Seed completed!');
  process.exit(0);
}

runSeed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
