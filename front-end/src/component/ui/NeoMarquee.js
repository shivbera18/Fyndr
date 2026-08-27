import React from 'react';

const NeoMarquee = ({
  items = [],
  speed = '25s',
  bgColor = 'var(--neo-yellow)',
  textColor = 'var(--neo-black)',
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`neo-marquee-container ${className}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderTop: 'var(--neo-border-thick)',
        borderBottom: 'var(--neo-border-thick)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        userSelect: 'none',
        padding: '14px 0',
        ...style,
      }}
    >
      <div
        className="neo-marquee-track"
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          animation: `neoMarqueeScroll ${speed} linear infinite`,
          gap: '32px',
        }}
      >
        {items.concat(items).map((item, idx) => (
          <span
            key={idx}
            style={{
              fontFamily: 'var(--neo-font-main)',
              fontWeight: 900,
              fontSize: '1.2rem',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {item}
            <span style={{ fontSize: '1.4rem', opacity: 0.75 }}>★</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default NeoMarquee;
