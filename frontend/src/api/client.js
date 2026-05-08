import axios from 'axios';

// Base URL: use env variable in dev, relative path in production (Nginx proxy)
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

// Create an Axios instance with base configuration
const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token if available
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('nodewatch_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: handle 401 Unauthorized globally
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired or invalid, clear it and force re-login
      // Avoid redirect loops by checking if we're not already on the login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('nodewatch_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
