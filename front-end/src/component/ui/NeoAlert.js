import React from 'react';

const NeoAlert = ({
  title = null,
  children,
  variant = 'yellow', // yellow | lime | cyan | coral | purple | dark
  icon = null,
  className = '',
  style = {},
}) => {
  return (
    <div
      role="alert"
      className={`neo-alert ${className}`}
      style={{
        border: 'var(--neo-border-thick)',
        borderRadius: 'var(--neo-radius-md)',
        boxShadow: 'var(--neo-shadow-md)',
        backgroundColor: `var(--neo-${variant})`,
        color: variant === 'coral' || variant === 'purple' || variant === 'dark' ? '#FFFFFF' : 'var(--neo-black)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        ...style,
      }}
    >
      {icon && <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        {title && (
          <div
            style={{
              fontFamily: 'var(--neo-font-main)',
              fontWeight: 900,
              fontSize: '1rem',
              marginBottom: children ? '4px' : '0',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </div>
        )}
        {children && (
          <div style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: '1.5' }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default NeoAlert;
