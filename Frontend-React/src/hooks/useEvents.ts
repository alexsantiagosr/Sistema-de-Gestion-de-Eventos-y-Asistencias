import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/api/events.api';
import type { CreateEventFormData } from '@/types';

interface EventsFilters {
  status?: string;
  modality?: string;
  search?: string;
}

/**
 * Hook para obtener todos los eventos con filtros opcionales
 */
export function useEvents(filters?: EventsFilters) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsApi.getAll(filters),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });
}

/**
 * Hook para obtener eventos disponibles
 */
export function useAvailableEvents() {
  return useQuery({
    queryKey: ['events-available'],
    queryFn: () => eventsApi.getAvailable(),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para obtener un evento por ID
 */
export function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Acceso a sala virtual (estudiante). Solo consulta si enabled (inscrito + modalidad virtual/híbrido).
 */
export function useVirtualAccess(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['virtual-access', eventId],
    queryFn: () => eventsApi.getVirtualAccess(eventId),
    enabled: !!eventId && enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: enabled ? 60 * 1000 : false,
    retry: false,
  });
}

/**
 * Hook para crear un evento
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventFormData) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-available'] });
    },
  });
}

/**
 * Hook para actualizar un evento
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventFormData> }) =>
      eventsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-available'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
  });
}

/**
 * Hook para eliminar un evento
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-available'] });
    },
  });
}

/**
 * Hook para actualizar el estado de un evento
 */
export function useUpdateEventStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'completed' | 'cancelled' }) =>
      eventsApi.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-available'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
  });
}

/**
 * Hook para iniciar una sala virtual (admin)
 */
export function useStartVirtualRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => eventsApi.startVirtualRoom(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-available'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['enrollments-my'] });
    },
  });
}
