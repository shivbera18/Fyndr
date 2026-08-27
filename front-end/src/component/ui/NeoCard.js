import React from 'react';

const NeoCard = ({
  children,
  header = null,
  headerAccent = 'yellow', // yellow | cyan | lime | coral | purple | dark
  headerAction = null,
  hoverable = false,
  className = '',
  style = {},
  onClick,
  ...props
}) => {
  const hoverClass = hoverable ? 'neo-card-hover' : '';

  return (
    <div
      className={`neo-card ${hoverClass} ${className}`}
      style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
      onClick={onClick}
      {...props}
    >
      {header && (
        <div className={`neo-card-header-bar neo-card-header-${headerAccent}`}>
          <span>{header}</span>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default NeoCard;
