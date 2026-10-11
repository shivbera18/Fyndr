import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useParams } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { PageShell, Callout, EmptyState } from "../../components/ui/page-kit";
import { ResponsiveModal } from "../../components/ui/responsive-modal";
import { API_URL } from "../../utils/api";
import { Check, Expand, Heart, KeyRound, Lock, StickyNote, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "../../lib/utils";
import { PWAInstallButton } from "../../components/pwa";

type SelectPhoto = {
  _id: string;
  name: string;
  folder_name?: string;
  isSelected: boolean;
  selectionNote?: string;
};

type SelectEventData = {
  _id: string;
  event_name: string;
  event_photo?: string;
  selectionLimit: number;
  selectionLocked: boolean;
  folders: { name: string }[];
};

type SelectPhotoCardProps = {
  photo: SelectPhoto;
  index: number;
  photoUrl: string;
  locked: boolean;
  isPending: boolean;
  onToggleSelect: (photoId: string) => void;
  onOpen: (photoId: string) => void;
};

const SelectPhotoCard = React.memo(function SelectPhotoCard({
  photo,
  index,
  photoUrl,
  locked,
  isPending,
  onToggleSelect,
  onOpen,
}: SelectPhotoCardProps) {
  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelect(photo._id);
    },
    [onToggleSelect, photo._id]
  );

  const handleOpen = useCallback(() => {
    onOpen(photo._id);
  }, [onOpen, photo._id]);

  const handleOpenKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(photo._id);
      }
    },
    [onOpen, photo._id]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleOpenKey}
      aria-label={`Open photo ${index + 1}${photo.isSelected ? " (selected)" : ""}`}
      className={cn(
        "group relative rounded-xl overflow-hidden bg-muted border cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-primary",
        photo.isSelected ? "border-primary ring-2 ring-primary/40" : "border-black/10"
      )}
    >
      <div className="aspect-square">
        <img src={photoUrl} alt={`Album candidate ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>
      <button
        type="button"
        onClick={handleToggleClick}
        disabled={locked || isPending}
        aria-pressed={photo.isSelected}
        aria-label={photo.isSelected ? "Unselect photo" : "Select photo"}
        className={cn(
          "absolute top-2 right-2 h-11 w-11 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition-colors shadow-sm",
          photo.isSelected ? "bg-primary text-primary-foreground" : "bg-black/50 text-white hover:bg-black/70"
        )}
      >
        <Heart className={cn("h-5 w-5", photo.isSelected && "fill-current")} />
      </button>
      {photo.selectionNote ? (
        <span className="absolute bottom-2 left-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white" title="Has a note for the photographer">
          <StickyNote className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </div>
  );
});

const SelectEvent = (): React.JSX.Element => {
  const { eventId } = useParams<{ eventId: string }>();
  const [eventData, setEventData] = useState<SelectEventData | null>(null);
  const [photos, setPhotos] = useState<SelectPhoto[]>([]);
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [activeFolder, setActiveFolder] = useState<string>("All");
  const [selectedOnly, setSelectedOnly] = useState<boolean>(false);
  const [locking, setLocking] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<boolean>(false);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  // ponytail: cap initial grid render — large albums rendered every card at once.
  const [, startFilterTransition] = useTransition();

  const handleFolderChange = useCallback((folder: string) => {
    startFilterTransition(() => {
      setActiveFolder(folder);
    });
  }, []);

  const handleSelectedOnlyToggle = useCallback(() => {
    startFilterTransition(() => {
      setSelectedOnly((v) => !v);
    });
  }, []);

  const [visibleCount, setVisibleCount] = useState<number>(60);
  // Fresh mirror: onBlur/toggle closures read current picks, never a stale render snapshot
  const photosRef = useRef<SelectPhoto[]>([]);
  photosRef.current = photos;

  const selectedCount = photos.filter((p) => p.isSelected).length;
  const limit = eventData?.selectionLimit || 0;
  const locked = eventData?.selectionLocked || false;

  useEffect(() => {
    if (!eventId) return;
    const tryPublicAccess = async () => {
      try {
        const res = await fetch(`${API_URL}/selection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: eventId, pin: "" }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.event) {
            setEventData(data.event);
            setPhotos(Array.isArray(data.photos) ? data.photos : []);
            setNotice(`Selected ${data.selectedCount || 0} so far — tap the heart to pick album photos.`);
          }
        }
      } catch {}
    };
    void tryPublicAccess();
  }, [eventId]);

  const loadSelection = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!eventId || !pin.trim()) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`${API_URL}/selection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: eventId, pin: pin.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // Server 404s wrong-PIN and missing-event identically (enumeration parity) — message covers both.
        setErrorMessage("Wrong PIN or invalid link — check both, or ask the photographer.");
        return;
      }
      setEventData(data.event);
      setPhotos(Array.isArray(data.photos) ? data.photos : []);
      setNotice(`Selected ${data.selectedCount || 0} so far — tap the heart to pick album photos.`);
    } catch {
      setErrorMessage("Could not connect to event server.");
    } finally {
      setLoading(false);
    }
  };
  const toggleSelect = useCallback(async (photoId: string): Promise<void> => {
    if (locked || !eventId || pendingIds.has(photoId)) return;
    const current = photosRef.current.find((p) => p._id === photoId);
    if (!current) return;
    const next = !current.isSelected;
    setPendingIds((prev) => new Set(prev).add(photoId));
    setPhotos((prev) => prev.map((p) => (p._id === photoId ? { ...p, isSelected: next } : p)));
    setErrorMessage("");
    try {
      const res = await fetch(`${API_URL}/photos/${photoId}/select`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, pin: pin.trim(), isSelected: next }),
      });
      if (res.status === 409) {
        setPhotos((prev) => prev.map((p) => (p._id === photoId ? { ...p, isSelected: false } : p)));
        setErrorMessage(limit > 0 ? `Album limit reached — ${limit} photos. Unselect one to change your picks.` : "Selection limit reached.");
        return;
      }
      if (res.status === 403) {
        setEventData((prev) => (prev ? { ...prev, selectionLocked: true } : prev));
        setPhotos((prev) => prev.map((p) => (p._id === photoId ? { ...p, isSelected: !next } : p)));
        setErrorMessage("Selection is locked and cannot be changed.");
        return;
      }
      if (!res.ok) throw new Error("toggle failed");
    } catch {
      setPhotos((prev) => prev.map((p) => (p._id === photoId ? { ...p, isSelected: !next } : p)));
      setErrorMessage("Could not save your pick. Please try again.");
    } finally {
      setPendingIds((prev) => {
        const copy = new Set(prev);
        copy.delete(photoId);
        return copy;
      });
    }
  }, [locked, eventId, pendingIds, pin, limit]);

  const saveNote = useCallback(async (photoId: string, noteText: string): Promise<void> => {
    if (locked || !eventId || pendingIds.has(photoId)) return;
    const current = photosRef.current.find((p) => p._id === photoId);
    if (!current) return;
    const note = noteText.trim().slice(0, 500);
    setPendingIds((prev) => new Set(prev).add(photoId));
    try {
      const res = await fetch(`${API_URL}/photos/${photoId}/select`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, pin: pin.trim(), isSelected: current.isSelected, selectionNote: note }),
      });
      if (!res.ok) throw new Error("note failed");
      setPhotos((prev) => prev.map((p) => (p._id === photoId ? { ...p, selectionNote: note } : p)));
      setNotice("Note saved for the photographer.");
    } catch {
      setErrorMessage("Could not save your note. Please try again.");
    } finally {
      setPendingIds((prev) => {
        const copy = new Set(prev);
        copy.delete(photoId);
        return copy;
      });
    }
  }, [locked, eventId, pendingIds, pin]);

  const openSubmitModal = useCallback((): void => {
    if (locked || locking) return;
    setShowSubmitModal(true);
  }, [locked, locking]);

  const confirmLockSelection = async (): Promise<void> => {
    if (locked || !eventId || locking) return;
    setShowSubmitModal(false);
    setLocking(true);
    setErrorMessage("");
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim(), locked: true }),
      });
      if (!res.ok) throw new Error("lock failed");
      setEventData((prev) => (prev ? { ...prev, selectionLocked: true } : prev));
      setNotice("Submitted! Your album picks are locked in — the photographer takes it from here.");
    } catch {
      setErrorMessage("Could not submit. Please try again.");
    } finally {
      setLocking(false);
    }
  };

  const openLightbox = useCallback((photoId: string): void => {
    setLightboxZoom(false);
    setLightboxId(photoId);
  }, []);

  const closeLightbox = useCallback((): void => {
    setLightboxZoom(false);
    setLightboxId(null);
  }, []);

  const visible = useMemo(
    () =>
      photos.filter((p) => {
        if (selectedOnly && !p.isSelected) return false;
        if (activeFolder !== "All" && (p.folder_name || "General") !== activeFolder) return false;
        return true;
      }),
    [photos, selectedOnly, activeFolder]
  );
  const shown = useMemo(() => visible.slice(0, visibleCount), [visible, visibleCount]);
  useEffect(() => {
    setVisibleCount(60);
  }, [activeFolder, selectedOnly, eventId]);

  const lightboxPhoto = lightboxId ? photos.find((p) => p._id === lightboxId) ?? null : null;
  const lightboxUrl = lightboxPhoto ? `${API_URL}/download/${encodeURIComponent(lightboxPhoto.name)}` : "";

  return (
    <PageShell header={<Header />} footer={<Footer />} maxWidth="max-w-6xl">
      {!eventData ? (
        <div className="max-w-md mx-auto w-full">
          <Card className="border-black/10 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <p className="rk-kicker">Client album picks</p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Choose your album photos</h1>
                <p className="text-sm text-muted-foreground">Enter the event PIN shared by your photographer.</p>
              </div>
              {errorMessage ? (
                <div role="alert" className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20">
                  {errorMessage}
                </div>
              ) : null}
              <form onSubmit={loadSelection} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fy-select-pin" className="block text-center font-medium">
                    Event PIN <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fy-select-pin"
                    type="tel"
                    inputMode="numeric"
                    maxLength={24}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value)}
                    required
                    className="h-[52px] min-h-[52px] text-center tracking-[0.3em] font-mono text-xl font-bold"
                  />
                </div>
                <Button type="submit" disabled={loading} size="lg" className="w-full min-h-[52px]">
                  <KeyRound className="h-4 w-4" />
                  {loading ? "Unlocking…" : "Unlock my gallery →"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[#f7f5f1]/95 backdrop-blur border-b border-black/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="rk-kicker">Client album picks</p>
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight truncate">{eventData.event_name}</h1>
                <p className="text-sm text-muted-foreground" role="status">
                  Selected {selectedCount}
                  {limit > 0 ? ` / ${limit} album photos` : " photos"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <PWAInstallButton
                  variant="button"
                  size="sm"
                  label="Install Gallery App"
                  className="min-h-[44px]"
                />
                <Button
                  type="button"
                  onClick={openSubmitModal}
                  disabled={locked || locking}
                  className="min-h-[44px]"
                >
                  {locked ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {locked ? "Submitted" : locking ? "Submitting…" : "Lock & submit picks"}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mb-1" role="tablist" aria-label="Photo folders">
              {["All", ...eventData.folders.map((f) => f.name)].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeFolder === tab}
                  onClick={() => handleFolderChange(tab)}
                  className={cn(
                    "shrink-0 min-h-[44px] px-4 rounded-full text-sm font-medium border transition-colors",
                    activeFolder === tab
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-foreground border-black/15 hover:border-black/30"
                  )}
                >
                  {tab}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={selectedOnly}
                onClick={handleSelectedOnlyToggle}
                className={cn(
                  "shrink-0 inline-flex items-center min-h-[44px] px-4 rounded-full text-sm font-medium border transition-colors",
                  selectedOnly
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-foreground border-black/15 hover:border-black/30"
                )}
              >
                <Heart className="h-3.5 w-3.5 fill-current mr-1.5 inline" />
                Selected only
              </button>
            </div>
          </div>

          {locked ? (
            <Callout variant="success" title="Picks submitted">
              Thank you! Contact your photographer if anything must change.
            </Callout>
          ) : null}
          {notice && !locked ? <p role="status" className="text-sm text-muted-foreground">{notice}</p> : null}
          {errorMessage ? (
            <div role="alert" className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20">
              {errorMessage}
            </div>
          ) : null}

          {visible.length === 0 ? (
            <EmptyState
              title={selectedOnly ? "No picks yet" : "No photos in this view"}
              body={selectedOnly ? "Tap the heart on photos you love — they will gather here." : "Try another folder."}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {shown.map((photo, index) => (
                  <SelectPhotoCard
                    key={photo._id}
                    photo={photo}
                    index={index}
                    photoUrl={`${API_URL}/download/${encodeURIComponent(photo.name)}`}
                    locked={locked}
                    isPending={pendingIds.has(photo._id)}
                    onToggleSelect={toggleSelect}
                    onOpen={openLightbox}
                  />
                ))}
              </div>
              {visible.length > shown.length && (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibleCount((c) => c + 60)}
                    className="min-h-[44px]"
                  >
                    Show more ({visible.length - shown.length} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
      <ResponsiveModal
        open={showSubmitModal}
        onOpenChange={setShowSubmitModal}
        title="Submit your picks?"
        description={
          limit > 0
            ? `You picked ${selectedCount} of ${limit} album photos. Submitting locks your choices.`
            : `You picked ${selectedCount} photos. Submitting locks your choices.`
        }
        footer={
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setShowSubmitModal(false)} className="min-h-[44px]">
              Keep choosing
            </Button>
            <Button type="button" onClick={() => void confirmLockSelection()} disabled={locking} className="min-h-[44px]">
              {locking ? "Submitting…" : "Submit picks"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground pt-1">
          The photographer starts retouching from your locked set — ask them directly if anything must change later.
        </p>
      </ResponsiveModal>
      <ResponsiveModal
        open={Boolean(lightboxPhoto)}
        onOpenChange={(open) => {
          if (!open) closeLightbox();
        }}
        className="sm:max-w-3xl"
        title={lightboxPhoto ? `Photo preview${lightboxPhoto.isSelected ? " · selected" : ""}` : "Photo preview"}
      >
        {lightboxPhoto && (
          <LightboxBody
            photo={lightboxPhoto}
            photoUrl={lightboxUrl}
            locked={locked}
            isPending={pendingIds.has(lightboxPhoto._id)}
            zoomed={lightboxZoom}
            onToggleZoom={() => setLightboxZoom((z) => !z)}
            onToggleSelect={() => void toggleSelect(lightboxPhoto._id)}
            onSaveNote={(note) => void saveNote(lightboxPhoto._id, note)}
          />
        )}
      </ResponsiveModal>
    </PageShell>
  );
};

function LightboxBody({
  photo,
  photoUrl,
  locked,
  isPending,
  zoomed,
  onToggleZoom,
  onToggleSelect,
  onSaveNote,
}: {
  photo: SelectPhoto;
  photoUrl: string;
  locked: boolean;
  isPending: boolean;
  zoomed: boolean;
  onToggleZoom: () => void;
  onToggleSelect: () => void;
  onSaveNote: (note: string) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState<string>(photo.selectionNote || "");
  useEffect(() => {
    setDraft(photo.selectionNote || "");
  }, [photo._id, photo.selectionNote]);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold truncate" title={photo.name}>
          {photo.name.replace(/^\d+-/, "")}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onToggleZoom} className="min-h-[44px]" aria-pressed={zoomed}>
            {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
            {zoomed ? "Fit" : "Zoom"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={photo.isSelected ? "secondary" : "default"}
            onClick={onToggleSelect}
            disabled={locked || isPending}
            className="min-h-[44px]"
            aria-pressed={photo.isSelected}
          >
            <Heart className={cn("h-4 w-4 mr-1", photo.isSelected && "fill-current")} />
            {photo.isSelected ? "Selected — tap to remove" : "Pick for album"}
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "relative rounded-xl border border-border bg-black/95 flex justify-center p-2 max-h-[65vh]",
          zoomed ? "overflow-auto items-start" : "overflow-hidden items-center"
        )}
      >
        <img
          src={photoUrl}
          alt="Full preview"
          onClick={onToggleZoom}
          className={cn(
            "rounded-lg transition-transform",
            zoomed
              ? "max-w-full max-h-none object-contain cursor-zoom-out"
              : "max-w-full max-h-[60vh] object-contain cursor-zoom-in"
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fy-select-note" className="inline-flex items-center gap-1.5 text-sm font-medium">
          <Expand className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          Note for the photographer
        </Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="fy-select-note"
            defaultValue={draft}
            key={`${photo._id}-${photo.selectionNote || ""}`}
            placeholder="Retouch note — e.g. remove exit sign…"
            aria-label="Retouch note for photographer"
            maxLength={500}
            disabled={locked || isPending || !photo.isSelected}
            title={!photo.isSelected ? "Pick this photo before adding a note" : isPending ? "Saving…" : undefined}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => onSaveNote(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="min-h-[52px] flex-1"
          />
          <Button
            type="button"
            variant="outline"
            disabled={locked || isPending || !photo.isSelected}
            className="min-h-[52px] shrink-0"
            onClick={() => {
              const el = document.getElementById("fy-select-note") as HTMLInputElement | null;
              if (el) onSaveNote(el.value);
            }}
          >
            Save note
          </Button>
        </div>
        {!photo.isSelected ? (
          <p className="text-xs text-muted-foreground">Pick this photo first — notes attach to album picks only.</p>
        ) : null}
      </div>
    </div>
  );
}

export default SelectEvent;
