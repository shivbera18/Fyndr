export function dataURLToBlob(dataUrl: string): Blob {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.includes(",")) {
    return new Blob([], { type: "image/png" });
  }
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  try {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return new Blob([], { type: mime });
  }
}

export function sanitizeFileName(name: string, suffix: string): string {
  const base =
    name
      .replace(/[/\\?%*:|"<>]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 50) || "Event";
  return `${base}${suffix}`;
}

export function shareOrDownload(
  blob: Blob,
  fileName: string,
  title: string,
  setMsg?: (m: string) => void
): void {
  try {
    if (
      navigator.canShare &&
      navigator.canShare({ files: [new File([blob], fileName, { type: "image/png" })] })
    ) {
      navigator
        .share({ files: [new File([blob], fileName, { type: "image/png" })], title })
        .then(() => setMsg?.("Shared successfully."))
        .catch((err) => {
          if (err && (err.name === "AbortError" || err.name === "Abort")) return;
          fallbackDownload(blob, fileName, setMsg);
        });
      return;
    }
  } catch {}
  fallbackDownload(blob, fileName, setMsg);
}

function fallbackDownload(
  blob: Blob,
  fileName: string,
  setMsg?: (m: string) => void
): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg?.("Downloaded — check your Downloads folder.");
  } catch {
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setMsg?.("Opened in new tab — long-press the image to Save to Photos.");
  }
}
