import React, { useState } from 'react';
import { Button, QRCode, Segmented, Space,Switch } from 'antd';
function doDownload(url, fileName) {
  const a = document.createElement('a');
  a.download = fileName;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
const downloadCanvasQRCode = () => {
  const canvas = document.getElementById('myqrcode')?.querySelector('canvas');
  if (canvas) {
    const url = canvas.toDataURL();
    doDownload(url, 'QRCode.png');
  }
};
const downloadSvgQRCode = () => {
  const svg = document.getElementById('myqrcode')?.querySelector('svg');
  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  doDownload(url, 'QRCode.svg');
};
const Qrcode = (prop) => {
  const url1 = prop
  const [switcher,setswitcher] = useState(false)
  const [renderType, setRenderType] = React.useState('canvas');
  return (
    <Space id="myqrcode" direction="vertical">
      <div className="row pt-2">
          <div className="col-10">
            <p>Genrate QRCode</p>
          </div>
          <div className="col-2">
            <Switch onChange={() => {
              if (switcher) {
                setswitcher(false)
              } else {
                setswitcher(true)
              }
            }} />
          </div>
        </div>
      
      
      <div>
        
        { 
        switcher?<p>Share QRCode with gust
        <QRCode
          type={renderType}
          value={prop.url}
          bgColor="#fff"
          style={{
            marginBottom: 16,
          }}
          icon="https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg"
        />
        <Button
          type="primary"
          onClick={renderType === 'canvas' ? downloadCanvasQRCode : downloadSvgQRCode}
        >
          Download QRCode
        </Button>
        </p>:<></>
        }
      </div>
    </Space>
  );
};
export default Qrcode;