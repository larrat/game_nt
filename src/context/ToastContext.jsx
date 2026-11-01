import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { MOTION_TIMING } from '../utils/motionPresets';

const ToastContext = createContext(null);

const TONES = {
  success: { border: '#4cce80', background: 'rgba(14,21,24,0.97)', Icon: CheckCircle2 },
  error: { border: '#e0363f', background: 'rgba(20,10,12,0.97)', Icon: AlertTriangle },
  info: { border: '#d4a22a', background: 'rgba(14,12,8,0.97)', Icon: Info }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());
  const reduceMotion = useReducedMotion();

  useEffect(() => () => {
    for (const timeout of timers.current.values()) clearTimeout(timeout);
    timers.current.clear();
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++nextId.current;
    const tone = Object.hasOwn(TONES, type) ? type : 'info';
    setToasts(previous => [...previous, { id, message, type: tone }]);
    const timeout = setTimeout(() => {
      setToasts(previous => previous.filter(t => t.id !== id));
      timers.current.delete(id);
    }, 3500);
    timers.current.set(id, timeout);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        className="kuro-toast-stack"
        style={{
          position: 'fixed', bottom: 'max(16px, env(safe-area-inset-bottom))',
          right: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
          zIndex: 99999, maxWidth: 'min(360px, calc(100vw - 32px))', pointerEvents: 'none'
        }}
      >
        <AnimatePresence initial={false}>
          {toasts.map(t => {
            const { border, background, Icon } = TONES[t.type];
            return (
              <motion.div
                key={t.id}
                role={t.type === 'error' ? 'alert' : 'status'}
                aria-atomic="true"
                initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: reduceMotion ? 0 : MOTION_TIMING.toast, ease: 'easeOut' }}
                style={{
                  background,
                  border: '1px solid ' + border,
                  borderLeft: '3px solid ' + border,
                  borderRadius: '10px',
                  padding: '14px 18px',
                  color: '#e8e2d6',
                  fontSize: '13px',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  pointerEvents: 'auto'
                }}
              >
                <Icon size={19} strokeWidth={1.9} color={border} aria-hidden="true" />
                <span>{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
