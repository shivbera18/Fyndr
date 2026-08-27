import React, { useState } from 'react';

export const NeoAccordionItem = ({
  title,
  children,
  defaultOpen = false,
  accent = 'yellow', // yellow | cyan | lime | coral | purple
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`neo-accordion-item ${className}`}
      style={{
        border: 'var(--neo-border-thick)',
        borderRadius: 'var(--neo-radius-md)',
        boxShadow: 'var(--neo-shadow-md)',
        overflow: 'hidden',
        marginBottom: '12px',
        backgroundColor: 'var(--neo-white)',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          border: 'none',
          backgroundColor: isOpen ? `var(--neo-${accent})` : 'var(--neo-white)',
          borderBottom: isOpen ? 'var(--neo-border-thick)' : 'none',
          color: 'var(--neo-black)',
          fontFamily: 'var(--neo-font-main)',
          fontWeight: 800,
          fontSize: '1.05rem',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <span>{title}</span>
        <span
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            fontSize: '1.2rem',
            fontWeight: 900,
          }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            padding: '18px 20px',
            backgroundColor: 'var(--neo-canvas)',
            fontWeight: 600,
            color: '#374151',
            lineHeight: '1.6',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const NeoAccordion = ({ items = [], className = '' }) => {
  return (
    <div className={`neo-accordion ${className}`}>
      {items.map((item, idx) => (
        <NeoAccordionItem
          key={idx}
          title={item.title}
          accent={item.accent || (idx % 3 === 0 ? 'yellow' : idx % 3 === 1 ? 'cyan' : 'lime')}
          defaultOpen={item.defaultOpen || idx === 0}
        >
          {item.content}
        </NeoAccordionItem>
      ))}
    </div>
  );
};

export default NeoAccordion;
