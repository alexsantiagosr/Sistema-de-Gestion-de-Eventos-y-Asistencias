import { Video } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useVirtualAccess } from '@/hooks/useEvents';
import { useMyEnrollments } from '@/hooks/useEnrollments';
import Button from '@/components/ui/Button';
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
 */
export default function VirtualRoomAccessButton({ event, className, fullWidth }: Props) {
  const { user } = useAuth();
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
    const url = event.location?.trim();
    if (url && /^https?:\/\//i.test(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.info(
        'Acceso a la sala permitido. Si no ves un enlace aquí, revisa la descripción del evento o contacta al organizador.'
      );
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className={fullWidth ? `w-full ${className || ''}` : className}
      onClick={handleClick}
    >
      <Video className="w-4 h-4 mr-2" />
      Entrar a la sala
    </Button>
  );
}
