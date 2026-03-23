import axiosInstance from './axios';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '@/types';

export const authApi = {
  // Registro de usuario
  register: async (data: RegisterRequest) => {
    const response = await axiosInstance.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  // Login
  login: async (data: LoginRequest) => {
    const response = await axiosInstance.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  // Obtener usuario actual
  getMe: async () => {
    const response = await axiosInstance.get<{ user: User }>('/auth/me');
    return response.data;
  },
};
