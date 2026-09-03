// Centralized API configuration — honors env vars with localhost fallback for local dev
// Use REACT_APP_API_URL for Node API (Vercel: https://api.yourdomain.com, local: http://localhost:5000)
// Use REACT_APP_ML_URL for Flask ML (Vercel via Nginx: https://api.yourdomain.com/ml, local: http://localhost:5001)
export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export const ML_URL = (process.env.REACT_APP_ML_URL || 'http://localhost:5001').replace(/\/$/, '');

// Backward-compat helper for files that used getApiBase()
export const getApiBase = () => API_URL;
export const getMlBase = () => ML_URL;
