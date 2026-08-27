import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import NeoCard from '../ui/NeoCard';
import NeoButton from '../ui/NeoButton';
import NeoInput from '../ui/NeoInput';

const Login_Register = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('user');
    if (auth) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();
      if (response.ok && data._id) {
        localStorage.setItem('user', JSON.stringify(data));
        setSuccessMessage('Login successful! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 600);
      } else {
        setErrorMessage(data.message || data.error || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMessage('Could not connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMessage(data.message || 'Account created successfully! You can now sign in.');
        setMode('login');
      } else {
        setErrorMessage(data.message || data.error || 'Registration failed.');
      }
    } catch (err) {
      setErrorMessage('Could not connect to authentication server.');
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
            <NeoCard
              header={mode === 'login' ? 'PHOTOGRAPHER SIGN IN' : 'CREATE PHOTOGRAPHER ACCOUNT'}
              headerAccent={mode === 'login' ? 'yellow' : 'cyan'}
              style={{ backgroundColor: '#FFFFFF' }}
            >
              {/* Tab Selector */}
              <div className="d-flex gap-2 mb-4">
                <button
                  type="button"
                  className={`neo-btn flex-fill ${mode === 'login' ? 'neo-btn-yellow' : 'neo-btn-white'}`}
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                >
                  🔑 Sign In
                </button>
                <button
                  type="button"
                  className={`neo-btn flex-fill ${mode === 'register' ? 'neo-btn-cyan' : 'neo-btn-white'}`}
                  onClick={() => {
                    setMode('register');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                >
                  ✨ Register
                </button>
              </div>

              {/* Status Alert Messages */}
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

              {/* Sign In Form */}
              {mode === 'login' && (
                <form onSubmit={handleLogin}>
                  <NeoInput
                    label="Email Address"
                    type="email"
                    placeholder="photographer@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <NeoInput
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <Link
                      to="/forgetpassword"
                      style={{ fontWeight: 800, color: 'var(--neo-black)', fontSize: '0.85rem' }}
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <NeoButton
                    type="submit"
                    variant="yellow"
                    size="lg"
                    full
                    loading={loading}
                  >
                    Sign In to Dashboard →
                  </NeoButton>
                </form>
              )}

              {/* Registration Form */}
              {mode === 'register' && (
                <form onSubmit={handleRegister}>
                  <NeoInput
                    label="Full Name or Studio Name"
                    type="text"
                    placeholder="e.g. Apex Wedding Studio"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />

                  <NeoInput
                    label="Email Address"
                    type="email"
                    placeholder="studio@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <NeoInput
                    label="Password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <NeoButton
                    type="submit"
                    variant="cyan"
                    size="lg"
                    full
                    loading={loading}
                  >
                    Create Free Account →
                  </NeoButton>
                </form>
              )}

              {/* Card Footer Note */}
              <div className="mt-4 pt-3 text-center border-top" style={{ borderColor: '#E5E7EB' }}>
                <small style={{ fontWeight: 600, color: '#6B7280' }}>
                  Guest looking for event photos? Ask your photographer for the Event QR code.
                </small>
              </div>
            </NeoCard>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login_Register;
