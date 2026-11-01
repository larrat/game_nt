#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { buildItemMigrationPreflight } from '../src/utils/itemMigrationPreflight.js';

function main(args) {
  if (args.length !== 1 || !args[0].endsWith('.json')) {
    process.stderr.write('Uso: node scripts/item-migration-preflight.mjs ./snapshot.json\n');
    process.stderr.write('Gere o snapshot com scripts/export_item_migration_preflight.sql; nunca inclua IDs de jogador.\n');
    process.exitCode = 2;
    return;
  }
  try {
    const input = JSON.parse(readFileSync(args[0], 'utf8'));
    const snapshot = input.snapshot ?? input;
    const report = buildItemMigrationPreflight(snapshot);
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.integrityErrors.length) {
      process.stderr.write('Pré-voo bloqueado: referências inválidas ou duplicadas. Nenhuma alteração foi efetuada.\n');
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write('Não foi possível analisar o snapshot: ' + error.message + '\n');
    process.exitCode = 1;
  }
}

main(process.argv.slice(2));
