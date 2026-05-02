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

  /** GET /events/:eventId/virtual-access — solo estudiante; 403/404 → access: false */
  getVirtualAccess: async (eventId: string) => {
    try {
      const response = await axiosInstance.get<{ access: boolean }>(`/events/${eventId}/virtual-access`);
      return response.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 404) {
        return { access: false as const };
      }
      throw err;
    }
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

  // Iniciar sala virtual (admin)
  startVirtualRoom: async (id: string) => {
    const response = await axiosInstance.post<{ event: Event; message: string }>(`/events/${id}/start`);
    return response.data;
  },

  // Finalizar sala virtual (admin)
  endVirtualRoom: async (id: string) => {
    const response = await axiosInstance.post<{ event: Event; message: string }>(`/events/${id}/end`);
    return response.data;
  },
};
