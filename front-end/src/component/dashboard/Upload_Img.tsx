import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { API_URL } from "../../utils/api";
import { prepareUploadImage } from "../../utils/clientImage";
import { isOriginalQuality } from "../../utils/uploadPrefs";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ImagePlus, Upload, X } from "lucide-react";
import { cn } from "../../lib/utils";

// ponytail: Limit active DOM previews to 12. Decoding 100s of RAW/JPEG bitmaps in the DOM
// consumes gigabytes of uncompressed RAM and crashes mobile/desktop browser tabs.
export const MAX_PREVIEWS = 12;

// ponytail: count-only batches of 15 DSLR photos (~172MB) die on 100MB proxy caps with
// unretryable ERR_NETWORK. Cap every POST by BYTES so any album uploads on hotel WiFi.
export const UPLOAD_BATCH_SIZE = 15;
// ponytail: 3 in-flight batch POSTs saturate the uplink without pinning every server slot; raise only with p95 evidence.
export const UPLOAD_BATCH_CONCURRENCY = 3;
export const UPLOAD_BATCH_BYTE_BUDGET = 75 * 1024 * 1024;
export const UPLOAD_MAX_ATTEMPTS = 4;
export const UPLOAD_RETRY_DELAYS_MS = [0, 1500, 3000, 6000];
export function buildByteBudgetedBatches(files: SelectedFile[]): SelectedFile[][] {
  const batches: SelectedFile[][] = [];
  let current: SelectedFile[] = [];
  let currentBytes = 0;
  for (const item of files) {
    const size = item.file.size || 0;
    if (current.length > 0 && (current.length >= UPLOAD_BATCH_SIZE || currentBytes + size > UPLOAD_BATCH_BYTE_BUDGET)) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(item);
    currentBytes += size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

export function isRetryableUploadError(err: unknown): boolean {
  // ponytail: canceled requests must never retry — abort means the user (or unmount) killed it.
  if (err !== null && typeof err === "object" && "code" in err && err.code === "ERR_CANCELED") return false;
  if (typeof axios.isCancel === "function") {
    try {
      if (axios.isCancel(err)) return false;
    } catch {}
  }
  // ponytail: no local guard/schema — axios owns the error shape; narrow via its own type predicate when available.
  if (typeof axios.isAxiosError === "function" && axios.isAxiosError(err)) {
    if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED" || err.code === "ETIMEDOUT" || err.response === undefined) return true;
    const status = err.response.status;
    return status === 408 || status === 429 || status >= 500;
  }
  // ponytail: response-less network drops may arrive as plain Errors in mocks/edge runtimes — retry by code/message.
  if (err !== null && typeof err === "object" && "code" in err) {
    const code = err.code;
    if (code === "ERR_NETWORK" || code === "ECONNABORTED" || code === "ETIMEDOUT") return true;
  }
  if (err instanceof Error && err.message === "Network Error") return true;
  // ponytail: 207 partial-failure is deterministic per batch (same files fail again) — fail fast, no retry.
  return false;
}

export function uploadDelayMs(failedAttempt: number): number {
  return UPLOAD_RETRY_DELAYS_MS[failedAttempt - 1] ?? UPLOAD_RETRY_DELAYS_MS[UPLOAD_RETRY_DELAYS_MS.length - 1] ?? 0;
}

// ponytail: subtle absent (insecure ctx) → null → multer fallback.
// Namespace object so tests can stub hashing (jsdom lacks crypto.subtle).
export const fileHasher = {
  sha256Hex: async (file: Blob): Promise<string | null> => {
    try {
      // ponytail: globalThis works in browsers + jsdom alike.
      const subtle = globalThis.crypto?.subtle;
      if (!subtle) return null;
      const buf = await file.arrayBuffer();
      const digest = await subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      return null;
    }
  },
};

// ponytail: compress-once memo — retries reuse bytes; hash/stage/PUT all
// use prepared bytes because the server re-hashes actuals (mismatch = failed).
async function preparedFor(item: SelectedFile): Promise<{ blob: Blob; compressed: boolean }> {
  if (!item.prepared) {
    // ponytail: archival opt-out lives in user settings (localStorage);
    // checked per file so a mid-queue toggle flip takes effect immediately.
    if (isOriginalQuality()) {
      item.prepared = { blob: item.file, compressed: false };
    } else {
      try {
        const p = await prepareUploadImage(item.file);
        item.prepared = { blob: p.blob, compressed: p.compressed };
      } catch {
        item.prepared = { blob: item.file, compressed: false };
      }
    }
  }
  return item.prepared;
}

export type SelectedFile = {
  file: File;
  preview: string;
  id: string;
  // ponytail: compressed blob memoized per file so retries reuse bytes;
  // hash/stage/PUT all use the prepared bytes (server re-hashes actuals).
  prepared?: { blob: Blob; compressed: boolean };
};

type Props = {
  event_id: string;
  d_ref?: () => void;
  inevent?: boolean;
  folder_name?: string;
};

const PROGRESS_COMMIT_INTERVAL_MS = 250;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
};

type PreviewTileProps = {
  id: string;
  previewUrl: string;
  fileName: string;
  size: number;
  onRemove: (id: string) => void;
  disabled: boolean;
};

const PreviewTile = React.memo(function PreviewTile({ id, previewUrl, fileName, size, onRemove, disabled }: PreviewTileProps) {
  return (
    <div
      className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
      title={fileName}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={fileName}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground p-1 text-center truncate">
          {fileName}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(id);
        }}
        title={`Remove ${fileName} (${formatFileSize(size)})`}
        aria-label={`Remove ${fileName}`}
        className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity disabled:pointer-events-none"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});

export default function Upload_Img({ event_id, d_ref, folder_name }: Props): React.JSX.Element {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [batchInfo, setBatchInfo] = useState<{ current: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filesRef = useRef<SelectedFile[]>([]);
  filesRef.current = selectedFiles;
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastProgressCommitRef = useRef(0);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const USER_ID = (user._id || null) as string | null;

  const totalSize = useMemo(() => {
    return selectedFiles.reduce((sum, f) => sum + f.file.size, 0);
  }, [selectedFiles]);

  const addFiles = (files: FileList | File[]) => {
    const raw = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (raw.length === 0) return;
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    const oversized = raw.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} photo(s) exceed the 50MB upload limit and were skipped.`);
    }
    const list = raw.filter((f) => f.size <= MAX_FILE_SIZE);
    if (list.length === 0) return;
    setSelectedFiles((prev) => {
      const currentCount = prev.length;
      const mapped: SelectedFile[] = list.map((file, idx) => {
        const isWithinPreviewLimit = currentCount + idx < MAX_PREVIEWS;
        return {
          file,
          preview: isWithinPreviewLimit ? URL.createObjectURL(file) : "",
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        };
      });
      return [...prev, ...mapped];
    });
    setUploadStatus(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target && target.preview) {
        URL.revokeObjectURL(target.preview);
      }
      const updated = prev.filter((f) => f.id !== id);
      return updated.map((item, idx) => {
        if (idx < MAX_PREVIEWS && !item.preview) {
          return { ...item, preview: URL.createObjectURL(item.file) };
        }
        return item;
      });
    });
  }, []);

  const clearAll = useCallback(() => {
    selectedFiles.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setSelectedFiles([]);
    setUploadStatus(null);
    setProgress(0);
    setBatchInfo(null);
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    // ponytail: dropping mid-upload corrupts batch snapshots + wipes retry banner — queue for after.
    if (loading) return;
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploadStatus({ kind: "error", text: "Upload cancelled by user." });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !event_id || loading) return;

    setLoading(true);
    setUploadStatus(null);
    lastProgressCommitRef.current = 0;
    setProgress(0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const allFiles = [...selectedFiles];
    const totalFilesCount = allFiles.length;
    const batches = buildByteBudgetedBatches(allFiles);
    const totalBatches = batches.length;
    let uploadedCount = 0;
    // ponytail: shared across concurrent batches — caption only when every file compressed.
    let hadFallback = false;
    let allCompressed = true;

    try {
      // ponytail: aggregate progress via fractions so concurrent batches share one ref-throttled bar.
      const batchFractions: number[] = batches.map(() => 0);
      let nextBatchIdx = 0;
      let completedBatches = 0;
      let batchFailed = false;
      // First worker error wins: without this, a sibling's failure throws a
      // generic CanceledError that hides the real per-batch error below.
      let firstError: unknown = null;

      const commitAggregateProgress = () => {
        const loadedFiles = batchFractions.reduce((sum, f) => sum + f, 0);
        const now = Date.now();
        if (now - lastProgressCommitRef.current >= PROGRESS_COMMIT_INTERVAL_MS) {
          lastProgressCommitRef.current = now;
          setProgress(Math.min(99, Math.round((loadedFiles / totalFilesCount) * 100)));
        }
      };

      const uploadBatch = async (batchIdx: number): Promise<void> => {
        if (abortController.signal.aborted) {
          throw new Error("CanceledError");
        }
        // ponytail: no start-of-batch counter — batchIdx order races under
        // concurrency and a sibling failure could paint a count for a batch that never ran.

        const currentBatch = batches[batchIdx];

        // Direct browser-to-G3 per file; falls back to legacy multipart POST
        // when the store is unconfigured, hashing is unavailable, or a stage
        // call answers local. Same retry/cancel/progress scaffolding below.
        const uploadOneDirect = async (item: SelectedFile, slot: number): Promise<boolean> => {
          const { blob, compressed } = await preparedFor(item);
          const type = compressed ? "image/jpeg" : item.file.type;
          const hash = await fileHasher.sha256Hex(blob);
          if (!hash) return false;
          let stage: {
            duplicate?: boolean; photo?: { _id?: string }; key?: string | null;
            uploadUrl?: string | null; via?: string;
          };
          try {
            const res = await axios.post(
              `${API_URL}/photo/stage`,
              {
                event_id,
                hash,
                filename: item.file.name,
                size: blob.size,
                contentType: type,
                folder_name,
                upload_by: USER_ID ?? undefined,
              },
              { signal: abortController.signal, timeout: 0 }
            );
            stage = res.data;
          } catch (stageErr: unknown) {
            // ponytail: abort during stage must cancel now, not degrade to fallback.
            if (
              abortController.signal.aborted ||
              (typeof axios.isCancel === "function" && axios.isCancel(stageErr)) ||
              (stageErr instanceof Error && (stageErr.name === "CanceledError" || stageErr.message === "CanceledError"))
            ) {
              throw stageErr;
            }
            return false;
          }
          // ponytail: backend only reports duplicate when bytes are present
          // (local or G3), so done here is real — no blind trust. Falsy stage
          // (empty body) must fall back, never count as success.
          if (stage && stage.duplicate) {
            batchFractions[batchIdx] = Math.max(batchFractions[batchIdx], slot + 1);
            commitAggregateProgress();
            return true;
          }
          if (!stage || stage.via === "local" || !stage.uploadUrl || !stage.key) return false;
          const photoId = stage.photo && typeof stage.photo._id === "string" ? stage.photo._id : null;
          if (!photoId) return false;
          await axios.put(stage.uploadUrl, blob, {
            headers: { "Content-Type": type || "image/jpeg" },
            signal: abortController.signal,
            timeout: 0,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                batchFractions[batchIdx] = Math.max(
                  batchFractions[batchIdx],
                  slot + progressEvent.loaded / progressEvent.total
                );
                commitAggregateProgress();
              }
            },
          });
          const done = await axios.post(
            `${API_URL}/photo/complete`,
            { photo_id: photoId, event_id },
            { signal: abortController.signal, timeout: 0 }
          );
          if (!done.data || done.data.ok !== true) throw new Error("object-missing");
          // ponytail: progress events never fire for tiny files/mocks — pin the slot done.
          batchFractions[batchIdx] = Math.max(batchFractions[batchIdx], slot + 1);
          commitAggregateProgress();
          return true;
        };

        // ponytail: direct pass runs once per batch; retryable PUT/complete
        // blips degrade to the multer fallback below (retried there), so one
        // transient never fails the batch. Backend re-mints the same key on
        // duplicate, so no orphan or double stub.
        const directDone: boolean[] = [];
        for (let slot = 0; slot < currentBatch.length; slot += 1) {
          const item = currentBatch[slot];
          if (!item) continue;
          try {
            directDone.push(await uploadOneDirect(item, slot));
          } catch (directErr: unknown) {
            if (
              abortController.signal.aborted ||
              (typeof axios.isCancel === "function" && axios.isCancel(directErr)) ||
              (directErr instanceof Error && (directErr.name === "CanceledError" || directErr.message === "CanceledError"))
            ) {
              throw directErr;
            }
            directDone.push(false);
          }
        }
        const needFallback = currentBatch.filter((_, i) => directDone[i] !== true);
        if (needFallback.length === 0) {
          if (abortController.signal.aborted) throw new Error("CanceledError");
          if (batchFailed) throw firstError ?? new Error("CanceledError");
          setUploadStatus(null);
          uploadedCount += currentBatch.length;
          batchFractions[batchIdx] = currentBatch.length;
          completedBatches += 1;
          setBatchInfo({ current: Math.min(completedBatches, totalBatches), total: totalBatches });
          setSelectedFiles((prev) => {
            const uploadedIds = new Set(currentBatch.map((b) => b.id));
            prev.forEach((item) => {
              if (uploadedIds.has(item.id) && item.preview) URL.revokeObjectURL(item.preview);
            });
            const remaining = prev.filter((item) => !uploadedIds.has(item.id));
            return remaining.map((item, idx) => {
              if (idx < MAX_PREVIEWS && !item.preview) return { ...item, preview: URL.createObjectURL(item.file) };
              return item;
            });
          });
          const overallPct = Math.round((batchFractions.reduce((sum, f) => sum + f, 0) / totalFilesCount) * 100);
          lastProgressCommitRef.current = Date.now();
          setProgress(overallPct);
          return;
        }
        let attempt = 0;
        // ponytail: compress once per file (memoized); server originalname
        // stays the photographer's filename, dedup hash is content-based.
        const preparedFallback = await Promise.all(needFallback.map((item) => preparedFor(item)));
        if (preparedFallback.length > 0) {
          hadFallback = true;
          if (!preparedFallback.every((p) => p.compressed)) allCompressed = false;
        }
        for (;;) {
          attempt += 1;
          try {
            const formData = new FormData();
            needFallback.forEach((item, i) => {
              formData.append("name", preparedFallback[i]?.blob ?? item.file, item.file.name);
            });
            formData.append("event_id", event_id);
            if (folder_name) formData.append("folder_name", folder_name);
            if (USER_ID) {
              formData.append("upload_by", USER_ID);
              formData.append("user_id", USER_ID);
            }
            const fallbackBase = currentBatch.length - needFallback.length;
            const currentBatchSize = needFallback.length;
            const res = await axios.post(`${API_URL}/photo`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
              signal: abortController.signal,
              timeout: 0,
              onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                  batchFractions[batchIdx] =
                    fallbackBase + (progressEvent.loaded / progressEvent.total) * currentBatchSize;
                  commitAggregateProgress();
                }
              },
            });

            if (res.status === 207) {
              throw new Error("Some photos in this batch failed to process.");
            }
            // ponytail: cancel won the race after post resolved — never report false success.
            if (abortController.signal.aborted) {
              throw new Error("CanceledError");
            }
            break;
          } catch (attemptErr: unknown) {
            if (
              abortController.signal.aborted ||
              (typeof axios.isCancel === "function" && axios.isCancel(attemptErr)) ||
              (attemptErr instanceof Error && (attemptErr.name === "CanceledError" || attemptErr.message === "CanceledError"))
            ) {
              throw attemptErr;
            }
            if (!isRetryableUploadError(attemptErr) || attempt >= UPLOAD_MAX_ATTEMPTS) {
              throw attemptErr;
            }
            setBatchInfo({ current: Math.min(completedBatches + 1, totalBatches), total: totalBatches });
            setUploadStatus({
              kind: "error",
              text: `Batch ${batchIdx + 1} of ${totalBatches} hit a network blip — retrying (${attempt}/${UPLOAD_MAX_ATTEMPTS})…`,
            });
            // ponytail: hoist waitMs out of the closure (no-loop-func) + skip timer for zero-delay first retry.
            const waitMs = uploadDelayMs(attempt);
            if (waitMs > 0) {
              const signal = abortController.signal;
              await new Promise<void>((resolve, reject) => {
                if (signal.aborted) {
                  reject(new Error("CanceledError"));
                  return;
                }
                const onAbort = () => {
                  window.clearTimeout(timer);
                  reject(new Error("CanceledError"));
                };
                const timer = window.setTimeout(() => {
                  signal.removeEventListener("abort", onAbort);
                  resolve();
                }, waitMs);
                signal.addEventListener("abort", onAbort, { once: true });
              });
            }
          }
        }
        // ponytail: sibling failure must not masquerade as a user cancel —
        // only an actual abort throws CanceledError; otherwise rethrow the real error.
        if (abortController.signal.aborted) {
          throw new Error("CanceledError");
        }
        if (batchFailed) {
          throw firstError ?? new Error("CanceledError");
        }
        setUploadStatus(null);
        uploadedCount += currentBatch.length;
        batchFractions[batchIdx] = currentBatch.length;
        completedBatches += 1;
        setBatchInfo({ current: Math.min(completedBatches, totalBatches), total: totalBatches });
        setSelectedFiles((prev) => {
          const uploadedIds = new Set(currentBatch.map((b) => b.id));
          prev.forEach((item) => {
            if (uploadedIds.has(item.id) && item.preview) {
              URL.revokeObjectURL(item.preview);
            }
          });
          const remaining = prev.filter((item) => !uploadedIds.has(item.id));
          return remaining.map((item, idx) => {
            if (idx < MAX_PREVIEWS && !item.preview) {
              return { ...item, preview: URL.createObjectURL(item.file) };
            }
            return item;
          });
        });
        const overallPct = Math.round((batchFractions.reduce((sum, f) => sum + f, 0) / totalFilesCount) * 100);
        lastProgressCommitRef.current = Date.now();
        setProgress(overallPct);
      };

      // ponytail: 3-slot pool over the same per-batch body — serial awaits left the uplink idle behind one slow batch.
      const worker = async (): Promise<void> => {
        for (;;) {
          if (batchFailed) return;
          const batchIdx = nextBatchIdx;
          if (batchIdx >= totalBatches) return;
          nextBatchIdx += 1;
          try {
            await uploadBatch(batchIdx);
          } catch (workerErr) {
            if (firstError === null) firstError = workerErr;
            batchFailed = true;
            throw workerErr;
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(UPLOAD_BATCH_CONCURRENCY, totalBatches) }, () => worker()));

      setUploadStatus({
        kind: "success",
        text: `Successfully uploaded ${uploadedCount} photo${uploadedCount > 1 ? "s" : ""}. AI indexing started!${hadFallback && allCompressed ? " Optimized for fast upload, original quality." : ""}`,
      });
      setProgress(100);
       setBatchInfo(null);
       if (d_ref) {
         setTimeout(() => d_ref(), 800);
       }
    } catch (err: unknown) {
      if (
        abortController.signal.aborted ||
        (typeof axios.isCancel === "function" && axios.isCancel(err)) ||
        (err instanceof Error && (err.name === "CanceledError" || err.message === "CanceledError"))
      ) {
        setUploadStatus({
          kind: "error",
          text: `Upload cancelled. ${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded before cancellation.`,
        });
      } else {
        let message = err instanceof Error && err.message ? err.message : "Upload failed. Please check network connection.";
        if (typeof axios.isAxiosError === "function" && axios.isAxiosError(err)) {
          const responseData = err.response?.data;
          // ponytail: 422-all-failed ships an ARRAY of per-file errors — surface the first, not axios's generic status text.
          if (Array.isArray(responseData)) {
            const first = responseData.find((r) => r && typeof r === "object" && "error" in r);
            if (first) message = String(first.error);
          } else if (responseData && typeof responseData === "object" && "message" in responseData) {
            message = String(responseData.message);
          } else if (responseData && typeof responseData === "object" && "error" in responseData) {
            message = String(responseData.error);
          }
        }
        setUploadStatus({
          kind: "error",
          text: uploadedCount > 0
            ? `Uploaded ${uploadedCount} of ${totalFilesCount} photos. Batch failed: ${message}. Click Upload to retry remaining photos.`
            : `Upload failed: ${message}. Please try again.`,
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const previewItems = selectedFiles.slice(0, MAX_PREVIEWS);
  const remainingCount = selectedFiles.length - previewItems.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Upload event photos</CardTitle>
        <Badge variant="brand">Auto AI indexing</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          htmlFor="album-file-input"
          onDragOver={loading ? undefined : handleDragOver}
          onDragLeave={loading ? undefined : handleDragLeave}
          onDrop={handleDrop}
          aria-disabled={loading}
          className={cn(
            "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 min-h-[140px] cursor-pointer transition-colors text-center",
            loading && "opacity-60 cursor-not-allowed",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40"
          )}
        >
          <input
            id="album-file-input"
            type="file"
            multiple
            accept="image/*"
            className="sr-only"
            disabled={loading}
            onChange={handleFileChange}
          />
          <ImagePlus className="h-8 w-8 text-muted-foreground/60 mb-2" />
          <strong className="text-sm font-medium text-foreground">
            {loading ? "Uploading — please wait, drop is paused" : isDragging ? "Drop photos here to queue" : "Click to select photos or drag & drop here"}
          </strong>
          <span className="text-xs text-muted-foreground mt-1">
            Supports JPG, PNG, WEBP — Batched memory-safe uploads for large albums (GBs supported)
          </span>
        </label>

        {selectedFiles.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""} queued ({formatFileSize(totalSize)})
              </span>
              <div className="flex items-center gap-2">
                {loading && (
                  <Button variant="outline" size="sm" onClick={cancelUpload} className="h-8 text-xs text-destructive hover:text-destructive">
                    Cancel upload
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={loading} className="h-8 text-xs">
                  Clear all
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {previewItems.map((item) => (
                <PreviewTile
                  key={item.id}
                  id={item.id}
                  previewUrl={item.preview}
                  fileName={item.file.name}
                  size={item.file.size}
                  onRemove={removeFile}
                  disabled={loading}
                />
              ))}

              {remainingCount > 0 && (
                <div className="aspect-square rounded-lg border border-dashed border-border bg-muted/40 p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-semibold text-foreground">+{remainingCount}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">more queued</span>
                  <span className="text-[10px] text-muted-foreground/70 mt-1">
                    (RAM protected)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {uploadStatus && (
          <div className="space-y-2 pt-2">
            <div
              className={`rounded-lg p-3 text-sm font-medium border ${
                uploadStatus.kind === "success"
                  ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {uploadStatus.text}
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {batchInfo
                  ? `Batch ${batchInfo.current} of ${batchInfo.total} (${progress}%)`
                  : `Uploading (${progress}%)`}
              </span>
              <span>Memory-safe stream</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Button
          type="button"
          onClick={handleUpload}
          disabled={loading || selectedFiles.length === 0}
          loading={loading}
          className="w-full sm:w-auto min-h-[44px] flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {loading
            ? `Uploading (${progress}%)…`
            : `Upload ${selectedFiles.length} photo${selectedFiles.length === 1 ? "" : "s"} (${formatFileSize(totalSize)}) →`}
        </Button>
      </CardContent>
    </Card>
  );
}
