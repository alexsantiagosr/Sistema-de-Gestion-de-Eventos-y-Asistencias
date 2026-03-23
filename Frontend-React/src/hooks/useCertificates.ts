import { useQuery, useMutation } from '@tanstack/react-query';
import { certificatesApi } from '@/api/certificates.api';

export function useMyCertificates() {
  return useQuery({
    queryKey: ['certificates-my'],
    queryFn: () => certificatesApi.getMyCertificates(),
  });
}

export function useCertificateEligibility(eventId: string) {
  return useQuery({
    queryKey: ['certificate-eligibility', eventId],
    queryFn: () => certificatesApi.checkEligibility(eventId),
    enabled: !!eventId,
  });
}

export function useCertificatePreview(eventId: string) {
  return useQuery({
    queryKey: ['certificate-preview', eventId],
    queryFn: () => certificatesApi.preview(eventId),
    enabled: !!eventId,
  });
}

export function useDownloadCertificate() {
  return useMutation({
    mutationFn: (eventId: string) => certificatesApi.download(eventId),
  });
}
