import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import NeoCard from '../ui/NeoCard';
import NeoButton from '../ui/NeoButton';
import NeoBadge from '../ui/NeoBadge';

const EmailVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = new URLSearchParams(location.search).get('email') || 'your email';

  return (
    <div style={{ backgroundColor: 'var(--neo-bg)', minHeight: '100vh' }}>
      <Header />
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 text-center">
            <NeoCard header="EMAIL VERIFICATION" headerAccent="yellow">
              <span className="fs-1 mb-3 d-inline-block">✉️</span>
              <h3>Check Your Inbox!</h3>
              <p style={{ fontWeight: 600, color: '#374151' }}>
                We sent a verification link to <NeoBadge variant="dark">{email}</NeoBadge>.
                Click the link in the email to activate your account.
              </p>
              <div className="mt-4 d-flex justify-content-center gap-2">
                <NeoButton variant="yellow" onClick={() => navigate('/login')}>
                  Proceed to Login →
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

export default EmailVerify;
