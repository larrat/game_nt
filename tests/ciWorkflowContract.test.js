import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/engine-tests.yml',import.meta.url),'utf8');

test('CI runs before merges and after master changes to runtime/build files',()=>{
  assert.match(workflow,/pull_request:/);
  assert.match(workflow,/push:\n    branches:\n      - master/);
  for(const file of ["'src/**'","'scripts/**'","'tests/**'","'migrations/**'","'vite.config.js'","'vercel.json'","'tsconfig.json'","'package-lock.json'"]) {
    assert.ok(workflow.includes(file),file);
  }
});
test('CI installs with npm ci and runs tests and TypeScript build',()=>{
  assert.ok(workflow.includes('run: npm ci'));
  assert.ok(workflow.includes('run: npm test'));
  assert.ok(workflow.includes('run: npm run build'));
  assert.match(workflow,/cancel-in-progress: true/);
  assert.match(workflow,/permissions:\n  contents: read/);
});
