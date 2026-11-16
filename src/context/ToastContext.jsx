import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { MOTION_TIMING, motionTokens } from '../utils/motionPresets';

const ToastContext = createContext(null);

const TONES = {
  success: {
    borderColor: '#4cce80',
    cardClass: 'bg-[#0e1518]/97 border-[#4cce80] border-l-[#4cce80]',
    Icon: CheckCircle2
  },
  error: {
    borderColor: '#e0363f',
    cardClass: 'bg-[#140a0c]/97 border-[#e0363f] border-l-[#e0363f]',
    Icon: AlertTriangle
  },
  warning: {
    borderColor: '#f59e0b',
    cardClass: 'bg-[#141008]/97 border-[#f59e0b] border-l-[#f59e0b]',
    Icon: AlertTriangle
  },
  info: {
    borderColor: '#d4a22a',
    cardClass: 'bg-[#0e0c08]/97 border-[#d4a22a] border-l-[#d4a22a]',
    Icon: Info
  }
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
      <div className="kuro-toast-stack fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-4 flex flex-col gap-2.5 z-[99999] max-w-[min(360px,calc(100vw-32px))] pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map(t => {
            const { borderColor, cardClass, Icon } = TONES[t.type];
            return (
              <motion.div
                key={t.id}
                role={t.type === 'error' ? 'alert' : 'status'}
                aria-atomic="true"
                initial={reduceMotion ? false : { opacity: 0, y: motionTokens.distance.md, scale: motionTokens.scale.subtle }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: motionTokens.distance.sm, scale: motionTokens.scale.subtle }}
                transition={{ duration: reduceMotion ? 0 : MOTION_TIMING.toast, ease: 'easeOut' }}
                className={`border border-l-3 rounded-[10px] px-[18px] py-3.5 text-[#e8e2d6] text-[13px] shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center gap-3 pointer-events-auto ${cardClass}`}
              >
                <Icon size={19} strokeWidth={1.9} color={borderColor} aria-hidden="true" />
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
