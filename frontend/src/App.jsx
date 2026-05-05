import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

// Placeholder for the Dashboard
const Dashboard = () => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col items-center justify-center p-8">
      <div className="glass-panel p-8 text-center max-w-lg">
        <h1 className="text-3xl font-bold text-brand-500 mb-4">Welcome to NodeWatch</h1>
        <p className="text-slate-300 mb-6">
          You are logged in as <span className="font-semibold text-white">{user?.email}</span>
        </p>
        <p className="text-slate-400 text-sm mb-8">
          The full dashboard UI will be implemented in Stage 7.
        </p>
        <button onClick={logout} className="btn-primary">
          Log Out
        </button>
      </div>
    </div>
  );
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
