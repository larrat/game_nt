import React from 'react';

export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {eyebrow && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px'
            }}>
              <div style={{ width: '24px', height: '1px', background: 'var(--seal-bright)' }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px', letterSpacing: '3px',
                color: 'var(--gold)', textTransform: 'uppercase'
              }}>{eyebrow}</span>
            </div>
          )}
          <h1 style={{
            fontFamily: "'Shippori Mincho', serif",
            fontSize: '28px', fontWeight: 600, color: 'var(--paper)',
            letterSpacing: '0.5px'
          }}>{title}</h1>
          {subtitle && (
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '6px', lineHeight: '1.5' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(90deg, var(--seal-bright), transparent)', marginTop: '20px', opacity: 0.4 }} />
    </div>
  );
}
