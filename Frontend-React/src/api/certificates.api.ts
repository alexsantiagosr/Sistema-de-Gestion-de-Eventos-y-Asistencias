import axiosInstance from './axios';
import type { Certificate, CertificateData } from '@/types';

export const certificatesApi = {
  // Listar mis certificados disponibles
  getMyCertificates: async () => {
    const response = await axiosInstance.get<{ certificates: Certificate[]; count: number }>('/certificates/my-certificates');
    return response.data;
  },

  // Verificar elegibilidad para certificado
  checkEligibility: async (eventId: string) => {
    const response = await axiosInstance.get<{ eligible: boolean; attendance: CertificateData['attendance'] }>(`/certificates/${eventId}/eligibility`);
    return response.data;
  },

  // Obtener vista previa del certificado
  preview: async (eventId: string) => {
    const response = await axiosInstance.get<{ certificate: CertificateData }>(`/certificates/${eventId}/preview`);
    return response.data;
  },

  // Descargar certificado PDF
  download: async (eventId: string) => {
    const response = await axiosInstance.get(`/certificates/${eventId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
