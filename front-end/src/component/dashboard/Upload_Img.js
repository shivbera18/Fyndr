import React, { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Image, Upload, message } from 'antd';
import axios from 'axios';

const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const Upload_Img = ({ event_id, d_ref, inevent }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false); // Loading state

  const user = JSON.parse(localStorage.getItem('user'));
  const USER_ID = user ? user._id : null;

  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
  };

  const handleChange = ({ fileList: newFileList }) => setFileList(newFileList);

  const uploadButton = (
    <button
      style={{ border: 0, background: 'none' }}
      type="button"
    >
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Upload Img</div>
    </button>
  );

  const handleUpload = async () => {
    const newFileList = fileList.filter((file) => file.status !== 'done');

    if (newFileList.length === 0) {
      message.warning('No new files to upload.');
      return;
    }

    const allImages = newFileList.every((file) => file.type.startsWith('image/'));
    if (!allImages) {
      message.warning('Please upload only images.');
      return;
    }

    setLoading(true); // Start loading

    try {
      for (const file of newFileList) {
        const formData = new FormData();
        formData.append('name', file.originFileObj);
        formData.append('event_id', event_id);
        formData.append('upload_by', USER_ID);

        const response = await axios.post('http://localhost:5000/photo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000, // 1-minute timeout for large files
        });

        if (response.status === 200) {
          message.success(`Successfully uploaded ${file.name} with embedding.`);
          if (inevent) d_ref();
          setFileList([]);
        } else {
          message.error(`Failed to upload ${file.name}: ${response.data.error}`);
        }
      }
    } catch (error) {
      message.error(`Error uploading file: ${error.message}`);
    } finally {
      setLoading(false); // End loading
    }
  };

  return (
    <div className="">
      <Upload
        listType="picture-card"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        multiple
        beforeUpload={(file) => {
          setFileList((prev) => [...prev, file]); // Add file to list
          return false; // Prevent automatic upload
        }}
        onRemove={(file) => {
          setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
        }}
      >
        {fileList.length >= 100 ? null : uploadButton}
      </Upload>

      <Button type="primary" onClick={handleUpload} style={{ margin: 5 }} loading={loading}>
        {loading ? 'Uploading...' : 'Submit Image'}
      </Button>

      {previewImage && (
        <Image
          wrapperStyle={{ display: 'none' }}
          preview={{
            visible: previewOpen,
            onVisibleChange: (visible) => setPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && setPreviewImage(''),
          }}
          src={previewImage}
        />
      )}
    </div>
  );
};

export default Upload_Img;
