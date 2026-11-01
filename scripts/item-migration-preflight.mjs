#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { buildItemMigrationPreflight } from '../src/utils/itemMigrationPreflight.js';
import { evaluateItemReplacementPlan } from '../src/utils/itemReplacementPlan.js';

function main(args) {
  if (args.length < 1 || args.length > 2 || !args.every(name => name.endsWith('.json'))) {
    process.stderr.write('Uso: node scripts/item-migration-preflight.mjs ./snapshot.json [./proposta.json]\n');
    process.stderr.write('Gere o snapshot com scripts/export_item_migration_preflight.sql; nunca inclua IDs de jogador.\n');
    process.exitCode = 2;
    return;
  }
  try {
    const input = JSON.parse(readFileSync(args[0], 'utf8'));
    const snapshot = input.snapshot ?? input;
    const proposal = args[1] ? JSON.parse(readFileSync(args[1], 'utf8')) : null;
    const report = proposal ? evaluateItemReplacementPlan(snapshot, proposal) : buildItemMigrationPreflight(snapshot);
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if ((report.integrityErrors?.length ?? 0) > 0 || (report.blockers?.length ?? 0) > 0) {
      process.stderr.write('Pré-voo bloqueado: há referências ou requisitos de migração pendentes. Nenhuma alteração foi efetuada.\n');
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write('Não foi possível analisar o snapshot: ' + error.message + '\n');
    process.exitCode = 1;
  }
}

main(process.argv.slice(2));
