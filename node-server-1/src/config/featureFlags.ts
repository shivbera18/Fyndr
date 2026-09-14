export type FlagId = "reel";

export interface FlagDef {
  id: FlagId;
  envKey: string;
  defaultEnabled: boolean;
}

export const FLAGS: Record<FlagId, FlagDef> = {
  // Make a Reel — creator, music, shorts audio (first consumer)
  reel: { id: "reel", envKey: "FEATURE_REEL", defaultEnabled: false },
};

// Back-end: reads process.env fresh on every call (not build-time inlined),
// so tests flip env by mutating process.env and calling the helper again.
// No overrides param needed — that keeps the surface smaller. If we ever need
// per-request context, add overrides then. For now symmetry is intentionally
// broken for the right reason: different build semantics.
export function isFeatureEnabled(id: FlagId): boolean {
  const def = FLAGS[id];
  const raw = process.env[def.envKey];
  if (raw === undefined) return def.defaultEnabled;
  return raw === "true";
}
