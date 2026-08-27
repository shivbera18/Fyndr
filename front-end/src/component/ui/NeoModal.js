import React, { useEffect } from 'react';
import NeoButton from './NeoButton';

const NeoModal = ({
  open = false,
  onClose,
  title = '',
  accent = 'yellow', // yellow | cyan | lime | coral | purple
  children,
  footer = null,
  maxWidth = '520px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="neo-modal-backdrop" onClick={onClose}>
      <div
        className="neo-modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`neo-modal-header neo-card-header-${accent}`}>
          <span style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--neo-white)',
              border: 'var(--neo-border-thin)',
              borderRadius: 'var(--neo-radius-sm)',
              boxShadow: 'var(--neo-shadow-sm)',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>
        <div className="neo-modal-body">{children}</div>
        {footer && <div className="neo-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default NeoModal;
