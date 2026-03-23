import axiosInstance from './axios';
import type { Enrollment } from '@/types';

export const enrollmentsApi = {
  // Inscribirse a un evento
  enroll: async (eventId: string) => {
    const response = await axiosInstance.post<{ enrollment: Enrollment }>(`/enrollments/${eventId}`);
    return response.data;
  },

  // Obtener mis inscripciones
  getMyEnrollments: async (status?: string) => {
    const response = await axiosInstance.get<{ enrollments: Enrollment[]; count: number }>('/enrollments/my-enrollments', {
      params: { status },
    });
    return response.data;
  },

  // Obtener inscripción por ID
  getById: async (id: string) => {
    const response = await axiosInstance.get<{ enrollment: Enrollment }>(`/enrollments/${id}`);
    return response.data;
  },

  // Cancelar inscripción
  cancel: async (id: string) => {
    const response = await axiosInstance.delete(`/enrollments/${id}`);
    return response.data;
  },

  // Validar QR (público)
  validateQR: async (qrToken: string) => {
    const response = await axiosInstance.get(`/enrollments/qr/${qrToken}`);
    return response.data;
  },

  // Registrar check-in (admin)
  checkIn: async (id: string) => {
    const response = await axiosInstance.post<{ enrollment: Enrollment }>(`/enrollments/${id}/check-in`);
    return response.data;
  },

  // Registrar check-out (admin)
  checkOut: async (id: string) => {
    const response = await axiosInstance.post<{ enrollment: Enrollment }>(`/enrollments/${id}/check-out`);
    return response.data;
  },

  // Marcar como usada (admin)
  markAsUsed: async (id: string) => {
    const response = await axiosInstance.post<{ enrollment: Enrollment }>(`/enrollments/${id}/mark-used`);
    return response.data;
  },

  // Obtener inscripciones de un evento (admin)
  getEventEnrollments: async (eventId: string) => {
    const response = await axiosInstance.get<{ enrollments: Enrollment[]; count: number }>(`/enrollments/event/${eventId}`);
    return response.data;
  },

  // Obtener porcentaje de asistencia
  getAttendance: async (eventId: string) => {
    const response = await axiosInstance.get(`/enrollments/${eventId}/attendance`);
    return response.data;
  },
};
