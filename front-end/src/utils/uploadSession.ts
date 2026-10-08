// ponytail: module singleton, no provider — survives Upload_Img remount
// (route/tab change) with zero tree wiring. In-memory only: a full page
// reload still restarts the queue (File objects aren't cheaply serializable).
export type UploadSessionStatus = { kind: "success" | "error"; text: string } | null;

export type UploadSessionSnapshot = {
  eventId: string | null;
  active: boolean;
  totalFiles: number;
  fractions: number[];
  progress: number;
  batchCurrent: number;
  batchTotal: number;
  uploadedCount: number;
  uploadedIds: string[];
  status: UploadSessionStatus;
  paused: boolean;
};

export type UploadSessionListener = (snapshot: UploadSessionSnapshot) => void;

type SessionState = {
  eventId: string | null;
  abort: AbortController | null;
  fractions: number[];
  progress: number;
  batchCurrent: number;
  batchTotal: number;
  uploadedCount: number;
  uploadedIds: string[];
  status: UploadSessionStatus;
  paused: boolean;
};

const state: SessionState = {
  eventId: null,
  abort: null,
  fractions: [],
  progress: 0,
  batchCurrent: 0,
  batchTotal: 0,
  uploadedCount: 0,
  uploadedIds: [],
  status: null,
  paused: false,
};

const listeners = new Set<UploadSessionListener>();

export function getSnapshot(): UploadSessionSnapshot {
  return {
    eventId: state.eventId,
    active: state.abort !== null,
    totalFiles: state.fractions.length,
    fractions: [...state.fractions],
    progress: state.progress,
    batchCurrent: state.batchCurrent,
    batchTotal: state.batchTotal,
    uploadedCount: state.uploadedCount,
    uploadedIds: [...state.uploadedIds],
    status: state.status,
    paused: state.paused,
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

export function startSession(eventId: string, totalFiles: number, batchTotal: number): AbortController {
  // ponytail: session-id guard — StrictMode double-mount replays startSession
  // with the same totals; only reset when the event or shape actually changes.
  if (state.abort !== null && state.eventId === eventId && state.fractions.length === totalFiles) {
    return state.abort;
  }
  state.eventId = eventId;
  state.abort = new AbortController();
  state.fractions = Array.from({ length: totalFiles }, () => 0);
  state.progress = 0;
  state.batchCurrent = 0;
  state.batchTotal = batchTotal;
  state.uploadedCount = 0;
  state.uploadedIds = [];
  state.status = null;
  state.paused = false;
  emit();
  return state.abort;
}

export function reportProgress(update: {
  fractions?: number[];
  progress?: number;
  batchCurrent?: number;
  uploadedCount?: number;
  uploadedIds?: string[];
  status?: UploadSessionStatus;
}): void {
  if (update.fractions !== undefined) state.fractions = [...update.fractions];
  if (update.progress !== undefined) state.progress = update.progress;
  if (update.batchCurrent !== undefined) state.batchCurrent = update.batchCurrent;
  if (update.uploadedCount !== undefined) state.uploadedCount = update.uploadedCount;
  if (update.uploadedIds !== undefined) state.uploadedIds = [...update.uploadedIds];
  if (update.status !== undefined) state.status = update.status;
  emit();
}

export function cancelSession(): void {
  state.abort?.abort();
  state.abort = null;
  state.paused = false;
  emit();
}

export function endSession(): void {
  state.abort = null;
  state.paused = false;
  emit();
}

export function pauseSession(): void {
  state.paused = true;
  emit();
}

export function resumeSession(): void {
  state.paused = false;
  emit();
}

/** Test-only escape hatch: resets module state between suites. */
export function __resetUploadSessionForTests(): void {
  state.eventId = null;
  state.abort = null;
  state.fractions = [];
  state.progress = 0;
  state.batchCurrent = 0;
  state.batchTotal = 0;
  state.uploadedCount = 0;
  state.uploadedIds = [];
  state.status = null;
  state.paused = false;
  listeners.clear();
}
