import React, { useState } from 'react';
import { QRCode } from 'antd';
import NeoButton from '../ui/NeoButton';
import NeoBadge from '../ui/NeoBadge';

const Qrcode = ({ url, eventName = 'Event' }) => {
  const [copied, setCopied] = useState(false);

  const downloadQRCode = () => {
    const canvas = document.getElementById('fyndr-qrcode')?.querySelector('canvas');
    if (canvas) {
      const a = document.createElement('a');
      a.download = `${eventName.replace(/\s+/g, '_')}_QRCode.png`;
      a.href = canvas.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const copyLink = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="p-4 text-center"
      style={{
        backgroundColor: 'var(--neo-white)',
        border: '3px solid var(--neo-black)',
        borderRadius: '12px',
        boxShadow: '4px 4px 0px var(--neo-black)',
      }}
    >
      <NeoBadge variant="yellow" className="mb-3 px-3 py-1">
        📱 GUEST EVENT QR CODE
      </NeoBadge>

      <div
        id="fyndr-qrcode"
        className="d-flex justify-content-center p-3 mb-3"
        style={{
          backgroundColor: '#FFFFFF',
          border: '3px solid var(--neo-black)',
          borderRadius: '12px',
          display: 'inline-block',
        }}
      >
        <QRCode
          value={url || window.location.href}
          size={200}
          bordered={false}
          bgColor="#FFFFFF"
          fgColor="#121212"
        />
      </div>

      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#4B5563', wordBreak: 'break-all' }}>
        {url}
      </p>

      <div className="d-flex gap-2 justify-content-center flex-wrap mt-3">
        <NeoButton variant="yellow" size="sm" onClick={downloadQRCode}>
          💾 Download QR Code (PNG)
        </NeoButton>
        <NeoButton variant="white" size="sm" onClick={copyLink}>
          {copied ? '✓ Link Copied!' : '📋 Copy Link'}
        </NeoButton>
      </div>
    </div>
  );
};

export default Qrcode;
