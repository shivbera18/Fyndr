import React, { useEffect, useState } from "react";
import { API_URL } from "../../utils/api";
import UploadImg from "./Upload_Img";
import Qrcode from "./Qrcode";
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
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "../../lib/utils";

type Photo = {
  _id: string;
  name: string;
  createdAt?: string;
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
  setRefresh?: React.Dispatch<React.SetStateAction<number>>;
};

const InEvent = ({ backbtn, eventID, name, pin, setRefresh }: InEventProps): React.JSX.Element => {
  const [images, setImages] = useState<Photo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<Preview | null>(null);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

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
      window.open(url, "_blank");
    }
  };

  const guestUrl = `${window.location.origin}/collect/${eventID}`;

  const fetchImages = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/get_photos_in_event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventID }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setImages(data);
      } else if (data && Array.isArray(data.photos)) {
        setImages(data.photos);
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
      const res = await fetch(`${getApiBase()}/delete_event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventID }),
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
      const res = await fetch(`${getApiBase()}/delete_photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_id: photoId, event_id: eventID }),
      });
      if (res.ok) {
        setImages((prev) => prev.filter((p) => p._id !== photoId));
      }
    } catch {}
  };

  const copyGuestLink = (): void => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(guestUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        })
        .catch(() => fallbackCopy(guestUrl));
    } else {
      fallbackCopy(guestUrl);
    }
  };

  const fallbackCopy = (text: string): void => {
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

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const t = e.target as HTMLImageElement;
    t.onerror = null;
    t.src = fallbackPlaceholder;
  };

  return (
    <div className="space-y-8">
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
          <Button variant="ghost" size="sm" onClick={backbtn} className="min-h-[40px] flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowQrModal(true)} className="min-h-[40px] flex items-center gap-1.5">
            <QrIcon className="h-4 w-4" />
            Guest QR Code
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(true)} className="min-h-[40px] text-destructive hover:bg-destructive/10 border-destructive/30">
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
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent px-4 py-2 min-h-[44px] flex-1 md:flex-initial"
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

      {/* Upload Photos Section */}
      <UploadImg event_id={eventID} inevent={true} d_ref={fetchImages} />

      {/* Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Event photo gallery ({images.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchImages}
            className="min-h-[40px] flex items-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((photo, index) => {
              const photoUrl = `${getApiBase()}/uploads/${encodeURIComponent(photo.name)}`;
              return (
                <div
                  key={photo._id || index}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border"
                >
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
                  {/* Photo actions overlay (always visible on touch / coarse, hover on desktop) */}
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
                  className="min-h-[40px] flex items-center gap-1.5"
                >
                  {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                  {isZoomed ? "Fit" : "Zoom"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadImage(previewImage.url, previewImage.name)}
                  className="min-h-[40px] flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "rounded-xl border border-border bg-black/95 flex justify-center p-2 max-h-[65vh]",
                isZoomed ? "overflow-auto items-start" : "overflow-hidden items-center"
              )}
            >
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
