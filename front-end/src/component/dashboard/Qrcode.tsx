import { useState } from "react";
import { QRCode } from "antd";
import { Button, Reveal } from "../landing/primitives";

type Props = {
  url: string;
  eventName?: string;
};

export default function Qrcode({ url, eventName = "Event" }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const downloadQRCode = () => {
    const container = document.getElementById("fyndr-qrcode");
    const canvas = container?.querySelector("canvas");
    if (canvas) {
      const a = document.createElement("a");
      a.download = `${eventName.replace(/\s+/g, "_")}_QRCode.png`;
      a.href = canvas.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const svg = container?.querySelector("svg");
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvasElem = document.createElement("canvas");
        const ctx = canvasElem.getContext("2d");
        const img = new Image();
        img.onload = () => {
          canvasElem.width = img.width || 200;
          canvasElem.height = img.height || 200;
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvasElem.width, canvasElem.height);
            ctx.drawImage(img, 0, 0);
          }
          const a = document.createElement("a");
          a.download = `${eventName.replace(/\s+/g, "_")}_QRCode.png`;
          a.href = canvasElem.toDataURL("image/png");
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };
        img.onerror = () => {
          console.error("Failed to rasterize SVG QR Code to canvas for download.");
        };
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
      }
    }
  };

  const copyLink = () => {
    if (url) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(url)
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

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Reveal>
      <div className="fy-card" style={{ textAlign: "center" }}>
        <span className="fy-badge">Guest event QR code</span>

        <div style={{ display: "flex", justifyContent: "center", margin: "1rem 0" }}>
          <span id="fyndr-qrcode" className="fy-qr-frame">
            <QRCode
              type="canvas"
              value={url || window.location.href}
              size={200}
              bordered={false}
              bgColor="#FFFFFF"
              fgColor="#121212"
            />
          </span>
        </div>

        <p style={{ wordBreak: "break-all" }}>{url}</p>

        <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
          <Button variant="default" size="sm" onClick={downloadQRCode}>
            Download QR code (PNG)
          </Button>
          <Button variant={copied ? "default" : "secondary"} size="sm" onClick={copyLink}>
            {copied ? "✓ Link copied!" : "Copy link"}
          </Button>
        </div>
      </div>
    </Reveal>
  );
}
