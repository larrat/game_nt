import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        zIndex: 99999, maxWidth: '360px'
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'success' ? 'rgba(14,21,24,0.97)' : t.type === 'error' ? 'rgba(20,10,12,0.97)' : 'rgba(14,12,8,0.97)',
            border: `1px solid ${t.type === 'success' ? '#4cce80' : t.type === 'error' ? '#e0363f' : '#d4a22a'}`,
            borderLeft: `3px solid ${t.type === 'success' ? '#4cce80' : t.type === 'error' ? '#e0363f' : '#d4a22a'}`,
            borderRadius: '6px',
            padding: '14px 18px',
            color: '#e8e2d6',
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            animation: 'toast-in 0.3s ease',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <span style={{ fontSize: '16px' }}>
              {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
