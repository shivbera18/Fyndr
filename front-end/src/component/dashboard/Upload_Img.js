import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import NeoButton from '../ui/NeoButton';
import NeoBadge from '../ui/NeoBadge';

const Upload_Img = ({ event_id, d_ref, inevent }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const filesRef = useRef(selectedFiles);
  filesRef.current = selectedFiles;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const USER_ID = user._id || null;

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = (files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).filter((file) => file.type.startsWith('image/'));
    const newItems = fileArray.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${file.size}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    setSelectedFiles((prev) => [...prev, ...newItems]);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = ''; // Reset input to allow re-selecting the same file
    }
  };

  const removeFile = (id) => {
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
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
    const failedFiles = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const item = selectedFiles[i];
      const formData = new FormData();
      formData.append('name', item.file);
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
          if (item.preview) URL.revokeObjectURL(item.preview);
        } else {
          failedFiles.push(item);
        }
      } catch (error) {
        failedFiles.push(item);
      }

      setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
    }

    setLoading(false);
    setSelectedFiles(failedFiles);

    if (successCount > 0 && failedFiles.length === 0) {
      setUploadStatus(`✓ Successfully uploaded ${successCount} photo${successCount > 1 ? 's' : ''}!`);
      if (inevent && typeof d_ref === 'function') d_ref();
    } else if (successCount > 0 && failedFiles.length > 0) {
      setUploadStatus(`⚠️ Uploaded ${successCount} photos, but ${failedFiles.length} failed. You can retry the remaining queued files.`);
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
          border: isDragging ? '3px dashed #121212' : '2.5px dashed var(--neo-black)',
          borderRadius: '10px',
          backgroundColor: isDragging ? '#FEF08A' : 'var(--neo-canvas)',
          cursor: 'pointer',
          transform: isDragging ? 'scale(1.01)' : 'scale(1)',
          transition: 'all 0.15s ease-in-out',
          boxShadow: isDragging ? '4px 4px 0px #121212' : 'none',
        }}
        onClick={() => document.getElementById('album-file-input')?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id="album-file-input"
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <span className="fs-1 d-block mb-2">{isDragging ? '📥' : '📁'}</span>
        <span style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }}>
          {isDragging ? 'Drop Photos Here to Queue' : 'Click to Select Photos or Drag & Drop Here'}
        </span>
        <small className="d-block mt-1" style={{ color: '#6B7280', fontWeight: 600 }}>
          Supports JPG, PNG, WEBP — Multi-select up to 100 photos at a time
        </small>
      </div>

      {/* Selected Files Count & Visual Thumbnail Preview Grid */}
      {selectedFiles.length > 0 && (
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span style={{ fontWeight: 800 }}>
              {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''} queued for upload
            </span>
            <button
              type="button"
              className="btn btn-sm p-0 text-danger"
              style={{ fontWeight: 800 }}
              onClick={clearAll}
            >
              Clear All
            </button>
          </div>

          <div
            className="d-flex gap-3 flex-wrap p-2"
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              border: '2px solid var(--neo-black)',
              borderRadius: '8px',
              backgroundColor: '#F9FAFB',
            }}
          >
            {selectedFiles.map((item) => (
              <div
                key={item.id}
                style={{
                  position: 'relative',
                  width: '100px',
                  border: '2px solid #121212',
                  borderRadius: '6px',
                  backgroundColor: '#FFF',
                  overflow: 'hidden',
                  boxShadow: '2px 2px 0px #121212',
                }}
              >
                <img
                  src={item.preview}
                  alt={item.file.name}
                  style={{
                    width: '100%',
                    height: '75px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <div className="p-1 text-center" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
                  <div
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 700,
                    }}
                    title={item.file.name}
                  >
                    {item.file.name}
                  </div>
                  <div style={{ color: '#6B7280', fontWeight: 600, fontSize: '0.65rem' }}>
                    {formatFileSize(item.file.size)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(item.id);
                  }}
                  title="Remove photo"
                  style={{
                    position: 'absolute',
                    top: '3px',
                    right: '3px',
                    backgroundColor: '#FF4D4D',
                    color: '#FFF',
                    border: '1.5px solid #121212',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 900,
                    fontSize: '11px',
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
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
