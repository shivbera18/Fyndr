import { Aperture, Camera, QrCode, ScanFace, Share2 } from "lucide-react";

const SOURCES = [
  { name: "Weddings", icon: <Camera size={19} /> },
  { name: "Sangeets", icon: <Share2 size={19} /> },
  { name: "Corporate galas", icon: <Aperture size={19} /> },
  { name: "QR check-in", icon: <QrCode size={19} /> },
  { name: "Selfie search", icon: <ScanFace size={19} /> },
];

export default function KnowledgeMarquee(): React.JSX.Element {
  const duplicated = [...SOURCES, ...SOURCES, ...SOURCES];

  return (
    <div className="marquee-strip-wrapper" aria-label="Events Fyndr covers">
      <div className="marquee-strip-track">
        {duplicated.map((item, index) => (
          <div key={`${item.name}-${index}`} className="marquee-source-pill">
            <span className="source-pill-logo">{item.icon}</span>
            <span className="source-pill-name">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
