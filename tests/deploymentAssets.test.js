import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { optimizeDeploymentAssets } from '../scripts/optimize-deployment-assets.mjs';

test('optimizer preserves URL paths and decodable images while limiting giant dimensions', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kuro-deployment-'));
  try {
    const dir = path.join(root, 'images');
    await fs.mkdir(dir);
    const filepath = path.join(dir, 'sample.jpg');
    const pngPath = path.join(dir, 'original.png');
    const jpg = await sharp({
      create: { width: 2300, height: 1200, channels: 3, background: '#ba932c' }
    }).jpeg({ quality: 100 }).toBuffer();
    await fs.writeFile(filepath, jpg);
    const png = await sharp({
      create: { width: 36, height: 36, channels: 4, background: '#bb2323aa' }
    }).png().toBuffer();
    await fs.writeFile(pngPath, png);
    const outcome = await optimizeDeploymentAssets(root, { minBytes: 0, maxDimension: 2048 });
    assert.equal(outcome.eligible, 2);
    assert.ok(outcome.optimizedBytes <= outcome.originalBytes);
    const resultJpg = await sharp(await fs.readFile(filepath)).metadata();
    assert.ok(resultJpg.width <= 2048 && resultJpg.height <= 2048);
    assert.equal(resultJpg.format, 'jpeg');
    assert.deepEqual(
      await sharp(await fs.readFile(pngPath)).raw().toBuffer(),
      await sharp(png).raw().toBuffer()
    ); // lossless PNG pixels are unchanged even when bytes are re-encoded
    assert.equal(outcome.originalBytes - outcome.optimizedBytes,
      jpg.length + png.length - (await fs.stat(filepath)).size - (await fs.stat(pngPath)).size);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('optimizer does not change source content or non-image assets', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kuro-asset-safe-'));
  try {
    const marker = path.join(root, 'index.html');
    await fs.writeFile(marker, '<!DOCTYPE html><html></html>');
    const result = await optimizeDeploymentAssets(root);
    assert.equal(result.eligible, 0);
    assert.equal(await fs.readFile(marker, 'utf8'), '<!DOCTYPE html><html></html>');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
