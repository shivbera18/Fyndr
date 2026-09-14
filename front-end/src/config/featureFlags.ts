export type FlagId = "reel";

export interface FlagDef {
  id: FlagId;
  envKey: string;
  defaultEnabled: boolean;
}

export const FLAGS: Record<FlagId, FlagDef> = {
  // Make a Reel — creator, music, shorts audio (first consumer)
  reel: { id: "reel", envKey: "REACT_APP_FEATURE_REEL", defaultEnabled: false },
};

// Frontend: CRA inlines process.env at build time, so unit tests cannot flip
// env by mutating process.env + resetModules. Tests MUST use the overrides
// param or mock the module. No direct process.env reads in components.
export function isFeatureEnabled(id: FlagId, overrides?: Partial<Record<FlagId, boolean>>): boolean {
  if (overrides && id in overrides) return overrides[id] as boolean;
  const def = FLAGS[id];
  const raw = process.env[def.envKey];
  if (raw === undefined) return def.defaultEnabled;
  return raw === "true";
}
