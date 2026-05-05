import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('nodewatch_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Verify token with backend
        const response = await client.get('/auth/me');
        if (response.data.success) {
          setUser(response.data.user);
        } else {
          localStorage.removeItem('nodewatch_token');
        }
      } catch (err) {
        console.error('Failed to verify session', err);
        localStorage.removeItem('nodewatch_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await client.post('/auth/login', { email, password });
    if (response.data.success) {
      localStorage.setItem('nodewatch_token', response.data.token);
      setUser(response.data.user);
      return { success: true };
    }
    return { success: false, error: response.data.error };
  };

  const logout = () => {
    localStorage.removeItem('nodewatch_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
