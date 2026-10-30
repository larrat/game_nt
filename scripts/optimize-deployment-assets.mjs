/**
 * Optimize the Vite output only. public/ assets remain untouched in Git.
 * Preserve the names and extensions referenced by JSX/CSS.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

async function* walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filepath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(filepath);
    else if (entry.isFile()) yield filepath;
  }
}

export async function optimizeDeploymentAssets(root, {
  minBytes = 100 * 1024,
  maxDimension = 2048
} = {}) {
  const result = { eligible: 0, optimized: 0, originalBytes: 0, optimizedBytes: 0, skipped: 0 };
  for await (const filepath of walk(root)) {
    const ext = path.extname(filepath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;
    const stat = await fs.stat(filepath);
    if (stat.size < minBytes) continue;
    result.eligible++;
    result.originalBytes += stat.size;
    try {
      const input = await fs.readFile(filepath);
      const metadata = await sharp(input, { failOn: 'none' }).metadata();
      // Never rewrite animated, multipage, or vector resources.
      if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) {
        result.skipped++;
        result.optimizedBytes += stat.size;
        continue;
      }
      let pipeline = sharp(input, { failOn: 'none' }).rotate();
      if (Math.max(metadata.width, metadata.height) > maxDimension) {
        pipeline = pipeline.resize({
          width: maxDimension, height: maxDimension,
          fit: 'inside', withoutEnlargement: true
        });
      }
      const compressed = ext === '.png'
        ? await pipeline.png({ compressionLevel: 9, effort: 6, palette: false }).toBuffer()
        : await pipeline.jpeg({ quality: 82, mozjpeg: true, progressive: true }).toBuffer();

      // Avoid replacing images with a larger or negligibly smaller alternative.
      if (compressed.length <= stat.size * 0.96) {
        await fs.writeFile(filepath, compressed);
        result.optimized++;
        result.optimizedBytes += compressed.length;
      } else {
        result.skipped++;
        result.optimizedBytes += stat.size;
      }
    } catch (error) {
      // Keep the Vite output usable even if a non-standard image cannot decode.
      console.warn('[assets] Skipped', path.relative(root, filepath), error.message);
      result.skipped++;
      result.optimizedBytes += stat.size;
    }
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] || 'dist');
  const result = await optimizeDeploymentAssets(root);
  const saved = result.originalBytes - result.optimizedBytes;
  console.info('[assets] Deployment optimization', {
    ...result, savedBytes: saved,
    savedMiB: (saved / 1024 / 1024).toFixed(2),
    reductionPct: result.originalBytes
      ? (100 * saved / result.originalBytes).toFixed(1) : '0.0'
  });
}
