import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTION_TIMING } from '../src/utils/motionPresets.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const sidebar = read('src/components/Sidebar.jsx');
const toast = read('src/context/ToastContext.jsx');
const css = read('src/styles/motion-system-v1.css');
const app = read('src/App.jsx');

test('motion timing remains subtle and available without a paid dependency', () => {
  assert.ok(MOTION_TIMING.fast > 0 && MOTION_TIMING.fast <= 0.2);
  assert.ok(MOTION_TIMING.standard > 0 && MOTION_TIMING.standard <= 0.3);
  assert.ok(MOTION_TIMING.toast > 0 && MOTION_TIMING.toast <= 0.3);
});

test('sidebar animates expansion while keeping collapsed destinations inaccessible', () => {
  assert.ok(sidebar.includes("from 'motion/react'"));
  assert.ok(sidebar.includes('useReducedMotion()'));
  assert.ok(sidebar.includes('<motion.div'));
  assert.ok(sidebar.includes("height: open ? 'auto' : 0"));
  assert.ok(sidebar.includes('aria-expanded={open}'));
  assert.ok(sidebar.includes('aria-hidden={!open}'));
  assert.ok(sidebar.includes('inert={!open}'));
  assert.ok(sidebar.includes('<NavLink'));
  assert.ok(sidebar.includes('disabled={searching}'));
});

test('toasts have entrance/exit motion, stable ids and accessible live feedback', () => {
  assert.ok(toast.includes('AnimatePresence'));
  assert.ok(toast.includes('<motion.div'));
  assert.ok(toast.includes('useReducedMotion()'));
  assert.ok(toast.includes("role={t.type === 'error' ? 'alert' : 'status'}"));
  assert.ok(toast.includes('useRef(0)'));
  assert.ok(toast.includes('clearTimeout'));
  assert.ok(toast.includes('3500'));
});

test('interactive components support keyboard focus and reduced motion', () => {
  assert.ok(app.includes("import './styles/motion-system-v1.css'"));
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes('.navitem'));
  assert.ok(css.includes('.kuro-ui-card'));
  assert.ok(css.includes(':not(:disabled)'));
  assert.ok(read('src/styles/sidebar-v3.css').includes(':focus-visible'));
});
