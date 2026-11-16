import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  MOTION_TIMING,
  motionTokens,
  springs,
  motionConfig,
  getSafeMotionVariants,
  getStaggerVariants
} from '../src/utils/motionTokens.js';

const read = (relPath) => readFileSync(new URL('../' + relPath, import.meta.url), 'utf8');

test('App.jsx parallelizes player inventory, consumables and jutsus loading with Promise.all', () => {
  const app = read('src/App.jsx');
  assert.ok(app.includes('const [invRes, consRes, jutsuRes] = await Promise.all(['));
  assert.ok(app.includes(".from('player_inventory')"));
  assert.ok(app.includes(".from('player_consumables')"));
  assert.ok(app.includes(".from('jutsus')"));
});

test('vite.config.js keeps Rolldown-compatible Vite 8 configuration without object manualChunks', () => {
  const viteConfig = read('vite.config.js');
  assert.ok(viteConfig.includes('warmup:'));
  assert.ok(viteConfig.includes('sourcemap: false'));
  assert.ok(!viteConfig.includes('manualChunks: {'), 'Vite 8 Rolldown rejects object-form manualChunks');
});

test('AvatarModal and Vila modal provide WCAG 2.2 keyboard and dialog accessibility', () => {
  const avatarModal = read('src/components/AvatarModal.jsx');
  const vila = read('src/pages/Vila.jsx');

  assert.ok(avatarModal.includes('role="dialog"'));
  assert.ok(avatarModal.includes('aria-modal="true"'));
  assert.ok(avatarModal.includes('aria-labelledby="kuro-avatar-modal-title"'));
  assert.ok(avatarModal.includes("event.key === 'Escape'"));
  assert.ok(avatarModal.includes("event.key !== 'Tab'"));
  assert.ok(avatarModal.includes('aria-label="Fechar seletor de avatar"'));
  assert.ok(!avatarModal.includes('<div className="close"'));
  assert.ok(vila.includes("event.key === 'Escape'"));
});

test('motionTokens and ToastContext follow motion-foundations and zero inline style rules', () => {
  const toast = read('src/context/ToastContext.jsx');

  assert.equal(MOTION_TIMING.fast, 0.14);
  assert.equal(motionTokens.duration.normal, 0.22);
  assert.equal(springs.snappy.type, 'spring');
  assert.equal(typeof motionConfig.shouldAnimate, 'function');

  const reduced = getSafeMotionVariants(true, 16);
  const full = getSafeMotionVariants(false, 16);
  assert.equal(reduced.initial.y, 0);
  assert.equal(reduced.initial.opacity, 1);
  assert.equal(full.initial.y, 16);
  assert.equal(full.initial.opacity, 0);

  const stagger = getStaggerVariants(false, 0.08);
  assert.equal(stagger.container.visible.transition.staggerChildren, 0.08);

  assert.ok(!toast.includes('style={{'));
  assert.ok(toast.includes('warning:'));
});

test('Design tokens and CodeTours reference existing files and valid line numbers', () => {
  const tokens = JSON.parse(read('docs/design-tokens.json'));
  assert.equal(tokens.color.surface.ink.value, '#080a0f');
  assert.equal(tokens.color.accent.gold.value, '#d4a22a');
  assert.equal(tokens.color.accent['seal-bright'].value, '#e0363f');

  for (const tourPath of ['.tours/01-combat-session-flow.tour', '.tours/02-player-state-and-progression.tour']) {
    const tour = JSON.parse(read(tourPath));
    assert.ok(Array.isArray(tour.steps) && tour.steps.length >= 5);
    for (const step of tour.steps) {
      if (step.file) {
        assert.ok(existsSync(new URL('../' + step.file, import.meta.url)), `Missing tour file: ${step.file}`);
        const totalLines = read(step.file).split('\n').length;
        assert.ok(step.line >= 1 && step.line <= totalLines, `Invalid line ${step.line} in ${step.file}`);
      }
    }
  }
});
