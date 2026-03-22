import axiosInstance from './axios';
import type { Event, CreateEventFormData } from '@/types';

interface EventsQuery {
  status?: string;
  modality?: string;
}

export const eventsApi = {
  // Listar todos los eventos
  getAll: async (params?: EventsQuery) => {
    const response = await axiosInstance.get<{ events: Event[]; count: number }>('/events', { params });
    return response.data;
  },

  // Listar eventos disponibles
  getAvailable: async () => {
    const response = await axiosInstance.get<{ events: Event[]; count: number }>('/events/available');
    return response.data;
  },

  // Obtener evento por ID
  getById: async (id: string) => {
    const response = await axiosInstance.get<{ event: Event }>(`/events/${id}`);
    return response.data;
  },

  // Crear evento (admin)
  create: async (data: CreateEventFormData) => {
    const response = await axiosInstance.post<{ event: Event; message: string }>('/events', data);
    return response.data;
  },

  // Actualizar evento (admin)
  update: async (id: string, data: Partial<CreateEventFormData>) => {
    const response = await axiosInstance.put<{ event: Event; message: string }>(`/events/${id}`, data);
    return response.data;
  },

  // Eliminar evento (admin)
  delete: async (id: string) => {
    const response = await axiosInstance.delete<{ message: string }>(`/events/${id}`);
    return response.data;
  },

  // Actualizar estado del evento (admin)
  updateStatus: async (id: string, status: 'active' | 'completed' | 'cancelled') => {
    const response = await axiosInstance.patch<{ event: Event; message: string }>(`/events/${id}/status`, { status });
    return response.data;
  },
};
