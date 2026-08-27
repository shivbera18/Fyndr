import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import NeoCard from '../ui/NeoCard';
import NeoButton from '../ui/NeoButton';
import NeoInput from '../ui/NeoInput';

const ForgetPass = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Enter OTP & New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Reset OTP sent to your email.');
        setStep(2);
      } else {
        setErrorMessage(data.message || data.error || 'Failed to send OTP.');
      }
    } catch (_) {
      setErrorMessage('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Update Password
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/newPassword-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim(), newpassword: newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Password successfully updated! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1200);
      } else {
        setErrorMessage(data.message || data.error || 'Invalid or expired OTP.');
      }
    } catch (_) {
      setErrorMessage('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--neo-bg)', minHeight: '100vh' }}>
      <Header />

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <NeoCard header="PASSWORD RECOVERY" headerAccent="coral">
              {errorMessage && (
                <div
                  className="p-3 mb-3"
                  style={{
                    backgroundColor: 'var(--neo-coral-light)',
                    border: '2px solid var(--neo-black)',
                    borderRadius: '8px',
                    fontWeight: 700,
                    color: '#991B1B',
                  }}
                >
                  ⚠️ {errorMessage}
                </div>
              )}

              {successMessage && (
                <div
                  className="p-3 mb-3"
                  style={{
                    backgroundColor: 'var(--neo-lime-light)',
                    border: '2px solid var(--neo-black)',
                    borderRadius: '8px',
                    fontWeight: 700,
                    color: '#166534',
                  }}
                >
                  ✓ {successMessage}
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleSendOtp}>
                  <p style={{ fontWeight: 600, color: '#4B5563' }}>
                    Enter your registered email address to receive a one-time verification code.
                  </p>
                  <NeoInput
                    label="Email Address"
                    type="email"
                    placeholder="photographer@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <NeoButton
                    type="submit"
                    variant="yellow"
                    size="lg"
                    full
                    loading={loading}
                  >
                    Send Reset Code →
                  </NeoButton>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <NeoInput
                    label="6-Digit OTP Code"
                    type="text"
                    placeholder="e.g. 123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                  <NeoInput
                    label="New Password"
                    type="password"
                    placeholder="Enter strong new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <div className="d-flex gap-2">
                    <NeoButton
                      variant="white"
                      size="md"
                      onClick={() => setStep(1)}
                    >
                      ← Back
                    </NeoButton>
                    <NeoButton
                      type="submit"
                      variant="lime"
                      size="md"
                      full
                      loading={loading}
                    >
                      Update Password
                    </NeoButton>
                  </div>
                </form>
              )}

              <div className="mt-4 pt-3 text-center border-top">
                <Link
                  to="/login"
                  style={{ fontWeight: 800, color: 'var(--neo-black)', textDecoration: 'none' }}
                >
                  ← Back to Sign In
                </Link>
              </div>
            </NeoCard>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ForgetPass;
