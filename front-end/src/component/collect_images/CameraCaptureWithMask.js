import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { Image, message, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const CameraCaptureWithMatch = () => {
  const location = useLocation();
  const event_id = location.state;
  const webcamRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [matchedPhotos, setMatchedPhotos] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [hoveredImageIndex, setHoveredImageIndex] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);

  const captureAndMatch = async () => {
    // Ensure the camera is off after capturing
    setCameraOn(false);

    if (webcamRef.current) {
      try {
        const capturedImageSrc = webcamRef.current.getScreenshot();
        if (!capturedImageSrc) throw new Error("Failed to capture image");

        setImageSrc(capturedImageSrc);

        // Convert the captured image to a file
        const blob = await fetch(capturedImageSrc).then(res => res.blob());
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });

        // Prepare the FormData object with image and event_id
        const formData = new FormData();
        formData.append('image', file);
        formData.append('event_id', event_id);

        // Send the image to the server for face matching
        const response = await axios.post('http://127.0.0.1:5001/match_faces', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data.matches?.length) {
          // If matches found, set the matched photos
          setMatchedPhotos(response.data.matches);
          setErrorMessage('');
          message.success("Matching faces found!");
        } else {
          // No matches found, clear matched photos and show a message
          setMatchedPhotos([]);
          setErrorMessage(response.data.message || 'No matching faces found.');
          message.warning("You are not present in this event.");
        }
      } catch (error) {
        const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'An unexpected error occurred. Please try again.';
        setErrorMessage(errMsg);
        message.error(errMsg);
      }
    } else {
      message.warning("Camera is not ready, please try again.");
    }
  };

  const doDownload = async (url, fileName) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new message.error('Network response was not ok');

      const blob = await response.blob();
      const a = document.createElement('a');
      const urlBlob = URL.createObjectURL(blob);
      a.href = urlBlob;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(urlBlob); // Clean up the URL.createObjectURL
    } catch (error) {
      message.error('Failed to download the image.');
    }
  };

  return (
    <div className='row mt-3'>
      {!imageSrc && (
        <div id="camera" className="active">
          <Webcam className='col-12 mt-3'
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={420}
            height={340}
          />
          <Button className='mt-3' type='primary' onClick={captureAndMatch}>Take Selfie and Match</Button>
        </div>
      )}

      {imageSrc && (
        <div className='pt-5'>
          <h3>Selfie:</h3>
          <img src={imageSrc} alt="Selfie" style={{ width: '200px', height: 'auto' }} />
        </div>
      )}

      {matchedPhotos.length > 0 && (
        <div id="match-image" className=" row p-4 justify-content-center">
          <h3>Matched Photos:</h3>
          <div className="justify-content-center" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {matchedPhotos.map((photo, index) => (
              <div
                key={index}
                style={{ position: "relative" }}
                onMouseEnter={() => setHoveredImageIndex(index)}
                onMouseLeave={() => setHoveredImageIndex(null)}
              >
                <Image
                  width={180}
                  src={`http://localhost:5000/uploads/${photo.name}`}
                  alt={`image ${index}`}
                  style={{ display: "block" }}
                />
                {hoveredImageIndex === index && (
                  <Button
                    type="primary"
                    danger
                    icon={<DownloadOutlined />}
                    onClick={() => doDownload(`http://localhost:5000/uploads/${photo.name}`, photo.name)}
                    style={{
                      position: "absolute",
                      top: "10%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      zIndex: 1,
                      opacity: 0.8,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMessage && <p>{errorMessage}</p>}
    </div>
  );
};

export default CameraCaptureWithMatch;
