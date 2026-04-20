import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { enrollmentsApi } from '@/api/enrollments.api';
import { useMyEnrollments } from '@/hooks/useEnrollments';
import { useVirtualAccess } from '@/hooks/useEvents';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
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

            {/* Placeholder for video conferencing */}
            <div className="bg-secondary/10 rounded-lg border-2 border-dashed border-border p-16 mb-8">
              <div className="text-center">
                <p className="text-secondary mb-2">Videoconferencia</p>
                <p className="text-sm text-secondary/80">
                  Aquí se integrará la videoconferencia
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <p className="text-sm text-success">
                ✓ Sesión iniciada. Permanece en esta página para mantener la sesión activa.
              </p>
              <p className="text-xs text-secondary mt-2">
                Tu asistencia se registrará automáticamente.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
