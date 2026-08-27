import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import NeoCard from '../ui/NeoCard';
import NeoButton from '../ui/NeoButton';

const ConfirmVerify = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const queryStatus = queryParams.get('status');
    if (queryStatus === 'success') {
      setStatus('success');
    } else {
      setStatus('error');
    }
  }, [location]);

  return (
    <div style={{ backgroundColor: 'var(--neo-bg)', minHeight: '100vh' }}>
      <Header />
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 text-center">
            <NeoCard
              header={status === 'success' ? 'ACCOUNT ACTIVATED' : 'LINK EXPIRED'}
              headerAccent={status === 'success' ? 'lime' : 'coral'}
            >
              <span className="fs-1 mb-3 d-inline-block">
                {status === 'success' ? '🎉' : '⚠️'}
              </span>
              <h3>
                {status === 'success'
                  ? 'Your Email Has Been Verified!'
                  : 'Verification Link Invalid or Expired'}
              </h3>
              <p style={{ fontWeight: 600, color: '#374151' }}>
                {status === 'success'
                  ? 'You can now create events, upload albums, and share photo galleries.'
                  : 'Please request a new link or sign in directly if already activated.'}
              </p>
              <div className="mt-4 d-flex justify-content-center gap-2">
                <NeoButton variant="yellow" size="lg" onClick={() => navigate('/login')}>
                  Go to Sign In →
                </NeoButton>
              </div>
            </NeoCard>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ConfirmVerify;
