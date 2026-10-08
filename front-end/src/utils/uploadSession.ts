// ponytail: module singleton, no provider — survives Upload_Img remount
// (route/tab change) with zero tree wiring. In-memory only: a full page
// reload still restarts the queue (File objects aren't cheaply serializable).
export type UploadSessionSnapshot = {
  eventId: string | null;
  active: boolean;
  totalFiles: number;
  fractions: number[];
  uploadedCount: number;
  uploadedIds: string[];
  paused: boolean;
};

export type UploadSessionListener = (snapshot: UploadSessionSnapshot) => void;

type SessionState = {
  eventId: string | null;
  abort: AbortController | null;
  fractions: number[];
  uploadedCount: number;
  uploadedIds: string[];
  paused: boolean;
};

const state: SessionState = {
  eventId: null,
  abort: null,
  fractions: [],
  uploadedCount: 0,
  uploadedIds: [],
  paused: false,
};

const listeners = new Set<UploadSessionListener>();

export function getSnapshot(): UploadSessionSnapshot {
  return {
    eventId: state.eventId,
    active: state.abort !== null,
    totalFiles: state.fractions.length,
    fractions: [...state.fractions],
    uploadedCount: state.uploadedCount,
    uploadedIds: [...state.uploadedIds],
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

export function startSession(eventId: string, totalFiles: number): AbortController {
  state.eventId = eventId;
  state.abort = new AbortController();
  state.fractions = Array.from({ length: totalFiles }, () => 0);
  state.uploadedCount = 0;
  state.uploadedIds = [];
  state.paused = false;
  emit();
  return state.abort;
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
  state.uploadedCount = 0;
  state.uploadedIds = [];
  state.paused = false;
  listeners.clear();
}
