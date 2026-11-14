// ponytail: module singleton, no provider — survives Upload_Img remount
// (route/tab change) with zero tree wiring. In-memory only: a full page
// reload still restarts the queue (File objects aren't cheaply serializable).
export type UploadSessionStatus = { kind: "success" | "error"; text: string } | null;

export type SelectedFile = {
  file: File;
  id: string;
  // Only the active photo may retain prepared bytes, until its attempt ends.
  prepared?: { blob: Blob; compressed: boolean };
};

export type UploadSessionSnapshot = {
  eventId: string | null;
  active: boolean;
  totalFiles: number;
  progress: number;
  batchCurrent: number;
  batchTotal: number;
  uploadedCount: number;
  status: UploadSessionStatus;
  paused: boolean;
  remainingFiles: SelectedFile[];
};

export type UploadSessionListener = (snapshot: UploadSessionSnapshot) => void;

type SessionState = {
  eventId: string | null;
  abort: AbortController | null;
  totalFiles: number;
  progress: number;
  batchCurrent: number;
  batchTotal: number;
  uploadedCount: number;
  status: UploadSessionStatus;
  paused: boolean;
  remainingFiles: SelectedFile[];
};

const state: SessionState = {
  eventId: null,
  abort: null,
  totalFiles: 0,
  progress: 0,
  batchCurrent: 0,
  batchTotal: 0,
  uploadedCount: 0,
  status: null,
  paused: false,
  remainingFiles: [],
};

const listeners = new Set<UploadSessionListener>();

export function getSnapshot(): UploadSessionSnapshot {
  return {
    eventId: state.eventId,
    active: state.abort !== null,
    totalFiles: state.totalFiles,
    progress: state.progress,
    batchCurrent: state.batchCurrent,
    batchTotal: state.batchTotal,
    uploadedCount: state.uploadedCount,
    status: state.status,
    paused: state.paused,
    remainingFiles: state.remainingFiles,
  };
}

function emit(): void {
  const snapshot = getSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

export function attach(listener: UploadSessionListener): () => void {
  listeners.add(listener);
  listener(getSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

export function isPaused(): boolean {
  return state.paused;
}

export function startSession(eventId: string, files: SelectedFile[], batchTotal: number): AbortController {
  // Reattaching the same queue must not create a second controller.
  if (state.abort !== null && state.eventId === eventId && state.remainingFiles === files) {
    return state.abort;
  }
  if (state.abort !== null) throw new Error("An upload is already running.");
  state.eventId = eventId;
  state.abort = new AbortController();
  state.totalFiles = files.length;
  state.progress = 0;
  state.batchCurrent = 0;
  state.batchTotal = batchTotal;
  state.uploadedCount = 0;
  state.status = null;
  state.paused = false;
  state.remainingFiles = files;
  emit();
  return state.abort;
}

export function reportProgress(update: {
  progress?: number;
  batchCurrent?: number;
  uploadedCount?: number;
  status?: UploadSessionStatus;
  remainingFiles?: SelectedFile[];
}, eventId?: string): void {
  // ponytail: stale closures (prior event's orphaned upload) must not clobber
  // the current session — callers pass their event_id, mismatches are dropped.
  if (eventId !== undefined && eventId !== state.eventId) return;
  if (update.progress !== undefined) state.progress = update.progress;
  if (update.batchCurrent !== undefined) state.batchCurrent = update.batchCurrent;
  if (update.uploadedCount !== undefined) state.uploadedCount = update.uploadedCount;
  if (update.status !== undefined) state.status = update.status;
  if (update.remainingFiles !== undefined) state.remainingFiles = update.remainingFiles;
  emit();
}

export function cancelSession(): void {
  state.abort?.abort();
  state.paused = false;
  emit();
}

export function endSession(eventId?: string): void {
  if (eventId !== undefined && eventId !== state.eventId) return;
  state.abort = null;
  state.remainingFiles.forEach(item => { delete item.prepared; });
  state.paused = false;
  emit();
}

export function setRemainingFiles(eventId: string, files: SelectedFile[]): void {
  if (state.eventId !== eventId || state.abort !== null) return;
  state.remainingFiles.forEach(item => { delete item.prepared; });
  state.remainingFiles = files;
  state.status = null;
  state.progress = 0;
  state.batchCurrent = 0;
  state.batchTotal = 0;
  emit();
}
export function pauseSession(): void {
  if (state.abort === null || state.abort.signal.aborted) return;
  state.paused = true;
  emit();
}

export function resumeSession(): void {
  if (state.abort === null || state.abort.signal.aborted) return;
  state.paused = false;
  emit();
}

/** Test-only escape hatch: resets module state between suites. */
export function __resetUploadSessionForTests(): void {
  state.eventId = null;
  state.abort = null;
  state.totalFiles = 0;
  state.progress = 0;
  state.batchCurrent = 0;
  state.batchTotal = 0;
  state.uploadedCount = 0;
  state.status = null;
  state.paused = false;
  state.remainingFiles = [];
  listeners.clear();
}
