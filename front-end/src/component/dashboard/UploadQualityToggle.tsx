import { useState } from "react";
import { isOriginalQuality, setOriginalQuality } from "../../utils/uploadPrefs";

// ponytail: shared by /account + /settings account tab — one toggle, one pref key.
export default function UploadQualityToggle(): React.JSX.Element {
  const [original, setOriginal] = useState<boolean>(() => isOriginalQuality());
  return (
    <label
      htmlFor="upload-original-quality"
      className="flex items-center justify-between gap-4 min-h-[44px] cursor-pointer"
    >
      <span className="space-y-0.5">
        <span className="block text-sm font-medium text-foreground">Original quality uploads</span>
        <span className="block text-xs text-muted-foreground">
          Skip fast-upload compression; full-resolution originals, larger and slower uploads.
        </span>
      </span>
      <input
        id="upload-original-quality"
        type="checkbox"
        checked={original}
        onChange={(e) => {
          setOriginal(e.target.checked);
          setOriginalQuality(e.target.checked);
        }}
        className="size-5 shrink-0 accent-primary"
      />
    </label>
  );
}
