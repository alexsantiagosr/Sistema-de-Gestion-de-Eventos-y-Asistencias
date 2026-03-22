import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentsApi } from '@/api/enrollments.api';

export function useMyEnrollments(status?: string) {
  return useQuery({
    queryKey: ['enrollments-my', status],
    queryFn: () => enrollmentsApi.getMyEnrollments(status),
  });
}

export function useEnrollment(id: string) {
  return useQuery({
    queryKey: ['enrollment', id],
    queryFn: () => enrollmentsApi.getById(id),
    enabled: !!id,
  });
}

export function useEnroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => enrollmentsApi.enroll(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments-my'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useCancelEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => enrollmentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments-my'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useEventEnrollments(eventId: string) {
  return useQuery({
    queryKey: ['enrollments-event', eventId],
    queryFn: () => enrollmentsApi.getEventEnrollments(eventId),
    enabled: !!eventId,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => enrollmentsApi.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments-event'] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => enrollmentsApi.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments-event'] });
    },
  });
}

export function useMarkAsUsed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => enrollmentsApi.markAsUsed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments-event'] });
    },
  });
}

export function useAttendance(eventId: string) {
  return useQuery({
    queryKey: ['attendance', eventId],
    queryFn: () => enrollmentsApi.getAttendance(eventId),
    enabled: !!eventId,
  });
}
