import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { enrollmentsApi } from '@/api/enrollments.api';

export function useMyEnrollments(status?: string) {
  return useQuery({
    queryKey: ['enrollments-my', status],
    queryFn: () => enrollmentsApi.getMyEnrollments(status),
    retry: false,
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
      queryClient.invalidateQueries({ queryKey: ['events-available'] });
      queryClient.invalidateQueries({ queryKey: ['virtual-access'] });
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
      queryClient.invalidateQueries({ queryKey: ['virtual-access'] });
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

/**
 * Hook para registrar automáticamente check-out cuando el usuario sale de la sala virtual.
 * Detecta:
 * - beforeunload (cierre de pestaña, recarga de página)
 * - useEffect cleanup (cambio de ruta)
 * 
 * Llamadas silenciosas sin mostrar errores al usuario.
 * 
 * @param eventId - ID del evento (para estudiantes en sala virtual)
 * @param enabled - Habilitar autodetección (por defecto true si eventId está presente)
 */
export function useAutoCheckOut(eventId?: string, enabled: boolean = !!eventId) {
  useEffect(() => {
    if (!enabled || !eventId) return;

    // Función para registrar check-out silenciosamente
    const performCheckOut = async () => {
      try {
        await enrollmentsApi.checkOutVirtualRoom(eventId);
      } catch (error) {
        // Silenciosamente ignorar errores - no mostrar al usuario
        console.debug('Auto check-out: no se necesitaba (ya registrado o error esperado)', error);
      }
    };

    // Detectar beforeunload (cierre de pestaña, recarga, navegación)
    const handleBeforeUnload = () => {
      // Usar navigator.sendBeacon para asegurar envío incluso si la página se cierra
      const apiUrl = import.meta.env.VITE_API_URL || 'https://sistema-de-gestion-de-eventos-y-x11t.onrender.com/api';
      const token = localStorage.getItem('token');
      
      if (token) {
        // sendBeacon no envía headers, distribuir token como query param
        const url = `${apiUrl}/enrollments/${eventId}/check-out?token=${encodeURIComponent(token)}`;
        
        if (navigator.sendBeacon) {
          // sendBeacon es más confiable para cierre de ventana
          const data = JSON.stringify({});
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        }
      }
    };

    // Detectar cambio de ruta (cleanup de useEffect)
    const handleRouteChange = () => {
      performCheckOut();
    };

    // Agregar listener para beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Retornar cleanup para detectar cuando el componente se desmonta (cambio de ruta)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleRouteChange();
    };
  }, [eventId, enabled]);
}
