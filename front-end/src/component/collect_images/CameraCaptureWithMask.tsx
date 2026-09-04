import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "../../landing.css";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Banner, Button, Modal, Reveal } from "../landing/primitives";
import { API_URL, ML_URL } from "../../utils/api";

type MatchedPhoto = {
  id?: string;
  name: string;
  similarity?: number;
};

type PreviewPhoto = {
  url: string;
  name: string;
  sim: number;
};

const CameraCaptureWithMask = (): React.JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const event_id = location.state as string | null;

  const webcamRef = useRef<Webcam>(null);
  const uploadedImageUrlRef = useRef<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [matchedPhotos, setMatchedPhotos] = useState<MatchedPhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhoto | null>(null);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [useUploadMode, setUseUploadMode] = useState<boolean>(false);

  const fallbackPlaceholder =
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F3F4F6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20font-weight%3D%22bold%22%20fill%3D%22%239CA3AF%22%3E%E2%9A%A0%EF%B8%8F%20Image%20Unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";

  const captureAndMatch = async (): Promise<void> => {
    if (!webcamRef.current) return;

    try {
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) {
        setErrorMessage("Failed to capture image from camera. Please allow camera permissions.");
        return;
      }

      setImageSrc(screenshot);
      const blob = await fetch(screenshot).then((res) => res.blob());
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });

      await processSelfieMatch(file);
    } catch {
      setErrorMessage("Error capturing selfie. Please try again.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (uploadedImageUrlRef.current) URL.revokeObjectURL(uploadedImageUrlRef.current);
      uploadedImageUrlRef.current = URL.createObjectURL(file);
      setImageSrc(uploadedImageUrlRef.current);
      await processSelfieMatch(file);
    }
  };

  const processSelfieMatch = async (file: File): Promise<void> => {
    setLoading(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("event_id", event_id as string);

      const response = await axios.post(`${ML_URL}/match_faces`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      if (response.data.matches && response.data.matches.length > 0) {
        setMatchedPhotos(response.data.matches as MatchedPhoto[]);
      } else {
        setMatchedPhotos([]);
        setErrorMessage(response.data.message || "No matching photos found in this event.");
      }
    } catch (error) {
      setMatchedPhotos([]);
      const msg =
        (axios.isAxiosError(error) &&
          (error.response?.data?.error || error.response?.data?.message || error.message)) ||
        (error instanceof Error && error.message) ||
        "Face detection failed. Please ensure your face is clearly visible.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const retakeSelfie = (): void => {
    if (uploadedImageUrlRef.current) URL.revokeObjectURL(uploadedImageUrlRef.current);
    uploadedImageUrlRef.current = null;
    setImageSrc(null);
    setMatchedPhotos([]);
    setErrorMessage("");
  };

  useEffect(
    () => () => {
      if (uploadedImageUrlRef.current) URL.revokeObjectURL(uploadedImageUrlRef.current);
    },
    []
  );

  const getApiBase = (): string => API_URL;

  const downloadImage = async (url: string, filename: string): Promise<void> => {
    let diskName = filename;
    if (!diskName && url) {
      try {
        diskName = new URL(url, window.location.origin).pathname.split("/").pop() as string;
      } catch {
        diskName = "matched_photo.jpg";
      }
    }
    diskName = diskName || "matched_photo.jpg";
    const displayFilename = diskName.replace(/^\d+-/, "");

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = displayFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      const apiBase = getApiBase();
      const downloadEndpoint = `${apiBase}/download/${encodeURIComponent(diskName)}`;
      const a = document.createElement("a");
      a.href = downloadEndpoint;
      a.download = displayFilename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleUserMediaError = (): void => {
    setErrorMessage("⚠ Camera access was unavailable or denied. Switched to gallery photo upload.");
    setUseUploadMode(true);
  };

  const openPreview = (url: string, name: string, sim: number): void => {
    setPreviewPhoto({ url, name, sim });
    setIsZoomed(false);
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackPlaceholder;
  };

  return (
    <div>
      <Header />
      <div className="fy-page fy-container">
        <Reveal>
          <div className="fy-page-head">
            <div>
              <p className="fy-eyebrow">AI selfie match</p>
              <h1>Find your photos</h1>
            </div>
            <div className="fy-page-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (event_id ? navigate(`/collect/${event_id}`) : navigate("/"))}
              >
                ← Back to Event
              </Button>
            </div>
          </div>
        </Reveal>

        {/* ================= STEP 1: CAPTURE OR RETAKE ================= */}
        {!imageSrc ? (
          <Reveal delay={50}>
            <div className="fy-auth-wrap">
              <div className="fy-auth-card" style={{ maxWidth: "34rem" }}>
                <div className="fy-card">
                  <span className="fy-badge fy-badge-brand">Take a selfie to find your photos</span>
                  <p className="fy-micro" style={{ textAlign: "center", marginTop: "0.75rem" }}>
                    Position your face in the frame with good lighting. Your selfie is only used
                    for matching and is never stored permanently.
                  </p>

                  {/* Webcam / File Viewport */}
                  {!useUploadMode ? (
                    <div
                      className="fy-qr-frame"
                      style={{
                        display: "block",
                        padding: "0.5rem",
                        position: "relative",
                        overflow: "hidden",
                        background: "#101014",
                        marginTop: "1rem",
                      }}
                    >
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        onUserMediaError={handleUserMediaError}
                        videoConstraints={{ facingMode: "user", width: 480, height: 480 }}
                        style={{
                          width: "100%",
                          maxHeight: "340px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          display: "block",
                        }}
                      />
                      {/* Face Guide Oval */}
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: "200px",
                          height: "260px",
                          border: "3px dashed rgba(255, 230, 0, 0.8)",
                          borderRadius: "50%",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="fy-dropzone"
                      style={{ marginTop: "1rem" }}
                      onClick={() => document.getElementById("selfie-file-input")?.click()}
                    >
                      <input
                        id="selfie-file-input"
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFileUpload}
                      />
                      <span className="fy-icon" aria-hidden="true">
                        ↓
                      </span>
                      <div style={{ fontWeight: 700, marginTop: "0.5rem" }}>
                        Select a selfie from your gallery
                      </div>
                      <div className="fy-micro">JPG or PNG, face clearly visible</div>
                    </div>
                  )}

                  {errorMessage && (
                    <div style={{ marginTop: "1rem" }}>
                      <Banner kind="error">{errorMessage}</Banner>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="fy-form" style={{ marginTop: "1rem" }}>
                    {!useUploadMode ? (
                      <button
                        className="fy-btn fy-btn-default fy-btn-lg"
                        type="button"
                        onClick={() => void captureAndMatch()}
                        style={{ width: "100%" }}
                      >
                        Take Selfie &amp; Find My Photos
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className="fy-btn fy-btn-ghost fy-btn-sm"
                      onClick={() => setUseUploadMode(!useUploadMode)}
                    >
                      {useUploadMode ? "Switch to camera" : "Or upload a photo instead"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        ) : (
          /* ================= STEP 2: RESULTS SECTION ================= */
          <div>
            <Reveal delay={50}>
              <div className="fy-card" style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "1.25rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Your Selfie"
                    style={{
                      width: "130px",
                      height: "130px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid var(--fy-border)",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: "16rem" }}>
                    <h2 style={{ margin: "0 0 0.25rem" }}>
                      {matchedPhotos.length > 0
                        ? `Found ${matchedPhotos.length} photo${
                            matchedPhotos.length > 1 ? "s" : ""
                          } with your face`
                        : "Search status"}
                    </h2>
                    <p className="fy-micro" style={{ margin: "0 0 0.75rem" }}>
                      {matchedPhotos.length > 0
                        ? "Select any photo to preview or download in high resolution."
                        : errorMessage ||
                          "We couldn't detect your face in this album with high confidence. Try taking another selfie with brighter lighting and facing straight ahead."}
                    </p>
                    <div className="fy-page-actions">
                      <Button variant="outline" size="sm" onClick={retakeSelfie}>
                        Retake Selfie
                      </Button>
                    </div>
                  </div>
                </div>
                {loading && (
                  <div className="fy-loading-row" role="status" style={{ marginTop: "1rem" }}>
                    <span className="fy-spinner" aria-hidden="true" />
                    <span>
                      <strong>Analyzing 512-D face embeddings…</strong> Matching your facial
                      signature across all event photos.
                    </span>
                  </div>
                )}
                {!loading && matchedPhotos.length === 0 && errorMessage && (
                  <div style={{ marginTop: "1rem" }}>
                    <Banner kind="error">{errorMessage}</Banner>
                  </div>
                )}
              </div>
            </Reveal>

            {/* Matched Images Grid */}
            {matchedPhotos.length > 0 && (
              <Reveal delay={100}>
                <div className="fy-page-head">
                  <h2 style={{ margin: 0 }}>Your matched photos ({matchedPhotos.length})</h2>
                </div>
                <div className="fy-gallery">
                  {matchedPhotos.map((photo, idx) => {
                    const imgUrl = `${getApiBase()}/uploads/${encodeURIComponent(photo.name)}`;
                    const simPercent = Math.round((photo.similarity ?? 0.9) * 100);

                    return (
                      <div key={photo.id || idx} className="fy-photo-cell">
                        <img
                          src={imgUrl}
                          alt={`Matched item ${idx + 1}`}
                          onError={handleImgError}
                          style={{ cursor: "pointer" }}
                          onClick={() => openPreview(imgUrl, photo.name, simPercent)}
                        />
                        <span
                          className="fy-badge fy-badge-brand"
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            fontSize: "0.75rem",
                          }}
                        >
                          {simPercent}% match
                        </span>
                        <div className="fy-photo-actions">
                          <button
                            type="button"
                            onClick={() => openPreview(imgUrl, photo.name, simPercent)}
                            className="fy-icon-btn"
                            title="View full photo"
                          >
                            ⤢
                          </button>
                          <button
                            type="button"
                            onClick={() => void downloadImage(imgUrl, photo.name)}
                            className="fy-icon-btn"
                            title="Download photo"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Reveal>
            )}
          </div>
        )}

        {/* Fullscreen Photo Preview Modal */}
        <Modal
          open={Boolean(previewPhoto)}
          onClose={() => {
            setPreviewPhoto(null);
            setIsZoomed(false);
          }}
          title={`Photo preview (${previewPhoto?.sim ?? 95}% match)`}
          maxWidth="850px"
        >
          {previewPhoto && (
            <div>
              <div className="fy-page-head" style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "50%",
                  }}
                  title={previewPhoto.name}
                >
                  {previewPhoto.name ? previewPhoto.name.replace(/^\d+-/, "") : "Photo"}
                </div>
                <div className="fy-page-actions">
                  <Button variant="outline" size="sm" onClick={() => setIsZoomed((prev) => !prev)}>
                    {isZoomed ? "Fit to Screen" : "Zoom 100%"}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => void downloadImage(previewPhoto.url, previewPhoto.name)}
                  >
                    Download Photo
                  </Button>
                </div>
              </div>

              <div
                style={{
                  overflow: isZoomed ? "auto" : "hidden",
                  maxHeight: "65vh",
                  border: "2px solid var(--fy-border)",
                  borderRadius: "8px",
                  backgroundColor: "#1E1E1E",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: isZoomed ? "flex-start" : "center",
                }}
              >
                <img
                  src={previewPhoto.url}
                  alt="Full preview"
                  onError={handleImgError}
                  style={{
                    maxWidth: isZoomed ? "none" : "100%",
                    maxHeight: isZoomed ? "none" : "65vh",
                    objectFit: isZoomed ? "none" : "contain",
                    cursor: isZoomed ? "zoom-out" : "zoom-in",
                    display: "block",
                  }}
                  onClick={() => setIsZoomed((prev) => !prev)}
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
      <Footer />
    </div>
  );
};

export default CameraCaptureWithMask;
