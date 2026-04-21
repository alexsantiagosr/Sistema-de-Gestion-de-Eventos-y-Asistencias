import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useVirtualAccess } from '@/hooks/useEvents';
import { useMyEnrollments } from '@/hooks/useEnrollments';
import { Button } from '@/components/ui/Button';
import type { Event } from '@/types';

function isVirtualOrHybrid(modality: string) {
  const m = modality.toLowerCase().replace(/í/g, 'i');
  return m === 'virtual' || m === 'hibrido';
}

type Props = {
  event: Pick<Event, 'id' | 'modality' | 'location'>;
  className?: string;
  fullWidth?: boolean;
};

/**
 * Solo para rol estudiante: muestra "Entrar a la sala" cuando el backend confirma acceso.
 * Navega a la sala virtual interna en lugar de abrir URL externa.
 */
export default function VirtualRoomAccessButton({ event, className, fullWidth }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const { data: myEnrollments } = useMyEnrollments();

  const isStudent = user?.role === 'student';
  const isEnrolledActive = Boolean(
    myEnrollments?.enrollments.some((e) => e.event_id === event.id && e.status === 'active')
  );
  const modalityOk = isVirtualOrHybrid(event.modality);
  const queryEnabled = isStudent && isEnrolledActive && modalityOk;

  const { data, isLoading } = useVirtualAccess(event.id, queryEnabled);

  if (!isStudent || !queryEnabled || isLoading || !data?.access) {
    return null;
  }

  const handleClick = () => {
    setIsNavigating(true);
    // Navegar a la sala virtual interna
    // Check-in/check-out se manejan automáticamente en VirtualRoomPage
    navigate(`/events/${event.id}/virtual-room`);
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className={fullWidth ? `w-full ${className || ''}` : className}
      onClick={handleClick}
      isLoading={isNavigating}
    >
      <Video className="w-4 h-4 mr-2" />
      Entrar a la sala
    </Button>
  );
}
