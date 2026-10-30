import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const typedUtility = readFileSync(new URL('../src/utils/resourceProgress.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(typedUtility, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
});
const { getResourceProgress } = await import(
  'data:text/javascript;base64,' + Buffer.from(compiled.outputText).toString('base64')
);

test('type-safe resource progress clamps invalid and excessive values', () => {
  assert.deepEqual(getResourceProgress(60, 100), { current: 60, max: 100, percent: 60 });
  assert.deepEqual(getResourceProgress(-10, 100), { current: 0, max: 100, percent: 0 });
  assert.deepEqual(getResourceProgress(150, 100), { current: 100, max: 100, percent: 100 });
  assert.deepEqual(getResourceProgress(NaN, 100), { current: 0, max: 100, percent: 0 });
  assert.deepEqual(getResourceProgress(50, 0), { current: 1, max: 1, percent: 100 });
  assert.deepEqual(getResourceProgress(null, undefined), { current: 0, max: 1, percent: 0 });
});

test('shared header integrates Motion with reduced-motion support', () => {
  const pageHeader = readFileSync(new URL('../src/components/PageHeader.jsx', import.meta.url), 'utf8');
  assert.match(pageHeader, /from 'motion\/react'/);
  assert.match(pageHeader, /useReducedMotion\(\)/);
  assert.match(pageHeader, /initial=\{reduceMotion \? false/);
  assert.match(pageHeader, /<motion\.header/);
});

test('TypeScript checking runs before the production Vite build', () => {
  const config = JSON.parse(readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8'));
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(config.compilerOptions.strict, true);
  assert.equal(config.compilerOptions.checkJs, false);
  assert.equal(config.compilerOptions.noEmit, true);
  assert.equal(pkg.scripts.typecheck, 'tsc --noEmit -p tsconfig.json');
  assert.ok(pkg.scripts.build.startsWith('npm run typecheck &&'));
  assert.ok(pkg.dependencies.motion);
  assert.ok(pkg.devDependencies.typescript);
});
