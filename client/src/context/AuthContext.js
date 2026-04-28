import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { apiConfig } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Create configured axios instance with proper URL handling
export const api = axios.create({
  baseURL: apiConfig.apiURL,
  withCredentials: true,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configure axios interceptor for token refresh
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          await api.post('/auth/refresh');
          return api(originalRequest);
        } catch (refreshError) {
          setUser(null);
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  // Axios interceptor for token refresh
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          await axios.post('/auth/refresh');
          return axios(originalRequest);
        } catch (refreshError) {
          setUser(null);
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (user_id, password) => {
    const response = await api.post('/auth/login', { user_id, password });
    setUser(response.data.user);
    return response.data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const resetPassword = async (current_password, new_password) => {
    await api.post('/auth/reset-password', { current_password, new_password });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, resetPassword, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
