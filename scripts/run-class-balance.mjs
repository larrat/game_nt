#!/usr/bin/env node
/**
 * Read-only diagnostics based on frontend stat formulas.
 * This never calls Supabase or runs the SQL combat/reward RPCs.
 */
import { simulateClassBalance } from '../src/utils/combatBalanceSimulation.js';

const json = process.argv.includes('--json');
const samplesArg = process.argv.find(x => x.startsWith('--samples='));
const levelArg = process.argv.find(x => x.startsWith('--level='));
const samples = samplesArg ? Number(samplesArg.split('=')[1]) : 200;
const level = levelArg ? Number(levelArg.split('=')[1]) : 1;

try {
  const result = simulateClassBalance({ samples, level });
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('OFFLINE approximate class matchup, not authoritative SQL combat.');
    console.table(result.matchups);
    console.log('Imbalance candidates (review in server simulation):', result.warnings);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
