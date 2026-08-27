import React, { useState } from 'react';
import axios from 'axios';
import NeoButton from '../ui/NeoButton';
import NeoBadge from '../ui/NeoBadge';

const Upload_Img = ({ event_id, d_ref, inevent }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [progress, setProgress] = useState(0);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const USER_ID = user._id || null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadStatus('⚠️ Please select at least one image file.');
      return;
    }

    setLoading(true);
    setUploadStatus(`Uploading ${selectedFiles.length} photos...`);
    setProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append('name', file);
      formData.append('event_id', event_id);
      formData.append('upload_by', USER_ID);

      try {
        const response = await axios.post('http://localhost:5000/photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000,
        });

        if (response.status === 200 || response.status === 207) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }

      setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
    }

    setLoading(false);
    if (successCount > 0) {
      setUploadStatus(`✓ Successfully uploaded ${successCount} photo${successCount > 1 ? 's' : ''}!`);
      setSelectedFiles([]);
      if (inevent && typeof d_ref === 'function') d_ref();
    } else {
      setUploadStatus(`❌ Failed to upload photos. Please try again.`);
    }
  };

  return (
    <div
      className="p-4 my-3"
      style={{
        backgroundColor: 'var(--neo-white)',
        border: '3px solid var(--neo-black)',
        borderRadius: '12px',
        boxShadow: '4px 4px 0px var(--neo-black)',
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0">📸 UPLOAD EVENT PHOTOS</h5>
        <NeoBadge variant="cyan">AUTO AI INDEXING</NeoBadge>
      </div>

      {/* File Dropzone / Select Input */}
      <div
        className="p-4 text-center mb-3"
        style={{
          border: '2.5px dashed var(--neo-black)',
          borderRadius: '10px',
          backgroundColor: 'var(--neo-canvas)',
          cursor: 'pointer',
        }}
        onClick={() => document.getElementById('album-file-input')?.click()}
      >
        <input
          id="album-file-input"
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <span className="fs-1 d-block mb-2">📁</span>
        <span style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>
          Click to Select Photos or Drag & Drop Here
        </span>
        <small className="d-block mt-1" style={{ color: '#6B7280', fontWeight: 600 }}>
          Supports JPG, PNG, WEBP — Multi-select up to 100 photos at a time
        </small>
      </div>

      {/* Selected Files Count & List Preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span style={{ fontWeight: 800 }}>
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} queued for upload
            </span>
            <button
              type="button"
              className="btn btn-sm p-0 text-danger"
              style={{ fontWeight: 800 }}
              onClick={() => setSelectedFiles([])}
            >
              Clear All
            </button>
          </div>

          <div
            className="d-flex gap-2 flex-wrap p-2"
            style={{
              maxHeight: '120px',
              overflowY: 'auto',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
            }}
          >
            {selectedFiles.map((file, idx) => (
              <span
                key={idx}
                className="neo-badge neo-badge-yellow d-inline-flex align-items-center gap-1"
                style={{ fontSize: '0.75rem' }}
              >
                {file.name.slice(0, 16)}...
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontWeight: 900,
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress & Status */}
      {uploadStatus && (
        <div
          className="p-2 mb-3 text-center"
          style={{
            backgroundColor: uploadStatus.startsWith('✓')
              ? 'var(--neo-lime-light)'
              : uploadStatus.startsWith('⚠️')
              ? 'var(--neo-yellow-light)'
              : 'var(--neo-coral-light)',
            border: '2px solid var(--neo-black)',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '0.9rem',
          }}
        >
          {uploadStatus}
          {loading && (
            <div
              className="progress mt-2"
              style={{ height: '8px', border: '1px solid #121212', borderRadius: '4px' }}
            >
              <div
                className="progress-bar bg-warning"
                role="progressbar"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <NeoButton
        variant="yellow"
        size="md"
        full
        onClick={handleUpload}
        disabled={loading || selectedFiles.length === 0}
        loading={loading}
      >
        {loading ? `Uploading (${progress}%)...` : `Upload ${selectedFiles.length} Photos to Event →`}
      </NeoButton>
    </div>
  );
};

export default Upload_Img;
