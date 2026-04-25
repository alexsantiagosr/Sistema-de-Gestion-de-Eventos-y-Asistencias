import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { enrollmentsApi } from '@/api/enrollments.api';
import { useMyEnrollments } from '@/hooks/useEnrollments';
import { useVirtualAccess } from '@/hooks/useEvents';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

/**
 * Sala virtual interna para eventos
 * Maneja check-in automático al entrar y check-out al salir
 */
export default function VirtualRoomPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: myEnrollments } = useMyEnrollments();
  const { data: eventData } = useVirtualAccess(eventId || '', !!eventId);

  // Obtener el evento de las inscripciones del usuario
  const currentEnrollment = myEnrollments?.enrollments.find(
    (e) => e.event_id === eventId && e.status === 'active'
  );
  const eventInfo = currentEnrollment?.events;

  // Variables para control de tiempo activo (HU-07)
  const activeSeconds = useRef(0);
  const isSending = useRef(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);

  // Control de tiempo activo (HU-07)
  useEffect(() => {
    if (!eventId) return;

    let intervalId: NodeJS.Timeout;

    const startTimer = () => {
      // Usar intervalo de 5 segundos para optimizar rendimiento
      intervalId = setInterval(async () => {
        if (document.visibilityState === 'visible') {
          activeSeconds.current += 5;
          const currentMinutes = Math.floor(activeSeconds.current / 60);
          
          if (currentMinutes > sessionMinutes) {
            setSessionMinutes(currentMinutes);
          }

          // Enviar cada 60 segundos (cuando coincide el múltiplo exacto de 60)
          if (activeSeconds.current > 0 && activeSeconds.current % 60 === 0) {
            if (isSending.current) return;
            isSending.current = true;
            try {
              // Enviar reporte de 1 minuto acumulado
              await enrollmentsApi.addAttendanceTime(eventId, 1);
            } catch (error) {
              console.error('Error reportando tiempo activo:', error);
            } finally {
              isSending.current = false;
            }
          }
        }
      }, 5000);
    };

    startTimer();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Pausar logica externa no es necesario, el interval chequea visibilityState directamente
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [eventId, sessionMinutes]);

  // Check-in automático al montar el componente
  useEffect(() => {
    if (!eventId) {
      toast.error('Evento no encontrado');
      navigate('/events');
      return;
    }

    const performCheckIn = async () => {
      try {
        await enrollmentsApi.checkInVirtualRoom(eventId);
      } catch (error: unknown) {
        // Silencioso si ya existe sesión (alreadyCheckedIn: true)
        const errorCode = (error as { response?: { status?: number } })?.response?.status;
        if (errorCode && errorCode !== 400) {
          console.debug('Auto check-in: sesión ya activa o error esperado', error);
        }
      }
    };

    performCheckIn();

    // Check-out automático al desmontar o navegar away
    return () => {
      const performCheckOut = async () => {
        try {
          if (eventId) {
            await enrollmentsApi.checkOutVirtualRoom(eventId);
          }
        } catch (error: unknown) {
          // Silencioso si no existe sesión activa o ya fue cerrada
          console.debug('Auto check-out: sesión no activa o ya cerrada', error);
        }
      };

      performCheckOut();
    };
  }, [eventId, navigate]);

  // Validaciones
  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <p className="text-secondary mb-4">Evento no encontrado</p>
            <Button onClick={() => navigate('/events')}>Volver a eventos</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentEnrollment || !eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!eventInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <p className="text-secondary mb-4">No tienes acceso a este evento</p>
            <Button onClick={() => navigate('/events')}>Volver a eventos</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header Fijo */}
      <div className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <h1 className="text-lg font-semibold text-gray-800 line-clamp-1">
          {eventInfo?.title || 'Sala Virtual'}
        </h1>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-sm font-medium text-green-600 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              En vivo
            </span>
            <span className="text-xs text-gray-500">
              Tiempo: {sessionMinutes} {sessionMinutes === 1 ? 'minuto' : 'minutos'}
            </span>
          </div>

          <button
            onClick={() => navigate('/events')}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Video Contenedor (Fullscreen adaptativo) */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden">
        <div className="w-full h-full overflow-hidden rounded-2xl shadow-md bg-black">
          <iframe
            src={`https://meet.jit.si/event-${eventId}`}
            allow="camera; microphone; fullscreen; display-capture"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
