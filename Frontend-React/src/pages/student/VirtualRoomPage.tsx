import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { enrollmentsApi } from '@/api/enrollments.api';
import { useMyEnrollments } from '@/hooks/useEnrollments';
import { useVirtualAccess, useEvent } from '@/hooks/useEvents';
import { useAuth } from '@/context/AuthContext';
import { eventsApi } from '@/api/events.api';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

/**
 * Sala virtual interna para eventos
 * Maneja check-in automático al entrar y check-out al salir
 */
export default function VirtualRoomPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: myEnrollments, isLoading: isLoadingEnrollments } = useMyEnrollments();
  // Fetch event details for admin, since admin might not be enrolled
  const { data: eventDetailsData } = useEvent(eventId || '');
  useVirtualAccess(eventId || '', !!eventId && !isAdmin);

  // Obtener el evento (incluir 'completed' para no perder acceso si autoFinishEvents se ejecuta durante la sesión)
  const currentEnrollment = myEnrollments?.enrollments.find(
    (e) => e.event_id === eventId && (e.status === 'active' || e.status === 'completed')
  );
  
  const isPhysicallyPresent = !!(currentEnrollment?.check_in && !currentEnrollment?.check_out);
  
  const eventInfo = isAdmin ? eventDetailsData?.event : currentEnrollment?.events;

  // Variables para control de tiempo activo (HU-07)
  const accumulatedSeconds = useRef(0); // Segundos acumulados pendientes por enviar
  const totalActiveSeconds = useRef(0); // Segundos totales para UI
  const isSending = useRef(false);
  const eventEndTimeRef = useRef<number>(Infinity);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  
  // Variables para advertencia de salida de sala
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isEndingRoom, setIsEndingRoom] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const handleExit = () => {
    navigate('/events');
  };

  // Control de tiempo activo (HU-07) - Solo para estudiantes
  useEffect(() => {
    if (!eventId || isAdmin || isLoadingEnrollments || isPhysicallyPresent) return;

    let intervalId: NodeJS.Timeout | null = null;


    const sendTime = async () => {
      if (accumulatedSeconds.current > 0 && !isSending.current) {
        const secondsToSend = accumulatedSeconds.current;
        isSending.current = true;
        accumulatedSeconds.current = 0; // Reset para el siguiente ciclo

        try {
          await enrollmentsApi.addAttendanceTime(eventId, secondsToSend);
        } catch (error) {
          console.error('Error reportando tiempo activo:', error);
          // Si hay error, devolvemos los segundos para reintentar luego
          accumulatedSeconds.current += secondsToSend;
        } finally {
          isSending.current = false;
        }
      }
    };

    const startCounting = () => {
      if (intervalId) return;

      if (eventInfo?.date && eventInfo?.duration) {
        eventEndTimeRef.current = new Date(eventInfo.date).getTime() + (eventInfo.duration * 60 * 1000);
      }

      intervalId = setInterval(() => {
        if (Date.now() > eventEndTimeRef.current) {
          // El tiempo del evento ha finalizado. No seguimos contando active_seconds.
          return;
        }

        accumulatedSeconds.current += 1;
        totalActiveSeconds.current += 1;
        
        const currentMinutes = Math.floor(totalActiveSeconds.current / 60);
        setSessionMinutes((prev) => (currentMinutes > prev ? currentMinutes : prev));

        // Enviar cada 60 segundos
        if (accumulatedSeconds.current >= 60) {
          sendTime();
        }
      }, 1000);
    };

    const stopCounting = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startCounting();
      } else if (document.visibilityState === 'hidden') {
        stopCounting();
        sendTime(); // Enviar acumulado al ocultar la pestaña
      }
    };

    const handleBeforeUnload = () => {
      if (accumulatedSeconds.current > 0) {
        sendTime();
      }
    };

    // Al cargar el componente
    if (document.visibilityState === 'visible') {
      startCounting();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      stopCounting();
      sendTime();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [eventId, isAdmin, isLoadingEnrollments, isPhysicallyPresent]);

  // Detección robusta de cambio de pestaña (solo estudiantes)
  useEffect(() => {
    if (isAdmin || isLoadingEnrollments || isPhysicallyPresent) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setTabSwitchCount((prev) => prev + 1);
      } else {
        setShowWarning(true);
        setTimeout(() => {
          setShowWarning(false);
        }, 4000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAdmin, isLoadingEnrollments, isPhysicallyPresent]);

  // Expulsar estudiantes solo si la sala pasa a is_live = false
  useEffect(() => {
    if (eventInfo && eventInfo.is_live === false && !isAdmin) {
      setShowEndModal(true);
    }
  }, [eventInfo?.is_live, isAdmin]);

  // Check-in automático al montar el componente (Solo estudiantes)
  useEffect(() => {
    if (!eventId) {
      toast.error('Evento no encontrado');
      navigate('/events');
      return;
    }

    if (isAdmin || isLoadingEnrollments || isPhysicallyPresent) return;

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

    // Check-out automático al desmontar (solo estudiantes)
    const performCheckOut = async () => {
      try {
        if (eventId) {
          await enrollmentsApi.checkOutVirtualRoom(eventId);
        }
      } catch {
        // Silencioso — el enrollment puede ya estar completed
      }
    };

    const handleWindowClose = () => {
      performCheckOut();
    };

    window.addEventListener('beforeunload', handleWindowClose);

    return () => {
      window.removeEventListener('beforeunload', handleWindowClose);
      performCheckOut();
    };
  }, [eventId, navigate, isAdmin, isLoadingEnrollments, isPhysicallyPresent]);

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

  if (!isAdmin && isLoadingEnrollments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAdmin && !currentEnrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <p className="text-error mb-4 font-semibold text-lg">No tienes acceso a este evento</p>
            <p className="text-secondary mb-6">Debes estar inscrito para acceder a la sala virtual.</p>
            <Button onClick={() => navigate('/events')}>Volver a eventos</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!eventInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Nota: si is_live es undefined/null, se trata como "aún no definido" y se deja pasar.
  // Solo bloqueamos al estudiante cuando is_live es explícitamente false.

  if (eventInfo.is_live === false && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="bg-yellow-100 text-yellow-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-3xl">
              ⛔
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sala finalizada</h2>
            <p className="text-secondary mb-6">El organizador aún no ha iniciado la sala o ya la ha finalizado.</p>
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
            {!isAdmin && (
              <span className="text-xs text-gray-600 mt-0.5">
                Salidas detectadas: {tabSwitchCount}
              </span>
            )}
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition mr-2"
              disabled={isEndingRoom}
            >
              Finalizar sala
            </button>
          )}

          <button
            onClick={handleExit}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Video Contenedor (Fullscreen adaptativo) */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden">
        <div className="w-full h-full overflow-hidden rounded-2xl shadow-md bg-black">
          <iframe
            src={`https://meet.jit.si/event-${eventId}#config.prejoinPageEnabled=${isAdmin ? 'true' : 'false'}&config.startWithAudioMuted=${isAdmin ? 'false' : 'true'}&config.startWithVideoMuted=${isAdmin ? 'false' : 'true'}&config.enableWelcomePage=false&config.requireDisplayName=false&userInfo.displayName=${encodeURIComponent(isAdmin ? 'Administrador' : (user?.name || 'Estudiante'))}`}
            allow="camera; microphone; fullscreen; display-capture"
            className="w-full h-full border-0"
          />
        </div>
      </div>

      {/* Alerta flotante de advertencia */}
      {!isAdmin && !isPhysicallyPresent && showWarning && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg shadow-md z-50">
          Has salido de la sala. Esto puede afectar tu certificación.
        </div>
      )}

      {/* Banner presencial */}
      {!isAdmin && isPhysicallyPresent && (
        <div className="bg-blue-100 border-b border-blue-200 px-4 py-2 text-center text-sm font-medium text-blue-800 shadow-sm">
          Te encuentras registrado presencialmente
        </div>
      )}

      {/* Modal de evento finalizado */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[90%] max-w-md text-center transform scale-100 animate-scaleIn">
            {/* Icono */}
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 text-red-600 rounded-full p-4 text-2xl">
                ⛔
              </div>
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold mb-2">
              Evento finalizado
            </h2>

            {/* Descripción */}
            <p className="text-gray-600 mb-6">
              El evento ha concluido. Gracias por tu participación.
            </p>

            {/* Botón */}
            <button
              onClick={() => {
                setShowEndModal(false);
                handleExit();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-medium"
            >
              Salir de la sala
            </button>
          </div>
        </div>
      )}

      {/* Dialogo Confirmación Finalizar */}
      {isAdmin && (
        <ConfirmDialog
          isOpen={showEndConfirm}
          onClose={() => setShowEndConfirm(false)}
          onConfirm={async () => {
            try {
              setIsEndingRoom(true);
              await eventsApi.endVirtualRoom(eventId!);
              toast.success('Sala finalizada correctamente');
              navigate('/events');
            } catch (err) {
              toast.error('Error al finalizar sala');
              setIsEndingRoom(false);
            }
          }}
          title="¿Finalizar la sala virtual?"
          message="Esto expulsará a todos los estudiantes y no podrán volver a entrar. ¿Estás seguro?"
          confirmText="Sí, finalizar"
          cancelText="Cancelar"
          variant="danger"
        />
      )}
    </div>
  );
}
