import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { getApiBase } from "../../utils/api";

export type EventPhoto = {
  _id: string;
  name: string;
  thumb?: string;
  folder_name?: string;
  isSelected?: boolean;
  selectionNote?: string;
  createdAt?: string;
};

const PAGE_SIZE = 60;

type PhotosResponse = {
  photos?: EventPhoto[];
  nextCursor?: string | null;
};

type UseEventPhotos = {
  photos: EventPhoto[];
  loading: boolean;
  loadError: string | null;
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement>;
  refresh: () => Promise<void>;
  loadMore: () => void;
  removePhoto: (photoId: string) => void;
};

// Paged gallery source for the dashboard grid. Server filters by folder and
// returns 60-photo pages with an opaque cursor; the sentinel auto-appends.
export function useEventPhotos(eventID: string, activeFolder: string): UseEventPhotos {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const cursorRef = useRef<string | null>(null);
  const fetchingRef = useRef<boolean>(false);
  const requestRef = useRef<number>(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean): Promise<void> => {
      if (!eventID) {
        setPhotos([]);
        setHasMore(false);
        setLoading(false);
        return;
      }
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      const request = ++requestRef.current;
      setLoading(true);
      if (!append) setLoadError(null);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (activeFolder && activeFolder !== "All") params.set("folder", activeFolder);
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(
          `${getApiBase()}/events/${encodeURIComponent(eventID)}/photos?${params.toString()}`
        );
        // ponytail: a 500 used to render as an empty gallery — surface it.
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json().catch(() => null)) as PhotosResponse | EventPhoto[] | null;
        if (request !== requestRef.current) return;
        const page: EventPhoto[] = Array.isArray(data) ? data : data?.photos ?? [];
        const next: string | null = Array.isArray(data) ? null : data?.nextCursor ?? null;
        setPhotos((prev) => (append ? [...prev, ...page] : page));
        cursorRef.current = next;
        setHasMore(Boolean(next));
      } catch (e: unknown) {
        if (request !== requestRef.current) return;
        if (!append) {
          setPhotos([]);
          setLoadError(e instanceof Error ? e.message : "Gallery failed to load");
        }
        cursorRef.current = null;
        setHasMore(false);
      } finally {
        if (request === requestRef.current) {
          fetchingRef.current = false;
          setLoading(false);
        }
      }
    },
    [eventID, activeFolder]
  );

  // Reset + first page on event/folder change.
  useEffect(() => {
    requestRef.current += 1;
    fetchingRef.current = false;
    cursorRef.current = null;
    setHasMore(false);
    setPhotos([]);
    void fetchPage(null, false);
  }, [fetchPage]);

  const fetchNext = useCallback((): void => {
    if (!hasMore || fetchingRef.current) return;
    void fetchPage(cursorRef.current, true);
  }, [hasMore, fetchPage]);

  // +60 sentinel pattern (rootMargin 200px). No-IO browsers chain-load instead.
  useEffect(() => {
    if (!hasMore) return;
    if (typeof window === "undefined" || !window.IntersectionObserver) {
      fetchNext();
      return;
    }
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) fetchNext();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, photos.length, fetchNext]);

  const refresh = useCallback(async (): Promise<void> => {
    requestRef.current += 1;
    fetchingRef.current = false;
    cursorRef.current = null;
    setHasMore(false);
    setPhotos([]);
    await fetchPage(null, false);
  }, [fetchPage]);

  const removePhoto = useCallback((photoId: string): void => {
    setPhotos((prev) => prev.filter((p) => p._id !== photoId));
  }, []);

  return { photos, loading, loadError, hasMore, sentinelRef, refresh, loadMore: fetchNext, removePhoto };
}
