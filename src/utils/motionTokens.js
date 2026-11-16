export const MOTION_TIMING = Object.freeze({
  fast: 0.14,
  standard: 0.22,
  toast: 0.20
});

export const motionTokens = Object.freeze({
  duration: Object.freeze({
    instant: 0.08,
    fast: 0.14,
    normal: 0.22,
    toast: 0.20,
    slow: 0.45,
    crawl: 0.8
  }),
  easing: Object.freeze({
    smooth: Object.freeze([0.22, 1, 0.36, 1]),
    sharp: Object.freeze([0.4, 0, 0.2, 1]),
    bounce: Object.freeze([0.34, 1.56, 0.64, 1]),
    linear: Object.freeze([0, 0, 1, 1])
  }),
  distance: Object.freeze({
    xs: 4,
    sm: 8,
    md: 12,
    lg: 20,
    xl: 36
  }),
  scale: Object.freeze({
    subtle: 0.98,
    press: 0.96,
    pop: 1.03
  })
});

export const springs = Object.freeze({
  snappy: Object.freeze({ type: 'spring', stiffness: 300, damping: 30 }),
  gentle: Object.freeze({ type: 'spring', stiffness: 140, damping: 18 }),
  bouncy: Object.freeze({ type: 'spring', stiffness: 380, damping: 14 }),
  instant: Object.freeze({ type: 'spring', stiffness: 600, damping: 35 }),
  release: Object.freeze({ type: 'spring', stiffness: 200, damping: 20, restDelta: 0.001 })
});

export const motionConfig = Object.freeze({
  isLowEnd() {
    return typeof navigator !== 'undefined' && Number(navigator.hardwareConcurrency) > 0 && navigator.hardwareConcurrency <= 4;
  },
  prefersReduced() {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  },
  shouldAnimate({ essential = false } = {}) {
    if (this.prefersReduced()) return false;
    if (!essential && this.isLowEnd()) return false;
    return true;
  }
});

export function getSafeMotionVariants(reduceMotion = false, distanceY = motionTokens.distance.md) {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 0 }
    };
  }
  return {
    initial: { opacity: 0, y: distanceY },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -Math.round(distanceY / 2) }
  };
}

export function getStaggerVariants(reduceMotion = false, staggerSeconds = 0.07) {
  const safeStagger = Math.min(0.10, Math.max(0.05, staggerSeconds));
  return {
    container: {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduceMotion ? 0 : safeStagger,
          delayChildren: reduceMotion ? 0 : 0.05
        }
      }
    },
    item: {
      hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : motionTokens.distance.sm },
      visible: { opacity: 1, y: 0, transition: reduceMotion ? { duration: 0 } : springs.gentle }
    }
  };
}
