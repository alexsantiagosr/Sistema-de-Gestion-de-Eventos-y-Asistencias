import axiosInstance from './axios';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const AUTH_API_URL = `${API_BASE_URL.replace(/\/api$/, '').replace(/\/$/, '')}/api/auth`;

export const authApi = {
  // Registro de usuario
  register: async (data: RegisterRequest) => {
    const response = await axiosInstance.post<AuthResponse>(`${AUTH_API_URL}/register`, data);
    return response.data;
  },

  // Login
  login: async (data: LoginRequest) => {
    const response = await axiosInstance.post<AuthResponse>(`${AUTH_API_URL}/login`, data);
    return response.data;
  },

  // Obtener usuario actual
  getMe: async () => {
    const response = await axiosInstance.get<{ user: User }>(`${AUTH_API_URL}/me`);
    return response.data;
  },
};
