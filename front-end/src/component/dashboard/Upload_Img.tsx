import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_URL } from "../../utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ImagePlus, Upload, X } from "lucide-react";
import { cn } from "../../lib/utils";

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

export default function Upload_Img({ event_id, d_ref }: Props): React.JSX.Element {
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
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;

    const mapped: SelectedFile[] = list.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${file.size}-${Math.random()}`,
    }));

    setSelectedFiles((prev) => [...prev, ...mapped]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearAll = () => {
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    setUploadStatus(null);
  };

  useEffect(() => {
    return () => {
      filesRef.current.forEach((f) => URL.revokeObjectURL(f.preview));
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
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !event_id) return;

    setLoading(true);
    setUploadStatus(null);
    setProgress(0);

    const formData = new FormData();
    selectedFiles.forEach((item) => {
      formData.append("photos", item.file);
    });
    formData.append("event_id", event_id);
    if (USER_ID) {
      formData.append("user_id", USER_ID);
    }

    try {
      const res = await axios.post(`${API_URL}/upload_img`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(pct);
          }
        },
      });

      if (res.status === 200 || res.status === 201) {
        setUploadStatus({
          kind: "success",
          text: `Successfully uploaded ${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""}. AI indexing started!`,
        });
        selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
        setSelectedFiles([]);
        if (d_ref) {
          setTimeout(() => d_ref(), 1000);
        }
      } else {
        setUploadStatus({ kind: "error", text: "Upload failed. Please try again." });
      }
    } catch (err: unknown) {
      let message = "Upload failed. Please check network connection.";
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;
        if (responseData && typeof responseData === "object" && "message" in responseData) {
          message = String(responseData.message);
        }
      }
      setUploadStatus({
        kind: "error",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Upload event photos</CardTitle>
        <Badge variant="brand">Auto AI indexing</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          htmlFor="album-file-input"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 min-h-[140px] cursor-pointer transition-colors text-center",
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
            onChange={handleFileChange}
          />
          <ImagePlus className="h-8 w-8 text-muted-foreground/60 mb-2" />
          <strong className="text-sm font-medium text-foreground">
            {isDragging ? "Drop photos here to queue" : "Click to select photos or drag & drop here"}
          </strong>
          <span className="text-xs text-muted-foreground mt-1">
            Supports JPG, PNG, WEBP — Multi-select up to 100 photos at a time
          </span>
        </label>

        {selectedFiles.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""} queued for upload
              </span>
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs">
                Clear all
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {selectedFiles.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                  title={item.file.name}
                >
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(item.id);
                    }}
                    title={`Remove ${item.file.name} (${formatFileSize(item.file.size)})`}
                    aria-label={`Remove ${item.file.name}`}
                    className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
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
            {loading && (
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
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
            : `Upload ${selectedFiles.length} photo${selectedFiles.length === 1 ? "" : "s"} to event →`}
        </Button>
      </CardContent>
    </Card>
  );
}
