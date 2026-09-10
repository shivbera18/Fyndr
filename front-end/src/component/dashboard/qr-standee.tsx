import { QRCodeCanvas } from "qrcode.react";

// ponytail: qrcode.react (~14KB) loads only with the QR features that need
// it — never in the base dashboard chunk.
export function StandeeQr({ value }: { value: string }): React.JSX.Element {
  return (
    <div id="fyndr-standee-qr" aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <QRCodeCanvas value={value} size={512} level="H" includeMargin bgColor="#FFFFFF" fgColor="#121212" />
    </div>
  );
}

export default StandeeQr;
