import React, { useEffect, useState } from "react";
import "../../landing.css";
import { API_URL } from "../../utils/api";
import UploadImg from "./Upload_Img";
import Qrcode from "./Qrcode";
import { Button, Modal, Reveal } from "../landing/primitives";

type Photo = {
  _id: string;
  name: string;
  createdAt?: string;
};

type Preview = {
  url: string;
  name: string;
  index: number;
  createdAt?: string;
};

type InEventProps = {
  backbtn: () => void;
  eventID: string;
  name: string;
  pin: string;
  setRefresh?: React.Dispatch<React.SetStateAction<number>>;
};

const InEvent = ({ backbtn, eventID, name, pin, setRefresh }: InEventProps): React.JSX.Element => {
  const [images, setImages] = useState<Photo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<Preview | null>(null);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fallbackPlaceholder =
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F3F4F6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20font-weight%3D%22bold%22%20fill%3D%22%239CA3AF%22%3E%E2%9A%A0%EF%B8%8F%20Image%20Unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";

  const getApiBase = (): string => API_URL;

  const downloadImage = async (url: string, filename: string): Promise<void> => {
    let diskName = filename;
    if (!diskName && url) {
      try {
        diskName = new URL(url, window.location.origin).pathname.split("/").pop() ?? "";
      } catch {
        diskName = "photo.jpg";
      }
    }
    diskName = diskName || "photo.jpg";
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

  const guestUrl = `${window.location.origin}/collect/${eventID}`;

  const fetchImages = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/in-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: eventID }),
      });
      const data: unknown = await res.json();
      if (Array.isArray(data)) {
        setImages(data as Photo[]);
      } else {
        setImages([]);
      }
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventID) {
      fetchImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventID]);

  const handleDeleteEvent = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/delete-event`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: eventID }),
      });
      if (res.ok) {
        if (setRefresh) setRefresh((prev) => prev + 1);
        if (backbtn) backbtn();
      }
    } catch {}
  };

  const handleDeletePhoto = async (photoId: string): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/delete-img`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: photoId }),
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img._id !== photoId));
      }
    } catch {}
  };

  const copyGuestLink = (): void => {
    if (guestUrl) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(guestUrl)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => fallbackCopy(guestUrl));
      } else {
        fallbackCopy(guestUrl);
      }
    }
  };

  const fallbackCopy = (text: string): void => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const t = e.currentTarget;
    t.onerror = null;
    t.src = fallbackPlaceholder;
  };

  return (
    <div className="fy-page fy-container">
      <Reveal>
        <div className="fy-page-head">
          <div>
            <p className="fy-eyebrow">Event detail</p>
            <h1>Event: {name}</h1>
          </div>
          <div className="fy-page-actions">
            <Button variant="ghost" size="sm" onClick={backbtn}>
              ← Back to Events List
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowQrModal(true)}>
              Guest QR Code
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(true)}>
              Delete Event
            </Button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="fy-card">
          <div className="fy-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                <strong>Security PIN:</strong>
                <span className="fy-badge" style={{ letterSpacing: "0.1em", fontSize: "1rem" }}>
                  {pin || "123456"}
                </span>
                <span className="fy-badge fy-badge-brand">{images.length} photos</span>
              </div>
              <p className="fy-micro">
                Guests enter this PIN on their phone to access the event selfie search.
              </p>
            </div>
            <div>
              <div className="fy-page-actions">
                <Button variant="default" size="sm" onClick={copyGuestLink}>
                  {copied ? "✓ Link Copied!" : "Copy Guest Link"}
                </Button>
                <a
                  href={guestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="fy-btn fy-btn-outline fy-btn-sm"
                >
                  ↗ Open Guest View
                </a>
              </div>
              <p className="fy-micro" style={{ marginTop: "0.5rem", wordBreak: "break-all" }}>{guestUrl}</p>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <UploadImg event_id={eventID} inevent={true} d_ref={fetchImages} />
      </Reveal>

      <Reveal delay={0.15}>
        <div style={{ marginTop: "2rem" }}>
          <div className="fy-page-head">
            <h2 style={{ margin: 0 }}>Event photo gallery ({images.length})</h2>
            <div className="fy-page-actions">
              <Button variant="outline" size="sm" onClick={fetchImages}>
                Refresh Gallery
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="fy-loading-row" role="status">
              <span className="fy-spinner" aria-hidden="true" />
              <span>Loading photos…</span>
            </div>
          ) : images.length === 0 ? (
            <div className="fy-empty">
              <p>No photos in this event yet. Use the upload box above to add photos!</p>
            </div>
          ) : (
            <div className="fy-gallery">
              {images.map((photo, index) => {
                const photoUrl = `${getApiBase()}/uploads/${encodeURIComponent(photo.name)}`;
                return (
                  <div key={photo._id || index} className="fy-photo-cell">
                    <img
                      src={photoUrl}
                      alt={`Event item ${index + 1}`}
                      onError={handleImgError}
                      style={{ height: "180px", cursor: "pointer" }}
                      onClick={() => {
                        setIsZoomed(false);
                        setPreviewImage({
                          url: photoUrl,
                          name: photo.name,
                          index: index + 1,
                          createdAt: photo.createdAt,
                        });
                      }}
                    />
                    <div className="fy-photo-actions">
                      <span className="fy-micro">#{index + 1}</span>
                      <span>
                        <button
                          type="button"
                          onClick={() => downloadImage(photoUrl, photo.name)}
                          className="fy-icon-btn"
                          title="Download photo"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo._id)}
                          className="fy-icon-btn"
                          title="Delete photo"
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Reveal>

      <Modal
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        title={`Guest QR code — ${name}`}
      >
        <Qrcode url={guestUrl} eventName={name} />
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete event confirmation"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleDeleteEvent}>
              Yes, Delete Entire Event
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete event <strong>&quot;{name}&quot;</strong>?
        </p>
        <p className="fy-micro">
          This will permanently delete the event, its photos, and its FAISS face vector index. This action cannot be undone.
        </p>
      </Modal>

      <Modal
        open={Boolean(previewImage)}
        onClose={() => {
          setPreviewImage(null);
          setIsZoomed(false);
        }}
        title={`Photo preview${previewImage?.index ? ` — #${previewImage.index}` : ""}`}
        maxWidth="850px"
      >
        {previewImage && (
          <div>
            <div className="fy-page-head" style={{ marginBottom: "1rem" }}>
              <div style={{ maxWidth: "60%" }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={previewImage.name}
                >
                  {previewImage.name ? previewImage.name.replace(/^\d+-/, "") : "Photo"}
                </div>
                {previewImage.createdAt && (
                  <small className="fy-micro">
                    Uploaded: {new Date(previewImage.createdAt).toLocaleString()}
                  </small>
                )}
              </div>
              <div className="fy-page-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsZoomed((prev) => !prev)}
                >
                  {isZoomed ? "Fit to Screen" : "Zoom 100%"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => downloadImage(previewImage.url, previewImage.name)}
                >
                  Download Original
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
                src={previewImage.url}
                alt="Preview"
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
  );
};

export default InEvent;
