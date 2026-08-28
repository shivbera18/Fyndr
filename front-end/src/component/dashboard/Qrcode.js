import React, { useState } from 'react';
import { QRCode } from 'antd';
import NeoButton from '../ui/NeoButton';
import NeoBadge from '../ui/NeoBadge';

const Qrcode = ({ url, eventName = 'Event' }) => {
  const [copied, setCopied] = useState(false);

  const downloadQRCode = () => {
    const container = document.getElementById('fyndr-qrcode');
    const canvas = container?.querySelector('canvas');
    if (canvas) {
      const a = document.createElement('a');
      a.download = `${eventName.replace(/\s+/g, '_')}_QRCode.png`;
      a.href = canvas.toDataURL('image/png');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const svg = container?.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvasElem = document.createElement('canvas');
        const ctx = canvasElem.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvasElem.width = img.width || 200;
          canvasElem.height = img.height || 200;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvasElem.width, canvasElem.height);
          ctx.drawImage(img, 0, 0);
          const a = document.createElement('a');
          a.download = `${eventName.replace(/\s+/g, '_')}_QRCode.png`;
          a.href = canvasElem.toDataURL('image/png');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };
        img.onerror = () => {
          console.error('Failed to rasterize SVG QR Code to canvas for download.');
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      }
    }
  };

  const copyLink = () => {
    if (url) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => fallbackCopy(url));
      } else {
        fallbackCopy(url);
      }
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
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

      <div className="d-flex justify-content-center my-3">
        <div
          id="fyndr-qrcode"
          className="p-3"
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid var(--neo-black)',
            borderRadius: '12px',
            boxShadow: '3px 3px 0px var(--neo-black)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QRCode
            type="canvas"
            value={url || window.location.href}
            size={200}
            bordered={false}
            bgColor="#FFFFFF"
            fgColor="#121212"
          />
        </div>
      </div>

      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))', wordBreak: 'break-all' }}>
        {url}
      </p>

      <div className="d-flex gap-2 justify-content-center flex-wrap mt-3">
        <NeoButton variant="yellow" size="sm" onClick={downloadQRCode}>
          💾 Download QR Code (PNG)
        </NeoButton>
        <NeoButton variant={copied ? 'lime' : 'white'} size="sm" onClick={copyLink}>
          {copied ? '✓ Link Copied!' : '📋 Copy Link'}
        </NeoButton>
      </div>
    </div>
  );
};

export default Qrcode;
