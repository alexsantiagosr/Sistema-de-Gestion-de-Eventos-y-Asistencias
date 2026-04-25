import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/events')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Atrás
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{eventInfo.title}</h1>
              <p className="text-sm text-secondary">Sala virtual</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <div className="text-center">
            {/* Message */}
            <div className="mb-8">
              <p className="text-lg text-secondary">
                Estás participando en el evento
              </p>
              <h2 className="text-2xl font-bold mt-2">{eventInfo.title}</h2>
            </div>

            {/* Jitsi Video Conferencing */}
            <div className="w-full mb-8">
              <iframe
                src={`https://meet.jit.si/event-${eventId}`}
                allow="camera; microphone; fullscreen; display-capture"
                style={{
                  width: '100%',
                  height: '80vh',
                  border: 'none',
                  borderRadius: '12px'
                }}
              />
            </div>

            {/* Status */}
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <p className="text-sm text-success font-medium">
                ✓ Sesión activa y sincronizada.
              </p>
              <p className="text-sm font-semibold mt-1">
                Tiempo activo en sala: {sessionMinutes} {sessionMinutes === 1 ? 'minuto' : 'minutos'}
              </p>
              <p className="text-xs text-secondary mt-2">
                Tu asistencia se registra en segundo plano automáticamente mientras permanezcas en esta pantalla.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
