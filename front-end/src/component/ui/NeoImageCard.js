import React from 'react';
import NeoBadge from './NeoBadge';

const NeoImageCard = ({
  imageUrl,
  caption,
  tag = null,
  tagVariant = 'yellow',
  onClick,
  hoverable = true,
  className = '',
  style = {},
  aspectRatio = '4/3',
}) => {
  return (
    <figure
      className={`neo-image-card ${hoverable ? 'neo-card-hover' : ''} ${className}`}
      onClick={onClick}
      style={{
        margin: 0,
        backgroundColor: 'var(--neo-white)',
        border: 'var(--neo-border-thick)',
        borderRadius: 'var(--neo-radius-md)',
        boxShadow: 'var(--neo-shadow-md)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style,
      }}
    >
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <img
          src={imageUrl}
          alt={caption || 'Card preview'}
          style={{
            width: '100%',
            aspectRatio,
            objectFit: 'cover',
            display: 'block',
          }}
        />
        {tag && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
            }}
          >
            <NeoBadge variant={tagVariant}>{tag}</NeoBadge>
          </span>
        )}
      </div>

      {caption && (
        <figcaption
          style={{
            borderTop: 'var(--neo-border-thick)',
            padding: '12px 16px',
            backgroundColor: 'var(--neo-white)',
            fontWeight: 800,
            fontSize: '0.95rem',
            color: 'var(--neo-black)',
            lineHeight: '1.4',
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

export default NeoImageCard;
