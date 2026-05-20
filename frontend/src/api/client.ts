import axios from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add a response interceptor to handle the backend response format
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // If the backend returns { success: true, data: ..., message: ... }
    if (response.data && response.data.success !== undefined) {
      if (response.data.success) {
        return response.data.data;
      }
    }
    return response.data;
  },
  (error) => {
    let message = 'Đã có lỗi xảy ra';
    
    if (error.response?.data?.detail?.error?.message) {
      message = error.response.data.detail.error.message;
    } else if (error.response?.data?.error?.message) {
      message = error.response.data.error.message;
    } else if (typeof error.response?.data?.detail === 'string') {
      message = error.response.data.detail;
    } else if (error.message) {
      message = error.message;
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }

    return Promise.reject({ ...error, message });
  }
);
