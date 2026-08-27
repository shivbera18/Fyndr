import React from 'react';

const NeoBadge = ({
  children,
  variant = 'yellow', // yellow | lime | cyan | coral | purple | dark | white
  icon = null,
  className = '',
  style = {},
  ...props
}) => {
  const variantClass = `neo-badge-${variant}`;

  return (
    <span className={`neo-badge ${variantClass} ${className}`} style={style} {...props}>
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
};

export default NeoBadge;
