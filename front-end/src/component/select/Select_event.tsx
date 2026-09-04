import React, { useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { API_URL } from "../../utils/api";
import { Heart, KeyRound, Lock } from "lucide-react";
import { cn } from "../../lib/utils";

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

  const selectedCount = photos.filter((p) => p.isSelected).length;
  const limit = eventData?.selectionLimit || 0;
  const locked = eventData?.selectionLocked || false;

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
        setErrorMessage("Pin is wrong! Contact the photographer for the correct PIN.");
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

  const toggleSelect = async (photo: SelectPhoto): Promise<void> => {
    if (locked || !eventId) return;
    const next = !photo.isSelected;
    setPhotos((prev) => prev.map((p) => (p._id === photo._id ? { ...p, isSelected: next } : p)));
    setErrorMessage("");
    try {
      const res = await fetch(`${API_URL}/photos/${photo._id}/select`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, pin: pin.trim(), isSelected: next }),
      });
      if (res.status === 409) {
        setPhotos((prev) => prev.map((p) => (p._id === photo._id ? { ...p, isSelected: false } : p)));
        setErrorMessage(limit > 0 ? `Album limit reached — ${limit} photos. Unselect one to change your picks.` : "Selection limit reached.");
        return;
      }
      if (res.status === 403) {
        setEventData((prev) => (prev ? { ...prev, selectionLocked: true } : prev));
        setPhotos((prev) => prev.map((p) => (p._id === photo._id ? { ...p, isSelected: photo.isSelected } : p)));
        setErrorMessage("Selection is locked and cannot be changed.");
        return;
      }
      if (!res.ok) throw new Error("toggle failed");
    } catch {
      setPhotos((prev) => prev.map((p) => (p._id === photo._id ? { ...p, isSelected: photo.isSelected } : p)));
      setErrorMessage("Could not save your pick. Please try again.");
    }
  };

  const saveNote = async (photo: SelectPhoto, noteText: string): Promise<void> => {
    if (locked || !eventId) return;
    const note = noteText.trim().slice(0, 500);
    try {
      const res = await fetch(`${API_URL}/photos/${photo._id}/select`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, pin: pin.trim(), isSelected: photo.isSelected, selectionNote: note }),
      });
      if (!res.ok) throw new Error("note failed");
      setPhotos((prev) => prev.map((p) => (p._id === photo._id ? { ...p, selectionNote: note } : p)));
      setNotice("Note saved for the photographer.");
    } catch {
      setErrorMessage("Could not save your note. Please try again.");
    }
  };

  const lockSelection = async (): Promise<void> => {
    if (locked || !eventId || locking) return;
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

  const visible = photos.filter((p) => {
    if (selectedOnly && !p.isSelected) return false;
    if (activeFolder !== "All" && (p.folder_name || "General") !== activeFolder) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 container mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
        {!eventData ? (
          <div className="max-w-md mx-auto w-full">
            <Card className="shadow-md">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-2">
                  <Badge variant="brand">Client album picks</Badge>
                  <h1 className="text-2xl font-bold tracking-tight">Choose your album photos</h1>
                  <p className="text-sm text-muted-foreground">Enter the event PIN shared by your photographer.</p>
                </div>
                {errorMessage ? (
                  <div className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20">
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
                      className="h-12 min-h-[48px] text-center tracking-[0.3em] font-mono text-xl font-bold"
                    />
                  </div>
                  <Button type="submit" disabled={loading} size="lg" className="w-full min-h-[48px]">
                    <KeyRound className="h-4 w-4" />
                    {loading ? "Unlocking…" : "Unlock my gallery →"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{eventData.event_name}</h1>
                <p className="text-sm text-muted-foreground">
                  Selected {selectedCount}
                  {limit > 0 ? ` / ${limit} album photos` : " photos"}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => void lockSelection()}
                disabled={locked || locking}
                className="min-h-[44px]"
              >
                <Lock className="h-4 w-4" />
                {locked ? "Submitted ✓" : locking ? "Submitting…" : "Lock & submit picks"}
              </Button>
            </div>

            {locked ? (
              <div className="rounded-lg p-3 text-sm font-medium border bg-primary/10 text-primary border-primary/20">
                Picks submitted and locked — thank you! Contact your photographer if anything must change.
              </div>
            ) : null}
            {notice && !locked ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
            {errorMessage ? (
              <div className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {["All", ...eventData.folders.map((f) => f.name)].map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  variant={activeFolder === tab ? "default" : "outline"}
                  size="sm"
                  aria-pressed={activeFolder === tab}
                  onClick={() => setActiveFolder(tab)}
                  className="min-h-[40px]"
                >
                  {tab}
                </Button>
              ))}
              <Button
                type="button"
                variant={selectedOnly ? "default" : "outline"}
                size="sm"
                aria-pressed={selectedOnly}
                onClick={() => setSelectedOnly((v) => !v)}
                className="min-h-[40px]"
              >
                ♥ Selected only
              </Button>
            </div>

            {visible.length === 0 ? (
              <Card className="text-center py-12 px-4">
                <CardContent className="text-sm text-muted-foreground">
                  {selectedOnly ? "No picks yet — tap the heart on photos you love." : "No photos in this view yet."}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {visible.map((photo) => {
                  const photoUrl = `${API_URL}/uploads/${encodeURIComponent(photo.name)}`;
                  return (
                    <div
                      key={photo._id}
                      className={cn(
                        "group relative rounded-xl overflow-hidden bg-muted border",
                        photo.isSelected ? "border-primary ring-2 ring-primary/40" : "border-border"
                      )}
                    >
                      <div className="aspect-square">
                        <img src={photoUrl} alt="Selectable gallery photo" loading="lazy" className="h-full w-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleSelect(photo)}
                        disabled={locked}
                        aria-pressed={photo.isSelected}
                        aria-label={photo.isSelected ? "Unselect photo" : "Select photo"}
                        className={cn(
                          "absolute top-2 right-2 h-11 w-11 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center shadow",
                          photo.isSelected ? "bg-primary text-primary-foreground" : "bg-black/50 text-white hover:bg-black/70"
                        )}
                      >
                        <Heart className={cn("h-5 w-5", photo.isSelected && "fill-current")} />
                      </button>
                      {photo.isSelected && !locked ? (
                        <input
                          defaultValue={photo.selectionNote || ""}
                          placeholder="Note for photographer…"
                          aria-label="Retouch note for photographer"
                          maxLength={500}
                          onBlur={(e) => void saveNote(photo, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-background border-t border-border outline-none"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SelectEvent;
