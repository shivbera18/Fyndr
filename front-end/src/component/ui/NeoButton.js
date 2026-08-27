import React from 'react';

const NeoButton = ({
  children,
  onClick,
  variant = 'yellow', // yellow | lime | cyan | coral | purple | orange | dark | white
  size = 'md',        // sm | md | lg
  full = false,
  disabled = false,
  loading = false,
  icon = null,
  type = 'button',
  className = '',
  style = {},
  ...props
}) => {
  const variantClass = `neo-btn-${variant}`;
  const sizeClass = size === 'sm' ? 'neo-btn-sm' : size === 'lg' ? 'neo-btn-lg' : '';
  const fullClass = full ? 'neo-btn-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`neo-btn ${variantClass} ${sizeClass} ${fullClass} ${className}`}
      style={style}
      {...props}
    >
      {loading ? (
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
      ) : icon ? (
        <span className="neo-btn-icon">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

export default NeoButton;
