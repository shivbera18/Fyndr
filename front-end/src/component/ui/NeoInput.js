import React from 'react';

const NeoInput = ({
  label = null,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  error = null,
  helpText = null,
  multiline = false,
  rows = 3,
  className = '',
  style = {},
  ...props
}) => {
  return (
    <div className={`neo-input-group ${className}`} style={style}>
      {label && (
        <label className="neo-label">
          {label} {required && <span style={{ color: 'var(--neo-coral)' }}>*</span>}
        </label>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className="neo-textarea"
          {...props}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="neo-input"
          {...props}
        />
      )}
      {helpText && !error && (
        <small style={{ display: 'block', marginTop: 4, fontWeight: 600, color: 'var(--neo-muted)' }}>
          {helpText}
        </small>
      )}
      {error && (
        <small style={{ display: 'block', marginTop: 4, fontWeight: 800, color: 'var(--neo-coral)' }}>
          {error}
        </small>
      )}
    </div>
  );
};

export default NeoInput;
