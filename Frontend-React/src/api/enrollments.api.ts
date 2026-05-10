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

  // Registrar check-in (admin — id = inscripción)
  checkIn: async (id: string) => {
    const response = await axiosInstance.post<{ enrollment: Enrollment }>(`/enrollments/${id}/check-in`);
    return response.data;
  },

  /** Check-in al entrar a sala virtual (estudiante — eventId del evento) */
  checkInVirtualRoom: async (eventId: string) => {
    const response = await axiosInstance.post<{
      message: string;
      enrollment: Enrollment;
      alreadyCheckedIn?: boolean;
    }>(`/enrollments/${eventId}/check-in`);
    return response.data;
  },

  /** Check-out al salir de sala virtual (estudiante — eventId del evento) */
  checkOutVirtualRoom: async (eventId: string) => {
    const response = await axiosInstance.post<{
      message: string;
      enrollment: Enrollment;
      alreadyCheckedOut?: boolean;
    }>(`/enrollments/${eventId}/check-out`);
    return response.data;
  },

  // Registrar check-out (admin)
  checkOut: async (id: string) => {
    const response = await axiosInstance.post<{ enrollment: Enrollment }>(`/enrollments/${id}/check-out`);
    return response.data;
  },

  /** Toggle presencial: entrada/salida temporal (staff — enrollmentId) */
  togglePhysicalAttendance: async (enrollmentId: string) => {
    const response = await axiosInstance.post<{
      action: 'checked_in' | 'checked_out';
      message: string;
      enrollment: Enrollment;
      durationSeconds?: number;
      activeSeconds?: number;
    }>(`/enrollments/${enrollmentId}/check-in`);
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

  // Registrar tiempo activo en segundos
  addAttendanceTime: async (eventId: string, seconds: number) => {
    const response = await axiosInstance.post<{ ok: boolean; message: string }>(`/enrollments/${eventId}/attendance-time`, { seconds });
    return response.data;
  },
};
