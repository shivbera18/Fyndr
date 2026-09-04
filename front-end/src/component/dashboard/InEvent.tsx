import React, { useEffect, useState } from "react";
import { API_URL } from "../../utils/api";
import UploadImg from "./Upload_Img";
import Qrcode from "./Qrcode";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ResponsiveModal } from "../../components/ui/responsive-modal";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  QrCode as QrIcon,
  RefreshCw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "../../lib/utils";
type Photo = {
  _id: string;
  name: string;
  createdAt?: string;
  folder_name?: string;
  isSelected?: boolean;
  selectionNote?: string;
};

type Preview = {
  url: string;
  name: string;
  index: number;
  createdAt?: string;
};

type InEventProps = {
  backbtn: () => void;
  eventID: string;
  name: string;
  pin: string;
  ownerId: string;
  initialFolders: { name: string }[];
  initialLimit: number;
  initialLocked: boolean;
  setRefresh?: React.Dispatch<React.SetStateAction<number>>;
};

const InEvent = ({ backbtn, eventID, name, pin, ownerId, initialFolders, initialLimit, initialLocked, setRefresh }: InEventProps): React.JSX.Element => {
  const [images, setImages] = useState<Photo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<Preview | null>(null);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [folders, setFolders] = useState<{ name: string }[]>(initialFolders || []);
  const [activeFolder, setActiveFolder] = useState<string>("All");
  const [newFolder, setNewFolder] = useState<string>("");
  const [folderError, setFolderError] = useState<string>("");
  const [showPickedOnly, setShowPickedOnly] = useState<boolean>(false);
  const [studioName, setStudioName] = useState<string>("");
  const [wmOn, setWmOn] = useState<boolean>(true);
  const [insights, setInsights] = useState<{ scans: number; selfies: number; downloads: number; gate: boolean } | null>(null);
  const [savingFolders, setSavingFolders] = useState<boolean>(false);
  const [selectionLimit, setSelectionLimit] = useState<string>(initialLimit > 0 ? String(initialLimit) : "");
  const [selectionLocked, setSelectionLocked] = useState<boolean>(initialLocked || false);
  const [proofBusy, setProofBusy] = useState<boolean>(false);
  const [proofMsg, setProofMsg] = useState<string>("");
  useEffect(() => {
    setFolders(initialFolders || []);
    setActiveFolder("All");
    setShowPickedOnly(false);
    setSelectionLimit(initialLimit > 0 ? String(initialLimit) : "");
    setSelectionLocked(initialLocked || false);
  }, [eventID, initialFolders, initialLimit, initialLocked]);

  useEffect(() => {
    if (!ownerId) return;
    fetch(`${getApiBase()}/find_studio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ create_by: ownerId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === "object" && "studio_name" in data && typeof data.studio_name === "string") {
          setStudioName(data.studio_name);
        }
      })
      .catch(() => {});
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId || !eventID) return;
    fetch(`${getApiBase()}/display_event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: ownerId, create_by: ownerId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list: unknown = Array.isArray(data) ? data : data && typeof data === "object" && "events" in data ? data.events : [];
        if (!Array.isArray(list)) return;
        const found: unknown = list.find((e: unknown) => e && typeof e === "object" && "_id" in e && e._id === eventID);
        if (found && typeof found === "object") {
          const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
          setInsights({
            scans: num("scanCount" in found ? found.scanCount : 0),
            selfies: num("selfieCount" in found ? found.selfieCount : 0),
            downloads: num("downloadCount" in found ? found.downloadCount : 0),
            gate: "requireLead" in found ? found.requireLead === true : false,
          });
        }
      })
      .catch(() => {});
  }, [ownerId, eventID]);

  const fallbackPlaceholder =
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F3F4F6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20font-weight%3D%22bold%22%20fill%3D%22%239CA3AF%22%3E%E2%9A%A0%EF%B8%8F%20Image%20Unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";

  const getApiBase = (): string => API_URL;

  const downloadImage = async (url: string, filename: string): Promise<void> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const guestUrl = `${window.location.origin}/collect/${eventID}`;

  const fetchImages = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/in-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: eventID, event_id: eventID }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setImages(data);
      } else if (data && Array.isArray(data.photos)) {
        setImages(data.photos);
      } else if (data && Array.isArray(data.result)) {
        setImages(data.result);
      } else {
        setImages([]);
      }
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventID]);

  const handleDeleteEvent = async (): Promise<void> => {
    try {
      const res = await fetch(`${getApiBase()}/delete-event`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: eventID, event_id: eventID }),
      });
      if (res.ok) {
        setShowDeleteModal(false);
        if (setRefresh) setRefresh((prev) => prev + 1);
        backbtn();
      }
    } catch {}
  };

  const handleDeletePhoto = async (photoId: string): Promise<void> => {
    try {
      const res = await fetch(`${getApiBase()}/delete-img`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: photoId, photo_id: photoId, event_id: eventID }),
      });
      if (res.ok) {
        setImages((prev) => prev.filter((p) => p._id !== photoId));
      }
    } catch {}
  };
  const persistFolders = async (next: { name: string }[]): Promise<boolean> => {
    setSavingFolders(true);
    setFolderError("");
    try {
      const res = await fetch(`${getApiBase()}/events/${eventID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_id: ownerId, folders: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data && typeof data === "object" && "message" in data ? String(data.message) : "Could not save folders.";
        setFolderError(msg);
        return false;
      }
      const saved = data && typeof data === "object" && "updatedEvent" in data ? data.updatedEvent : null;
      const savedFolders =
        saved && typeof saved === "object" && "folders" in saved && Array.isArray(saved.folders)
          ? saved.folders.filter((f: unknown): f is { name: string } => !!f && typeof f === "object" && "name" in f && typeof f.name === "string")
          : next;
      setFolders(savedFolders);
      return true;
    } catch {
      setFolderError("Could not save folders. Please check connection.");
      return false;
    } finally {
      setSavingFolders(false);
    }
  };

  const handleAddFolder = async (): Promise<void> => {
    const trimmed = newFolder.trim().slice(0, 60);
    if (!trimmed) return;
    if (folders.some((f) => f.name.toLowerCase() === trimmed.toLowerCase()) || trimmed.toLowerCase() === "general") {
      setFolderError("That folder already exists.");
      return;
    }
    if (await persistFolders([...folders, { name: trimmed }])) setNewFolder("");
  };

  const handleRemoveFolder = async (folderName: string): Promise<void> => {
    if (await persistFolders(folders.filter((f) => f.name !== folderName))) {
      if (activeFolder === folderName) setActiveFolder("All");
    }
  };

  const selectedCount = images.filter((p) => p.isSelected).length;
  const selectUrl = `${window.location.origin}/select/${eventID}`;

  const saveSelectionLimit = async (): Promise<void> => {
    const n = selectionLimit.trim() === "" ? 0 : Number(selectionLimit);
    if (!Number.isInteger(n) || n < 0 || n > 100000) {
      setProofMsg("Limit must be a whole number 0–100000 (0 = unlimited).");
      return;
    }
    setProofBusy(true);
    setProofMsg("");
    try {
      const res = await fetch(`${getApiBase()}/events/${eventID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_id: ownerId, selectionLimit: n }),
      });
      setProofMsg(res.ok ? `Album limit set to ${n === 0 ? "unlimited" : n}.` : "Could not save limit.");
    } catch {
      setProofMsg("Could not save limit. Please check connection.");
    } finally {
      setProofBusy(false);
    }
  };

  const toggleLock = async (): Promise<void> => {
    setProofBusy(true);
    setProofMsg("");
    try {
      const res = await fetch(`${getApiBase()}/events/${eventID}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_id: ownerId, locked: !selectionLocked }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setProofMsg("Could not change lock. Please try again.");
        return;
      }
      const lockedNow = data && typeof data === "object" && "selectionLocked" in data && typeof data.selectionLocked === "boolean" ? data.selectionLocked : !selectionLocked;
      setSelectionLocked(lockedNow);
      setProofMsg(lockedNow ? "Selection locked — clients can no longer change picks." : "Selection unlocked.");
    } catch {
      setProofMsg("Could not change lock. Please check connection.");
    } finally {
      setProofBusy(false);
    }
  };

  const toggleGate = async (): Promise<void> => {
    const next = !(insights?.gate || false);
    setProofBusy(true);
    setProofMsg("");
    try {
      const res = await fetch(`${getApiBase()}/events/${eventID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_id: ownerId, requireLead: next }),
      });
      if (!res.ok) throw new Error("gate failed");
      setInsights((prev) => (prev ? { ...prev, gate: next } : { scans: 0, selfies: 0, downloads: 0, gate: next }));
      setProofMsg(next ? "Lead gate on — guests share name & phone before downloading." : "Lead gate off.");
    } catch {
      setProofMsg("Could not change gate. Please check connection.");
    } finally {
      setProofBusy(false);
    }
  };

  const csvCell = (v: unknown): string => {
    const s = String(v ?? "");
    // Formula-injection guard: Excel/Sheets execute =-+@-leading cells
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const downloadLeadsCsv = async (): Promise<void> => {
    setProofBusy(true);
    setProofMsg("");
    try {
      const res = await fetch(`${getApiBase()}/events/${eventID}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_id: ownerId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !Array.isArray(data.leads)) {
        setProofMsg("Could not load leads.");
        return;
      }
      const rows: string[] = ["name,phone,photos_found,captured_at"];
      for (const lead of data.leads) {
        if (!lead || typeof lead !== "object") continue;
        const row = [
          "name" in lead ? lead.name : "",
          "phone" in lead ? lead.phone : "",
          "photos_found" in lead ? lead.photos_found : 0,
          "createdAt" in lead ? lead.createdAt : "",
        ].map(csvCell);
        rows.push(row.join(","));
      }
      const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${eventID}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setProofMsg(`Downloaded ${rows.length - 1} guest lead${rows.length === 2 ? "" : "s"}.`);
    } catch {
      setProofMsg("Could not load leads. Please check connection.");
    } finally {
      setProofBusy(false);
    }
  };

  const copyLightroom = async (): Promise<void> => {
    setProofBusy(true);
    setProofMsg("");
    try {
      const res = await fetch(`${getApiBase()}/events/${eventID}/lightroom-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_id: ownerId }),
      });

      const text = await res.text();
      if (!res.ok || !text) {
        setProofMsg("No picks yet — nothing to export.");
        return;
      }
      const picked = images.filter((p) => p.isSelected).length;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setProofMsg(`Copied ${picked} picked filename${picked === 1 ? "" : "s"} — paste into Lightroom Library Filter → Text → Filename.`);
      } else {
        setProofMsg(text);
      }
    } catch {
      setProofMsg("Could not export. Please check connection.");
    } finally {
      setProofBusy(false);
    }
  };

  const downloadStandee = (): void => {
    const qrEl = document.querySelector("#fyndr-standee-qr canvas");
    if (!qrEl || !(qrEl instanceof HTMLCanvasElement)) {
      setProofMsg("QR is still preparing — please try again in a second.");
      return;
    }
    const W = 1240;
    const H = 1754;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setProofMsg("Could not generate standee in this browser.");
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#09090b";
    ctx.textAlign = "center";
    const brand = studioName.trim() || name;
    ctx.font = "bold 72px system-ui, sans-serif";
    ctx.fillText(brand.slice(0, 28), W / 2, 170, W - 160);
    ctx.font = "500 40px system-ui, sans-serif";
    ctx.fillStyle = "#52525b";
    ctx.fillText("Scan to find your photos", W / 2, 240);
    ctx.drawImage(qrEl, W / 2 - 300, 320, 600, 600);
    ctx.fillStyle = "#09090b";
    ctx.font = "bold 88px ui-monospace, monospace";
    if (pin) ctx.fillText(`PIN ${pin}`, W / 2, 1050, W - 160);
    else ctx.fillText("No PIN — scan & go", W / 2, 1050, W - 160);
    ctx.font = "500 44px system-ui, sans-serif";
    ctx.fillStyle = "#3f3f46";
    ctx.fillText("1. Scan the QR code", W / 2, 1180);
    ctx.fillText("2. Take a quick selfie", W / 2, 1250);
    ctx.fillText("3. Get your photos instantly", W / 2, 1320);
    ctx.font = "500 36px system-ui, sans-serif";
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText("No app needed · Powered by Fyndr", W / 2, 1650);
    const a = document.createElement("a");
    a.download = `${name.replace(/\s+/g, "_")}_standee.png`;
    a.href = canvas.toDataURL("image/png");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setProofMsg("Standee downloaded — print A5/4×6 and place on tables.");
  };

  const guestCopied = (): void => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const copyGuestLink = (): void => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(guestUrl)
        .then(guestCopied)
        .catch(() => fallbackCopy(guestUrl, guestCopied));
    } else {
      fallbackCopy(guestUrl, guestCopied);
    }
  };

  const fallbackCopy = (text: string, onOk?: () => void): void => {
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
      if (onOk) onOk();
    } catch {}
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const t = e.target as HTMLImageElement;
    t.onerror = null;
    t.src = fallbackPlaceholder;
  };

  const inFolder = (p: Photo, folder: string): boolean =>
    folder === "All" || (p.folder_name || "General") === folder;
  const visibleImages = images.filter((p) => inFolder(p, activeFolder) && (!showPickedOnly || p.isSelected));

  return (
    <div className="space-y-8">
      {/* Hidden high-res QR pixel source for the printable standee */}
      <div id="fyndr-standee-qr" aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <QRCodeCanvas value={guestUrl} size={512} level="H" includeMargin bgColor="#FFFFFF" fgColor="#121212" />
      </div>
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Event detail
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
            {name}
          </h1>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={backbtn} className="min-h-[44px] flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowQrModal(true)} className="min-h-[44px] flex items-center gap-1.5">
            <QrIcon className="h-4 w-4" />
            Guest QR Code
          </Button>
          <Button variant="outline" size="sm" onClick={downloadStandee} title="Download printable table standee (PNG)" className="min-h-[44px] flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            Table standee
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(true)} className="min-h-[44px] text-destructive hover:bg-destructive/10 border-destructive/30">
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete Event
          </Button>
        </div>
      </div>

      {/* Event Details Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Security PIN:</span>
                <Badge variant="outline" className="font-mono text-base px-3 py-1 tracking-widest font-bold">
                  {pin || "123456"}
                </Badge>
                <Badge variant="brand">{images.length} photos</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Guests enter this PIN on their phone to access the event selfie search.
              </p>
            </div>

            <div className="space-y-2 flex flex-col md:items-end">
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyGuestLink}
                  className="min-h-[44px] flex items-center gap-1.5 flex-1 md:flex-initial"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Link Copied!" : "Copy Guest Link"}
                </Button>
                <a
                  href={guestUrl}
                  rel="noopener noreferrer"
                >
                  Open Guest View
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all text-left md:text-right">
                {guestUrl}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-event folders */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {["All", ...folders.map((f) => f.name)].map((folderTab) => {
              const count = images.filter((p) => inFolder(p, folderTab)).length;
              const isActive = activeFolder === folderTab;
              return (
                <Button
                  key={folderTab}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFolder(folderTab)}
                  aria-pressed={isActive}
                  className="min-h-[44px]"
                >
                  {folderTab} ({count})
                </Button>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddFolder();
              }}
              placeholder="New sub-event (e.g. Mehendi)"
              aria-label="New sub-event folder name"
              maxLength={60}
              className="flex-1 min-h-[44px] rounded-lg border border-input bg-background px-3 text-sm"
            />
            <Button type="button" size="sm" onClick={() => void handleAddFolder()} disabled={savingFolders} className="min-h-[44px]">
              {savingFolders ? "Saving…" : "Add folder"}
            </Button>
          </div>
          {folderError ? <p role="alert" className="text-xs text-destructive">{folderError}</p> : null}
          {folders.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {folders.map((f) => (
                <Badge key={f.name} variant="outline" className="flex items-center gap-1.5 py-1.5">
                  {f.name}
                  <button
                    type="button"
                    onClick={() => void handleRemoveFolder(f.name)}
                    disabled={savingFolders}
                    className="ml-1 rounded p-0.5 text-muted-foreground hover:text-destructive"
                    title={`Remove ${f.name} (photos move to General)`}
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
      {/* Client proofing */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Client album picks</h2>
            <Badge variant={selectionLocked ? "destructive" : "brand"}>
              {selectedCount} picked{selectionLocked ? " · locked" : ""}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono break-all">{selectUrl}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const done = (): void => setProofMsg("Selection link copied — share it with the couple + PIN.");
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(selectUrl).then(done).catch(() => fallbackCopy(selectUrl, done));
                } else {
                  fallbackCopy(selectUrl, done);
                }
              }}
              className="min-h-[44px]"
            >
              <Copy className="h-4 w-4" /> Copy selection link
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void toggleLock()} disabled={proofBusy} className="min-h-[44px]">
              {selectionLocked ? "Unlock picks" : "Lock picks"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void copyLightroom()} disabled={proofBusy} className="min-h-[44px]">
              <Download className="h-4 w-4" /> Copy for Lightroom
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label htmlFor="fy-sel-limit" className="text-sm font-medium whitespace-nowrap">
              Album limit (0 = unlimited)
            </label>
            <input
              id="fy-sel-limit"
              value={selectionLimit}
              onChange={(e) => setSelectionLimit(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 120"
              className="w-full sm:w-32 min-h-[44px] rounded-lg border border-input bg-background px-3 text-sm"
            />
            <Button type="button" size="sm" onClick={() => void saveSelectionLimit()} disabled={proofBusy} className="min-h-[44px]">
              Save limit
            </Button>
          </div>
          {proofMsg ? <p role="status" className="text-xs text-muted-foreground break-all">{proofMsg}</p> : null}
        </CardContent>
      </Card>
      {/* Guest insights & leads */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Guest insights</h2>
            {insights?.gate ? <Badge variant="brand">Lead gate on</Badge> : null}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "QR scans", value: insights?.scans ?? "—" },
              { label: "Selfies", value: insights?.selfies ?? "—" },
              { label: "Downloads", value: insights?.downloads ?? "—" },
              { label: "Album picks", value: selectedCount },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={insights?.gate ? "default" : "outline"}
              size="sm"
              aria-pressed={insights?.gate || false}
              onClick={() => void toggleGate()}
              disabled={proofBusy}
              title="Ask guests for name & phone before they download"
              className="min-h-[44px]"
            >
              Lead gate {insights?.gate ? "on" : "off"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void downloadLeadsCsv()}
              disabled={proofBusy}
              className="min-h-[44px] flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" /> Download leads (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>



      {/* Upload Photos Section */}
      <UploadImg
        event_id={eventID}
        inevent={true}
        d_ref={fetchImages}
        folder_name={activeFolder === "All" ? "General" : activeFolder}
      />

      {/* Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Event photo gallery ({visibleImages.length}
            {activeFolder === "All" ? "" : ` in ${activeFolder}`})
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant={showPickedOnly ? "default" : "outline"}
              size="sm"
              aria-pressed={showPickedOnly}
              onClick={() => setShowPickedOnly((v) => !v)}
              className="min-h-[44px] flex items-center gap-1.5"
            >
              ♥ Picked ({images.filter((p) => p.isSelected).length})
            </Button>
            <Button
              variant={wmOn ? "default" : "outline"}
              size="sm"
              aria-pressed={wmOn}
              onClick={() => setWmOn((v) => !v)}
              title="Overlay studio watermark on web previews (downloads stay clean)"
              className="min-h-[44px] flex items-center gap-1.5"
            >
              Watermark {wmOn ? "on" : "off"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchImages}
              className="min-h-[44px] flex items-center gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading photos…</p>
          </div>
        ) : images.length === 0 ? (
          <Card className="text-center py-12 px-4">
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                No photos in this event yet. Use the upload box above to add photos!
              </p>
            </CardContent>
          </Card>
        ) : visibleImages.length === 0 ? (
          <Card className="text-center py-12 px-4">
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                No photos in {activeFolder} yet. Select this folder above and upload — new photos land here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibleImages.map((photo, index) => {
              const photoUrl = `${getApiBase()}/uploads/${encodeURIComponent(photo.name)}`;
              return (
                <div
                  key={photo._id || index}
                  className={cn(
                    "group relative aspect-square rounded-xl overflow-hidden bg-muted border",
                    photo.isSelected ? "border-primary ring-2 ring-primary/40" : "border-border"
                  )}
                  title={photo.selectionNote ? `Client note: ${photo.selectionNote}` : undefined}
                >
                  {photo.isSelected ? (
                    <span className="absolute top-2 left-2 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow">
                      ♥ Picked
                    </span>
                  ) : null}
                  <img
                    src={photoUrl}
                    alt={`Event item ${index + 1}`}
                    onError={handleImgError}
                    loading="lazy"
                    onClick={() => {
                      setIsZoomed(false);
                      setPreviewImage({
                        url: photoUrl,
                        name: photo.name,
                        index: index + 1,
                        createdAt: photo.createdAt,
                      });
                    }}
                    className="h-full w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                  />
                  {wmOn ? (
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                      <span className="-rotate-[30deg] whitespace-nowrap text-lg font-bold text-white/25 select-none">
                        {studioName.trim() || name} • {studioName.trim() || name}
                      </span>
                    </span>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex items-center justify-between opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-mono text-white/90">#{index + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(photoUrl, photo.name);
                        }}
                        className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-lg bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                        title="Download photo"
                        aria-label="Download photo"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo._id);
                        }}
                        className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-lg bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                        title="Delete photo"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 flex gap-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        <Button variant="ghost" size="default" onClick={backbtn} className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="secondary" size="default" onClick={() => setShowQrModal(true)} className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5">
          <QrIcon className="h-4 w-4" />
          QR Code
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={() => setShowDeleteModal(true)}
          className="min-h-[44px] text-destructive hover:bg-destructive/10 border-destructive/30 px-3"
          aria-label="Delete Event"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Guest QR Code Modal (Drawer on mobile, Dialog on desktop) */}
      <ResponsiveModal
        open={showQrModal}
        onOpenChange={setShowQrModal}
        title={`Guest QR code — ${name}`}
        description="Share this code with guests to access the photo search."
      >
        <div className="pt-2">
          <Qrcode url={guestUrl} eventName={name} />
        </div>
      </ResponsiveModal>

      {/* Delete Event Confirmation Modal */}
      <ResponsiveModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete event confirmation"
        description="This action cannot be undone."
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-foreground">
            Are you sure you want to delete event <strong>&quot;{name}&quot;</strong>?
          </p>
          <p className="text-xs text-muted-foreground">
            This will permanently delete the event, all its photos, and its face recognition vector index.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteEvent}
              className="min-h-[44px]"
            >
              Yes, Delete Entire Event
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Photo Preview Modal */}
      <ResponsiveModal
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewImage(null);
            setIsZoomed(false);
          }
        }}
        className="sm:max-w-3xl"
        title={previewImage ? `Photo preview #${previewImage.index}` : "Photo preview"}
      >
        {previewImage && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="max-w-full sm:max-w-[60%]">
                <p className="font-semibold text-sm text-foreground truncate" title={previewImage.name}>
                  {previewImage.name ? previewImage.name.replace(/^\d+-/, "") : "Photo"}
                </p>
                {previewImage.createdAt && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Uploaded: {new Date(previewImage.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  className="min-h-[44px] flex items-center gap-1.5"
                >
                  {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                  {isZoomed ? "Fit" : "Zoom"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadImage(previewImage.url, previewImage.name)}
                  className="min-h-[44px] flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "relative rounded-xl border border-border bg-black/95 flex justify-center p-2 max-h-[65vh]",
                isZoomed ? "overflow-auto items-start" : "overflow-hidden items-center"
              )}
            >
              {wmOn ? (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
                  <span className="-rotate-[30deg] whitespace-nowrap text-2xl font-bold text-white/25 select-none">
                    {studioName.trim() || name}
                  </span>
                </span>
              ) : null}
              <img
                src={previewImage.url}
                alt="Preview"
                onError={handleImgError}
                onClick={() => setIsZoomed((prev) => !prev)}
                className={cn(
                  "rounded-lg transition-transform",
                  isZoomed
                    ? "max-w-none max-h-none object-none cursor-zoom-out"
                    : "max-w-full max-h-[60vh] object-contain cursor-zoom-in"
                )}
              />
            </div>
          </div>
        )}
      </ResponsiveModal>
    </div>
  );
};

export default InEvent;
