import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ResponsiveModal } from "../../components/ui/responsive-modal";
import { API_URL, ML_URL } from "../../utils/api";
import {
  ArrowLeft,
  Camera,
  Download,
  ImagePlus,
  Loader2,
  Maximize2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "../../lib/utils";

type MatchedPhoto = {
  id?: string;
  name: string;
  similarity?: number;
};

type PreviewPhoto = {
  url: string;
  name: string;
  sim: number;
};

const CameraCaptureWithMask = (): React.JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();

  // Fallback to sessionStorage so mobile browser refresh does not lose event context
  const locationState = location.state;
  const initialEventId =
    (typeof locationState === "string" ? locationState : null) ||
    sessionStorage.getItem("fy-last-event");

  const [eventId] = useState<string | null>(initialEventId);

  useEffect(() => {
    if (!eventId) return;
    sessionStorage.setItem("fy-last-event", eventId);
    // Fail-closed + fresh: deep links hydrate the flag; owner toggles apply every mount.
    fetch(`${API_URL}/collect_event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: eventId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const ev: unknown = data && typeof data === "object" && "event" in data ? data.event : null;
        const gate = ev && typeof ev === "object" && "requireLead" in ev ? ev.requireLead === true : false;
        sessionStorage.setItem(`fy-require-lead-${eventId}`, gate ? "1" : "0");
      })
      .catch(() => {});
  }, [eventId]);

  const webcamRef = useRef<Webcam>(null);
  const uploadedImageUrlRef = useRef<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [matchedPhotos, setMatchedPhotos] = useState<MatchedPhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  // Match sensitivity — Flask validates 0.1–0.9, default 0.34 (Balanced)
  const [threshold, setThreshold] = useState<number>(0.34);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhoto | null>(null);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [useUploadMode, setUseUploadMode] = useState<boolean>(false);
  const [showLead, setShowLead] = useState<boolean>(false);
  const [leadName, setLeadName] = useState<string>("");
  const [leadPhone, setLeadPhone] = useState<string>("");
  const [leadError, setLeadError] = useState<string>("");
  const [leadBusy, setLeadBusy] = useState<boolean>(false);
  const [pendingDl, setPendingDl] = useState<{ url: string; filename: string } | null>(null);

  const fallbackPlaceholder =
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F3F4F6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20font-weight%3D%22bold%22%20fill%3D%22%239CA3AF%22%3E%E2%9A%A0%EF%B8%8F%20Image%20Unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";

  const captureAndMatch = async (): Promise<void> => {
    if (!webcamRef.current) return;

    try {
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) {
        setErrorMessage("Failed to capture image from camera. Please allow camera permissions.");
        return;
      }

      setImageSrc(screenshot);
      const blob = await fetch(screenshot).then((res) => res.blob());
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });

      await processSelfieMatch(file);
    } catch {
      setErrorMessage("Error capturing selfie. Please try again.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (uploadedImageUrlRef.current) URL.revokeObjectURL(uploadedImageUrlRef.current);
      uploadedImageUrlRef.current = URL.createObjectURL(file);
      setImageSrc(uploadedImageUrlRef.current);
      await processSelfieMatch(file);
    }
  };

  const processSelfieMatch = async (file: File, overrideThreshold?: number): Promise<void> => {
    if (!eventId) {
      setErrorMessage("Event session expired. Please rescan the event QR code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("event_id", eventId);
      formData.append("threshold", String(overrideThreshold ?? threshold));

      const response = await axios.post(`${ML_URL}/match_faces`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      if (response.data.matches && response.data.matches.length > 0) {
        setMatchedPhotos(response.data.matches as MatchedPhoto[]);
      } else {
        setMatchedPhotos([]);
        setErrorMessage(response.data.message || "No matching photos found in this event.");
      }
    } catch (error: unknown) {
      setMatchedPhotos([]);
      let msg = "Face detection failed. Please ensure your face is clearly visible.";
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data && typeof data === "object") {
          if ("error" in data && data.error) msg = String(data.error);
          else if ("message" in data && data.message) msg = String(data.message);
        } else if (error.message) {
          msg = error.message;
        }
      } else if (error instanceof Error) {
        msg = error.message;
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };
  const retakeSelfie = (): void => {
    if (uploadedImageUrlRef.current) URL.revokeObjectURL(uploadedImageUrlRef.current);
    uploadedImageUrlRef.current = null;
    setImageSrc(null);
    setMatchedPhotos([]);
    setErrorMessage("");
  };

  const retryLoose = async (): Promise<void> => {
    if (!imageSrc || loading) return;
    setThreshold(0.28);
    try {
      const blob = await fetch(imageSrc).then((res) => res.blob());
      await processSelfieMatch(new File([blob], "selfie.jpg", { type: "image/jpeg" }), 0.28);
    } catch {
      setErrorMessage("Could not retry. Please retake your selfie.");
    }
  };

  useEffect(() => {
    return () => {
      if (uploadedImageUrlRef.current) URL.revokeObjectURL(uploadedImageUrlRef.current);
    };
  }, []);

  const getApiBase = (): string => API_URL;

  const downloadImage = async (url: string, filename: string): Promise<void> => {
    let diskName = filename;
    if (!diskName && url) {
      try {
        diskName = new URL(url, window.location.origin).pathname.split("/").pop() || "matched_photo.jpg";
      } catch {
        diskName = "matched_photo.jpg";
      }
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = diskName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const leadKey = (id: string | null): string => (id ? `fy-lead-${id}` : "");
  const gateOn = (id: string | null): boolean =>
    !!id && sessionStorage.getItem(`fy-require-lead-${id}`) === "1" && sessionStorage.getItem(leadKey(id)) !== "1";

  const requestDownload = (url: string, filename: string): void => {
    if (gateOn(eventId)) {
      setPendingDl({ url, filename });
      setLeadError("");
      setShowLead(true);
      return;
    }
    void downloadImage(url, filename);
  };

  const submitLead = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!eventId || leadBusy) return;
    if (!leadName.trim() || !leadPhone.trim()) {
      setLeadError("Please share your name and phone number to download.");
      return;
    }
    setLeadBusy(true);
    setLeadError("");
    try {
      const res = await fetch(`${API_URL}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          name: leadName.trim().slice(0, 100),
          phone: leadPhone.trim().slice(0, 20),
          photos_found: matchedPhotos.length,
        }),
      });
      if (res.status === 429) {
        setLeadError("Too many submissions for this event — please try again later.");
        return;
      }
      if (res.status >= 500) {
        setLeadError("Server busy — please try again in a moment.");
        return;
      }
      if (res.status !== 201 && res.status !== 200) {
        setLeadError("That phone number looks invalid — please check it.");
        return;
      }
      sessionStorage.setItem(leadKey(eventId), "1");
      setShowLead(false);
      if (pendingDl) {
        const dl = pendingDl;
        setPendingDl(null);
        await downloadImage(dl.url, dl.filename);
      }
    } catch {
      setLeadError("Could not submit. Please check connection.");
    } finally {
      setLeadBusy(false);
    }
  };
  const handleUserMediaError = (): void => {
    setErrorMessage("Camera access denied or unavailable. Please grant permission or upload a photo.");
    setUseUploadMode(true);
  };

  const openPreview = (url: string, name: string, sim: number): void => {
    setIsZoomed(false);
    setPreviewPhoto({ url, name, sim });
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const t = e.target as HTMLImageElement;
    t.onerror = null;
    t.src = fallbackPlaceholder;
  };

  // If no eventId is found at all, prompt user to return home
  if (!eventId) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1 container mx-auto max-w-md px-4 py-12 flex flex-col justify-center">
          <Card className="text-center p-6">
            <CardContent className="space-y-4">
              <Badge variant="destructive">Event session expired</Badge>
              <h1 className="text-xl font-bold">Event link expired</h1>
              <p className="text-sm text-muted-foreground">
                Please rescan the event QR code or re-enter the event PIN to continue.
              </p>
              <Button onClick={() => navigate("/")} className="w-full min-h-[44px]">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 container mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              AI selfie match
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
              Find your photos
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/collect/${eventId}`)}
            className="min-h-[40px] flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Button>
        </div>

        {/* STEP 1: CAPTURE OR RETAKE */}
        {!imageSrc ? (
          <div className="max-w-md mx-auto">
            <Card className="shadow-md">
              <CardContent className="p-6 sm:p-8 space-y-6 text-center">
                <div className="space-y-2">
                  <Badge variant="brand">Take a selfie to find your photos</Badge>
                  <p className="text-xs text-muted-foreground">
                    Position your face in the frame with good lighting. Your selfie is only used
                    for matching and is never stored permanently.
                  </p>
                </div>

                {/* Webcam / File Viewport */}
                {!useUploadMode ? (
                  <div className="relative aspect-[4/3] max-h-[60dvh] overflow-hidden rounded-xl border border-border bg-black shadow-inner flex items-center justify-center">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      onUserMediaError={handleUserMediaError}
                      videoConstraints={{
                        facingMode: "user",
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        aspectRatio: 4 / 3,
                      }}
                      className="h-full w-full object-cover"
                    />
                    {/* Face Guide Oval */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 m-auto pointer-events-none rounded-[50%] border-2 border-dashed border-brand/90 shadow-sm"
                      style={{
                        width: "min(50vw, 200px)",
                        height: "min(65vw, 260px)",
                      }}
                    />
                  </div>
                ) : (
                  <label
                    htmlFor="selfie-file-input"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 min-h-[220px] cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <input
                      id="selfie-file-input"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleFileUpload}
                    />
                    <ImagePlus className="h-10 w-10 text-muted-foreground/60 mb-2" />
                    <span className="text-sm font-semibold text-foreground">
                      Select a selfie from your gallery
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      JPG or PNG, face clearly visible
                    </span>
                  </label>
                )}

                {errorMessage && (
                  <div className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20 text-center">
                    {errorMessage}
                  </div>
                )}
                {/* Match sensitivity */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Match sensitivity</p>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Face match sensitivity">
                    {[
                      { label: "Strict", value: 0.42, hint: "Exact matches only" },
                      { label: "Balanced", value: 0.34, hint: "Best for weddings" },
                      { label: "Loose", value: 0.28, hint: "Side profiles, sunglasses" },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        aria-pressed={threshold === opt.value}
                        title={opt.hint}
                        onClick={() => setThreshold(opt.value)}
                        className={
                          threshold === opt.value
                            ? "min-h-[44px] rounded-lg bg-primary px-2 py-2 text-xs font-bold text-primary-foreground"
                            : "min-h-[44px] rounded-lg border border-input bg-background px-2 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Actions */}
                <div className="space-y-3 pt-2">
                  {!useUploadMode ? (
                    <Button
                      type="button"
                      onClick={() => void captureAndMatch()}
                      size="lg"
                      className="w-full min-h-[48px] text-base font-semibold flex items-center justify-center gap-2"
                    >
                      <Camera className="h-5 w-5" />
                      Take Selfie &amp; Find My Photos
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseUploadMode(!useUploadMode)}
                    className="w-full min-h-[44px] text-xs text-muted-foreground hover:text-foreground"
                  >
                    {useUploadMode ? "Switch to camera" : "Or upload a photo instead"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* STEP 2: RESULTS SECTION */
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="relative h-28 w-28 shrink-0 rounded-xl overflow-hidden border border-border bg-muted shadow-sm">
                    <img
                      src={imageSrc}
                      alt="Your Selfie"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <h2 className="text-xl font-bold text-foreground">
                      {matchedPhotos.length > 0
                        ? `Found ${matchedPhotos.length} photo${
                            matchedPhotos.length > 1 ? "s" : ""
                          } with your face`
                        : "Search status"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {matchedPhotos.length > 0
                        ? "Select any photo to preview or download in high resolution."
                        : errorMessage ||
                          "We couldn't detect your face in this album with high confidence. Try taking another selfie with better lighting."}
                    </p>
                    <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={retakeSelfie}
                        className="min-h-[44px] flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retake Selfie
                      </Button>
                      {!loading && matchedPhotos.length === 0 && threshold > 0.28 ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void retryLoose()}
                          className="min-h-[44px] flex items-center gap-2"
                        >
                          Try loose match
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {loading && (
                  <div className="mt-6 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                    <div>
                      <p className="font-semibold">Analyzing 512-D face embeddings…</p>
                      <p className="text-xs text-muted-foreground">
                        Matching your facial signature across all event photos.
                      </p>
                    </div>
                  </div>
                )}

                {!loading && matchedPhotos.length === 0 && errorMessage && (
                  <div className="mt-6 rounded-lg p-4 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20 text-center">
                    {errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Matched Images Grid */}
            {matchedPhotos.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Your matched photos ({matchedPhotos.length})
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {matchedPhotos.map((photo, idx) => {
                    const imgUrl = `${getApiBase()}/uploads/${encodeURIComponent(photo.name)}`;
                    const simPercent = Math.round((photo.similarity ?? 0.9) * 100);

                    return (
                      <div
                        key={photo.id || idx}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border shadow-sm"
                      >
                        <img
                          src={imgUrl}
                          alt={`Matched item ${idx + 1}`}
                          onError={handleImgError}
                          loading="lazy"
                          onClick={() => openPreview(imgUrl, photo.name, simPercent)}
                          className="h-full w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        />
                        <Badge
                          variant="brand"
                          className="absolute top-2 right-2 text-xs font-semibold shadow"
                        >
                          {simPercent}% match
                        </Badge>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => openPreview(imgUrl, photo.name, simPercent)}
                            className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-lg bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                            title="View full photo"
                            aria-label="View full photo"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDownload(imgUrl, photo.name)}
                            className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-lg bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                            title="Download photo"
                            aria-label="Download photo"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fullscreen Photo Preview Modal */}
        <ResponsiveModal
          open={Boolean(previewPhoto)}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewPhoto(null);
              setIsZoomed(false);
            }
          }}
          className="sm:max-w-3xl"
          title={previewPhoto ? `Photo preview (${previewPhoto.sim}% match)` : "Photo preview"}
        >
          {previewPhoto && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="font-semibold text-sm text-foreground truncate max-w-full sm:max-w-[50%]" title={previewPhoto.name}>
                  {previewPhoto.name ? previewPhoto.name.replace(/^\d+-/, "") : "Photo"}
                </p>
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
                    onClick={() => requestDownload(previewPhoto.url, previewPhoto.name)}
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
                  src={previewPhoto.url}
                  alt="Full preview"
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
        <ResponsiveModal
          open={showLead}
          onOpenChange={setShowLead}
          title="Get your photos"
        >
          <form
            onSubmit={(e) => void submitLead(e)}
            className="space-y-4 pt-2"
          >
            <p className="text-sm text-muted-foreground">
              The photographer would love to share more with you — leave your name and number to download.
            </p>
            {leadError ? (
              <div role="alert" className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20">
                {leadError}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="fy-lead-name">Name</Label>
              <Input
                id="fy-lead-name"
                value={leadName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeadName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                placeholder="Your name"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fy-lead-phone">Phone / WhatsApp</Label>
              <Input
                id="fy-lead-phone"
                type="tel"
                value={leadPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeadPhone(e.target.value)}
                maxLength={20}
                autoComplete="tel"
                placeholder="+91 …"
                className="min-h-[44px]"
              />
            </div>
            <Button type="submit" disabled={leadBusy} className="w-full min-h-[48px]">
              {leadBusy ? "Submitting…" : "Submit & download →"}
            </Button>
          </form>
        </ResponsiveModal>
      </main>

      <Footer />
    </div>
  );
};

export default CameraCaptureWithMask;
