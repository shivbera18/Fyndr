import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_URL } from "../../utils/api";
import { Banner, Button, Reveal } from "../landing/primitives";

type SelectedFile = {
  file: File;
  preview: string;
  id: string;
};

type Props = {
  event_id: string;
  d_ref?: () => void;
  inevent?: boolean;
};

export default function Upload_Img({ event_id, d_ref, inevent }: Props): React.JSX.Element {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const filesRef = useRef<SelectedFile[]>([]);
  filesRef.current = selectedFiles;

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const USER_ID = (user._id || null) as string | null;

  const formatFileSize = (bytes: number) => {
    if (!bytes && bytes !== 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const newItems = fileArray.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${file.size}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    setSelectedFiles((prev) => [...prev, ...newItems]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = ""; // Reset input to allow re-selecting the same file
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item && item.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearAll = () => {
    selectedFiles.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setSelectedFiles([]);
  };

  useEffect(() => {
    return () => {
      filesRef.current.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadStatus({ kind: "error", text: "Please select at least one image file." });
      return;
    }

    setLoading(true);
    setUploadStatus({
      kind: "success",
      text: `Uploading ${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""}…`,
    });
    setProgress(0);

    let successCount = 0;
    const failedFiles: SelectedFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const item = selectedFiles[i];
      const formData = new FormData();
      formData.append("name", item.file);
      formData.append("event_id", event_id);
      formData.append("upload_by", USER_ID || "");

      try {
        const response = await axios.post(`${API_URL}/photo`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000,
        });

        const result = Array.isArray(response.data) ? response.data[0] : response.data;
        if (!result?.error && result?.status !== "failed") {
          successCount++;
          if (item.preview) URL.revokeObjectURL(item.preview);
        } else {
          failedFiles.push(item);
        }
      } catch {
        failedFiles.push(item);
      }

      setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
    }

    setLoading(false);
    setSelectedFiles(failedFiles);

    if (successCount > 0 && failedFiles.length === 0) {
      setUploadStatus({
        kind: "success",
        text: `Successfully uploaded ${successCount} photo${successCount > 1 ? "s" : ""}!`,
      });
      if (inevent && typeof d_ref === "function") d_ref();
    } else if (successCount > 0 && failedFiles.length > 0) {
      setUploadStatus({
        kind: "error",
        text: `Uploaded ${successCount} photos, but ${failedFiles.length} failed. You can retry the remaining files.`,
      });
      if (inevent && typeof d_ref === "function") d_ref();
    } else {
      setUploadStatus({ kind: "error", text: "Failed to upload photos. Please try again." });
    }
  };

  return (
    <Reveal>
      <div className="fy-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ margin: 0 }}>Upload event photos</h3>
          <span className="fy-badge">Auto AI indexing</span>
        </div>

        <div
          className={isDragging ? "fy-dropzone is-dragging" : "fy-dropzone"}
          onClick={() => document.getElementById("album-file-input")?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            id="album-file-input"
            type="file"
            multiple
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <strong>{isDragging ? "Drop photos here to queue" : "Click to select photos or drag & drop here"}</strong>
          <span className="fy-help" style={{ display: "block", marginTop: "0.25rem" }}>
            Supports JPG, PNG, WEBP — Multi-select up to 100 photos at a time
          </span>
        </div>

        {selectedFiles.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <strong>
                {selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""} queued for upload
              </strong>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            </div>

            <div className="fy-gallery">
              {selectedFiles.map((item) => (
                <div key={item.id} className="fy-photo-cell" title={item.file.name}>
                  <img src={item.preview} alt={item.file.name} loading="lazy" />
                  <div className="fy-photo-actions">
                    <button
                      type="button"
                      className="fy-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(item.id);
                      }}
                      title={`Remove ${item.file.name} (${formatFileSize(item.file.size)})`}
                      aria-label={`Remove ${item.file.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadStatus && (
          <div style={{ marginTop: "1rem" }}>
            <Banner kind={uploadStatus.kind}>{uploadStatus.text}</Banner>
            {loading && (
              <div className="fy-progress" style={{ marginTop: "0.5rem" }} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "1rem" }}>
          <button
            className="fy-btn fy-btn-default fy-btn-md"
            type="button"
            onClick={handleUpload}
            disabled={loading || selectedFiles.length === 0}
          >
            {loading
              ? `Uploading (${progress}%)…`
              : `Upload ${selectedFiles.length} photo${selectedFiles.length === 1 ? "" : "s"} to event →`}
          </button>
        </div>
      </div>
    </Reveal>
  );
}
