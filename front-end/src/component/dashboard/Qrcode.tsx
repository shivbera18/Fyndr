import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Check, Copy, Download } from "lucide-react";

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
    }
  };

  const copyLink = () => {
    if (!url) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        })
        .catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <Card className="text-center">
      <CardContent className="p-6 flex flex-col items-center space-y-4">
        <Badge variant="secondary">Guest event QR code</Badge>

        <div className="flex items-center justify-center p-4 bg-white rounded-2xl border border-border shadow-sm">
          <span id="fyndr-qrcode" className="inline-block">
            <QRCodeCanvas
              value={url || window.location.href}
              size={200}
              level="H"
              includeMargin
              bgColor="#FFFFFF"
              fgColor="#121212"
            />
          </span>
        </div>

        <p className="text-xs text-muted-foreground font-mono break-all max-w-sm px-2">
          {url}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full">
          <Button
            variant="secondary"
            onClick={downloadQRCode}
            className="min-h-[44px] flex items-center gap-2 flex-1 sm:flex-initial"
          >
            <Download className="h-4 w-4" />
            Download QR (PNG)
          </Button>
          <Button
            variant={copied ? "default" : "outline"}
            onClick={copyLink}
            className="min-h-[44px] flex items-center gap-2 flex-1 sm:flex-initial"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Link copied!" : "Copy link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
