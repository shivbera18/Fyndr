import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import NeoCard from '../ui/NeoCard';
import NeoButton from '../ui/NeoButton';
import NeoBadge from '../ui/NeoBadge';
import NeoModal from '../ui/NeoModal';

const CameraCaptureWithMask = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const event_id = location.state;

  const webcamRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [matchedPhotos, setMatchedPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [useUploadMode, setUseUploadMode] = useState(false);

  const captureAndMatch = async () => {
    if (!webcamRef.current) return;

    try {
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) {
        setErrorMessage('Failed to capture image from camera. Please allow camera permissions.');
        return;
      }

      setImageSrc(screenshot);
      const blob = await fetch(screenshot).then((res) => res.blob());
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });

      await processSelfieMatch(file);
    } catch (err) {
      setErrorMessage('Error capturing selfie. Please try again.');
    }
  };

  const handleFileUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageSrc(URL.createObjectURL(file));
      await processSelfieMatch(file);
    }
  };

  const processSelfieMatch = async (file) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('event_id', event_id);

      const response = await axios.post('http://127.0.0.1:5001/match_faces', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      if (response.data.matches && response.data.matches.length > 0) {
        setMatchedPhotos(response.data.matches);
      } else {
        setMatchedPhotos([]);
        setErrorMessage(response.data.message || 'No matching photos found in this event.');
      }
    } catch (error) {
      setMatchedPhotos([]);
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Face detection failed. Please ensure your face is clearly visible.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const retakeSelfie = () => {
    setImageSrc(null);
    setMatchedPhotos([]);
    setErrorMessage('');
  };

  const downloadImage = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'matched_photo.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (_) {
      window.open(url, '_blank');
    }
  };

  const handleUserMediaError = () => {
    setErrorMessage('⚠️ Camera access was unavailable or denied. Switched to gallery photo upload.');
    setUseUploadMode(true);
  };

  return (
    <div style={{ backgroundColor: 'var(--neo-bg)', minHeight: '100vh' }}>
      <Header />

      <div className="container py-4">
        {/* Top Navigation */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <NeoButton
            variant="white"
            size="sm"
            onClick={() => (event_id ? navigate(`/collect/${event_id}`) : navigate('/'))}
          >
            ← Back to Event
          </NeoButton>
          <NeoBadge variant="yellow" className="px-3 py-1 fs-6">
            🤳 AI SELFIE MATCH
          </NeoBadge>
        </div>

        {/* ================= STEP 1: CAPTURE OR RETAKE ================= */}
        {!imageSrc ? (
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <NeoCard header="TAKE A SELFIE TO FIND YOUR PHOTOS" headerAccent="cyan">
                <p style={{ fontWeight: 600, color: '#4B5563', textAlign: 'center' }}>
                  Position your face in the frame with good lighting. Your selfie is only used for matching and is never stored permanently.
                </p>

                {/* Webcam / File Viewport */}
                {!useUploadMode ? (
                  <div
                    className="p-2 mb-3 text-center"
                    style={{
                      backgroundColor: 'var(--neo-black)',
                      border: '3px solid var(--neo-black)',
                      borderRadius: '12px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      onUserMediaError={handleUserMediaError}
                      videoConstraints={{ facingMode: 'user', width: 480, height: 480 }}
                      style={{
                        width: '100%',
                        maxHeight: '340px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                    />
                    {/* Face Guide Oval */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '200px',
                        height: '260px',
                        border: '3px dashed rgba(255, 230, 0, 0.8)',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="p-4 text-center mb-3"
                    style={{
                      border: '2.5px dashed var(--neo-black)',
                      borderRadius: '10px',
                      backgroundColor: 'var(--neo-canvas)',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('selfie-file-input')?.click()}
                  >
                    <input
                      id="selfie-file-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <span className="fs-1 d-block mb-2">📸</span>
                    <span style={{ fontWeight: 800 }}>Click to Select Selfie from Gallery</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="d-flex flex-column gap-2">
                  {!useUploadMode ? (
                    <NeoButton variant="yellow" size="lg" onClick={captureAndMatch}>
                      ⚡ Take Selfie & Find My Photos
                    </NeoButton>
                  ) : null}

                  <button
                    type="button"
                    className="btn btn-link text-dark fw-bold text-decoration-none"
                    onClick={() => setUseUploadMode(!useUploadMode)}
                  >
                    {useUploadMode ? '📷 Switch to Camera Webcam' : '📁 Or Upload Photo from Phone'}
                  </button>
                </div>
              </NeoCard>
            </div>
          </div>
        ) : (
          /* ================= STEP 2: RESULTS SECTION ================= */
          <div>
            {/* Selfie Preview Header Banner */}
            <div className="row g-4 align-items-center mb-4">
              <div className="col-12 col-md-4 col-lg-3 text-center text-md-start">
                <div
                  className="p-2 d-inline-block"
                  style={{
                    backgroundColor: 'var(--neo-white)',
                    border: '3px solid var(--neo-black)',
                    borderRadius: '10px',
                    boxShadow: '4px 4px 0px var(--neo-black)',
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Your Selfie"
                    style={{ width: '130px', height: '130px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                  <div className="mt-2">
                    <NeoButton variant="white" size="sm" full onClick={retakeSelfie}>
                      🔄 Retake Selfie
                    </NeoButton>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-8 col-lg-9">
                <NeoCard
                  header={matchedPhotos.length > 0 ? 'MATCH RESULTS' : 'SEARCH STATUS'}
                  headerAccent={matchedPhotos.length > 0 ? 'lime' : 'yellow'}
                >
                  {loading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border text-dark mb-2" role="status" />
                      <h4>Analyzing 512-D Face Embeddings...</h4>
                      <p style={{ color: '#4B5563', fontWeight: 600 }}>
                        Matching your facial signature across all event photos.
                      </p>
                    </div>
                  ) : matchedPhotos.length > 0 ? (
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="fs-3">🎉</span>
                        <h3 className="m-0">
                          Found {matchedPhotos.length} Photo{matchedPhotos.length > 1 ? 's' : ''} with Your Face!
                        </h3>
                      </div>
                      <p style={{ color: '#374151', fontWeight: 600, margin: 0 }}>
                        Click any photo below to preview or download in high resolution.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h4>No Direct Matches Found</h4>
                      <p style={{ color: '#4B5563', fontWeight: 600 }}>
                        {errorMessage ||
                          "We couldn't detect your face in this album with high confidence. Try taking another selfie with brighter lighting and facing straight ahead."}
                      </p>
                      <NeoButton variant="yellow" size="sm" onClick={retakeSelfie}>
                        Try Another Selfie →
                      </NeoButton>
                    </div>
                  )}
                </NeoCard>
              </div>
            </div>

            {/* Matched Images Grid */}
            {matchedPhotos.length > 0 && (
              <div>
                <h4 className="fw-black mb-3">YOUR MATCHED PHOTOS ({matchedPhotos.length})</h4>
                <div className="row g-3">
                  {matchedPhotos.map((photo, idx) => {
                    const imgUrl = `http://localhost:5000/uploads/${photo.name}`;
                    const simPercent = Math.round((photo.similarity || 0.9) * 100);

                    return (
                      <div key={photo.id || idx} className="col-6 col-md-4 col-lg-3">
                        <div
                          className="p-2"
                          style={{
                            backgroundColor: 'var(--neo-white)',
                            border: '3px solid var(--neo-black)',
                            borderRadius: '10px',
                            boxShadow: '4px 4px 0px var(--neo-black)',
                            transition: 'transform 0.15s ease',
                          }}
                        >
                          {/* Image Thumbnail */}
                          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '6px' }}>
                            <img
                              src={imgUrl}
                              alt={`Matched item ${idx + 1}`}
                              style={{
                                width: '100%',
                                height: '200px',
                                objectFit: 'cover',
                                cursor: 'pointer',
                                border: '1.5px solid #121212',
                              }}
                              onClick={() => setPreviewPhoto({ url: imgUrl, name: photo.name, sim: simPercent })}
                            />
                            {/* Similarity Score Pill */}
                            <span
                              className="neo-badge neo-badge-lime"
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                fontSize: '0.75rem',
                              }}
                            >
                              {simPercent}% MATCH
                            </span>
                          </div>

                          {/* Quick Download Action */}
                          <div className="mt-2 pt-1 d-flex justify-content-between align-items-center">
                            <button
                              type="button"
                              className="btn btn-sm p-0 text-dark fw-bold text-decoration-none"
                              onClick={() => setPreviewPhoto({ url: imgUrl, name: photo.name, sim: simPercent })}
                            >
                              🔍 View Full
                            </button>
                            <NeoButton
                              variant="yellow"
                              size="sm"
                              onClick={() => downloadImage(imgUrl, photo.name)}
                            >
                              💾 Download
                            </NeoButton>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fullscreen Photo Preview Modal */}
        <NeoModal
          open={Boolean(previewPhoto)}
          onClose={() => setPreviewPhoto(null)}
          title={`PHOTO PREVIEW (${previewPhoto?.sim || 95}% MATCH)`}
          accent="yellow"
          maxWidth="820px"
        >
          {previewPhoto && (
            <div className="text-center">
              <img
                src={previewPhoto.url}
                alt="Full preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '2px solid #121212',
                }}
              />
              <div className="mt-3 d-flex justify-content-center gap-2">
                <NeoButton
                  variant="yellow"
                  size="md"
                  onClick={() => downloadImage(previewPhoto.url, previewPhoto.name)}
                >
                  💾 Download Original High-Res Photo
                </NeoButton>
              </div>
            </div>
          )}
        </NeoModal>
      </div>

      <Footer />
    </div>
  );
};

export default CameraCaptureWithMask;
