import axiosInstance from './axios';

export const qrApi = {
  // Obtener QR como data URL
  getQR: async (enrollmentId: string) => {
    const response = await axiosInstance.get(`/qr/${enrollmentId}`);
    return response.data;
  },

  // Descargar QR como PNG
  downloadQR: async (enrollmentId: string) => {
    const response = await axiosInstance.get(`/qr/${enrollmentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Obtener QR como SVG
  getQRSVG: async (enrollmentId: string) => {
    const response = await axiosInstance.get(`/qr/${enrollmentId}/svg`, {
      responseType: 'text',
    });
    return response.data;
  },

  // Validar QR (público)
  validate: async (qrToken: string) => {
    const response = await axiosInstance.get(`/qr/validate/${qrToken}`);
    return response.data;
  },
};
