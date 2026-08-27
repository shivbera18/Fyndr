import React, { useEffect, useState } from 'react';
import UploadImg from './Upload_Img';
import Qrcode from './Qrcode';
import NeoButton from '../ui/NeoButton';
import NeoCard from '../ui/NeoCard';
import NeoBadge from '../ui/NeoBadge';
import NeoModal from '../ui/NeoModal';

const InEvent = ({ backbtn, eventID, name, pin, setRefresh }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [copied, setCopied] = useState(false);

  const guestUrl = `http://localhost:3000/collect/${eventID}`;

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/in-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: eventID }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setImages(data);
      } else {
        setImages([]);
      }
    } catch (_) {
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
  const handleDeleteEvent = async () => {
    try {
      const res = await fetch('http://localhost:5000/delete-event', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: eventID }),
      });
      if (res.ok) {
        if (setRefresh) setRefresh((prev) => prev + 1);
        if (backbtn) backbtn();
      }
    } catch (_) {}
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      const res = await fetch('http://localhost:5000/delete-img', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: photoId }),
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img._id !== photoId));
      }
    } catch (_) {}
  };

  const copyGuestLink = () => {
    navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2">
      {/* Top Navigation Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <NeoButton variant="white" size="sm" onClick={backbtn}>
          ← Back to Events List
        </NeoButton>
        <div className="d-flex gap-2">
          <NeoButton variant="cyan" size="sm" onClick={() => setShowQrModal(true)}>
            📱 Guest QR Code
          </NeoButton>
          <NeoButton variant="coral" size="sm" onClick={() => setShowDeleteModal(true)}>
            🗑️ Delete Event
          </NeoButton>
        </div>
      </div>

      {/* Event Details Card */}
      <NeoCard header={`EVENT: ${name}`} headerAccent="yellow" className="mb-4">
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span style={{ fontWeight: 800 }}>SECURITY PIN:</span>
              <NeoBadge variant="dark" style={{ letterSpacing: '0.1em', fontSize: '1rem' }}>
                {pin || '123456'}
              </NeoBadge>
              <NeoBadge variant="lime">{images.length} PHOTOS</NeoBadge>
            </div>
            <div style={{ color: '#4B5563', fontWeight: 600, fontSize: '0.9rem' }}>
              Guests enter this PIN on their phone to access the event selfie search.
            </div>
          </div>

          <div className="col-12 col-md-6 text-md-end">
            <div className="d-flex gap-2 justify-content-md-end flex-wrap">
              <NeoButton variant="yellow" size="sm" onClick={copyGuestLink}>
                {copied ? '✓ Link Copied!' : '📋 Copy Guest Link'}
              </NeoButton>
              <a
                href={guestUrl}
                target="_blank"
                rel="noreferrer"
                className="neo-btn neo-btn-white neo-btn-sm"
              >
                ↗ Open Guest View
              </a>
            </div>
          </div>
        </div>
      </NeoCard>

      {/* Batch Photo Uploader */}
      <UploadImg event_id={eventID} inevent={true} d_ref={fetchImages} />

      {/* Event Photo Gallery */}
      <div className="mt-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="m-0">EVENT PHOTO GALLERY ({images.length})</h4>
          <NeoButton variant="white" size="sm" onClick={fetchImages}>
            🔄 Refresh Gallery
          </NeoButton>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-dark" role="status" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-4">
            <NeoCard style={{ maxWidth: '400px', margin: '0 auto' }}>
              <p style={{ fontWeight: 700, color: '#6B7280' }} className="m-0">
                No photos in this event yet. Use the upload box above to add photos!
              </p>
            </NeoCard>
          </div>
        ) : (
          <div className="row g-3">
            {images.map((photo, index) => {
              const photoUrl = `http://localhost:5000/uploads/${photo.name}`;
              return (
                <div key={photo._id || index} className="col-6 col-md-4 col-lg-3">
                  <div
                    className="p-2"
                    style={{
                      backgroundColor: 'var(--neo-white)',
                      border: '3px solid var(--neo-black)',
                      borderRadius: '10px',
                      boxShadow: '3px 3px 0px var(--neo-black)',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={photoUrl}
                      alt={`Event item ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '180px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1.5px solid #121212',
                        cursor: 'pointer',
                      }}
                      onClick={() => setPreviewImage(photoUrl)}
                    />
                    <div className="d-flex justify-content-between align-items-center mt-2 px-1">
                      <small style={{ fontWeight: 700, color: '#6B7280' }}>
                        #{index + 1}
                      </small>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo._id)}
                        className="btn btn-sm text-danger p-0"
                        style={{ fontWeight: 800 }}
                        title="Delete photo"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <NeoModal
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        title={`GUEST QR CODE — ${name}`}
        accent="cyan"
      >
        <Qrcode url={guestUrl} eventName={name} />
      </NeoModal>

      {/* Delete Event Modal */}
      <NeoModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="DELETE EVENT CONFIRMATION"
        accent="coral"
        footer={
          <>
            <NeoButton variant="white" size="sm" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </NeoButton>
            <NeoButton variant="coral" size="sm" onClick={handleDeleteEvent}>
              Yes, Delete Entire Event
            </NeoButton>
          </>
        }
      >
        <p style={{ fontWeight: 700, color: '#1F2937' }}>
          Are you sure you want to delete event <span className="neo-highlight">"{name}"</span>?
        </p>
        <p style={{ color: '#4B5563', fontSize: '0.9rem' }}>
          This will permanently delete the event, its photos, and its FAISS face vector index. This action cannot be undone.
        </p>
      </NeoModal>

      {/* Photo Preview Modal */}
      <NeoModal
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="PHOTO PREVIEW"
        accent="yellow"
        maxWidth="800px"
      >
        {previewImage && (
          <div className="text-center">
            <img
              src={previewImage}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '2px solid #121212',
              }}
            />
            <div className="mt-3">
              <a
                href={previewImage}
                download
                target="_blank"
                rel="noreferrer"
                className="neo-btn neo-btn-yellow neo-btn-sm"
              >
                💾 Download High-Res File
              </a>
            </div>
          </div>
        )}
      </NeoModal>
    </div>
  );
};

export default InEvent;
