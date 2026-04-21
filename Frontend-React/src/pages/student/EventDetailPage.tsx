import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Users, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEvent } from '@/hooks/useEvents';
import { useEnroll, useMyEnrollments } from '@/hooks/useEnrollments';
import { toast } from 'sonner';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import VirtualRoomAccessButton from '@/components/student/VirtualRoomAccessButton';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: eventData, isLoading } = useEvent(id!);
  const enrollMutation = useEnroll();
  const { data: myEnrollments } = useMyEnrollments();

  const event = eventData?.event;

  // Verificar estado de inscripción
  const currentEnrollment = myEnrollments?.enrollments.find(
    (e) => e.event_id === id
  );
  const isEnrolled = currentEnrollment?.status === 'active';
  const isCancelled = currentEnrollment?.status === 'cancelled';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!event) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Evento no encontrado
            </h3>
            <Button variant="secondary" onClick={() => navigate('/events')}>
              Volver a eventos
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleEnroll = async () => {
    try {
      await enrollMutation.mutateAsync(event.id);
      toast.success(`Te has inscrito correctamente a "${event.title}"`);
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || 'Error al inscribirse');
      } else {
        toast.error('Error al inscribirse al evento');
      }
    }
  };

  const getModalityBadge = (modality: string) => {
    const config = {
      presencial: { variant: 'presencial' as const, label: 'Presencial' },
      virtual: { variant: 'virtual' as const, label: 'Virtual' },
      híbrido: { variant: 'hibrido' as const, label: 'Híbrido' },
    };
    const { variant, label } = config[modality as keyof typeof config] || config.presencial;
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="max-w-4xl">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/events')} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a eventos
      </Button>

      {/* Header */}
      <div
        className={`h-48 rounded-t-2xl relative p-8 ${
          event.modality === 'presencial'
            ? 'bg-gradient-to-br from-orange-400 to-orange-600'
            : event.modality === 'virtual'
            ? 'bg-gradient-to-br from-indigo-400 to-indigo-600'
            : 'bg-gradient-to-br from-cyan-400 to-cyan-600'
        }`}
      >
        <div className="absolute top-6 right-6">
          {getModalityBadge(event.modality)}
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">{event.title}</h1>
        <div className="flex items-center text-white/90">
          <Calendar className="w-5 h-5 mr-2" />
          {format(new Date(event.date), "EEEE, dd 'de' MMMM, yyyy", { locale: es })}
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent>
          {/* Key Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 pb-8 border-b border-gray-100">
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-secondary">Duración</p>
                <p className="font-medium text-gray-900">{event.duration} minutos</p>
              </div>
            </div>
            <div className="flex items-start">
              <Users className="w-5 h-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-secondary">Cupos</p>
                <p className={`font-medium ${
                  event.available_slots === 0
                    ? 'text-error'
                    : event.available_slots < 10
                    ? 'text-warning'
                    : 'text-success'
                }`}>
                  {event.available_slots} / {event.capacity}
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-secondary">Asistencia mínima</p>
                <p className="font-medium text-gray-900">{event.min_attendance_percentage}%</p>
              </div>
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-secondary">Ubicación</p>
                <p className="font-medium text-gray-900 line-clamp-1">
                  {event.location || 'Por definir'}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h2>
            <p className="text-secondary leading-relaxed">
              {event.description || 'No hay descripción disponible para este evento.'}
            </p>
          </div>

          {/* Organizer */}
          {(event.organized_by || event.created_by) && (
            <div className="mb-8 p-4 bg-gray-50 rounded-xl flex items-start gap-3">
              <Building2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Organizado por</h3>
                <p className="text-gray-900">
                  {event.organized_by || event.created_by?.name || 'No especificado'}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-gray-100">
            <div>
              {isEnrolled ? (
                <div className="flex items-center text-success">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Ya estás inscrito en este evento</span>
                </div>
              ) : isCancelled ? (
                <div className="flex items-center text-error">
                  <XCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Inscripción cancelada</span>
                </div>
              ) : (
                <p className="text-secondary">
                  {event.available_slots === 0
                    ? 'No hay cupos disponibles'
                    : `${event.available_slots} cupos disponibles`}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:space-x-4 sm:gap-0">
              {!isEnrolled && !isCancelled && (
                <Button
                  disabled={event.available_slots === 0 || enrollMutation.isPending}
                  onClick={handleEnroll}
                  isLoading={enrollMutation.isPending}
                >
                  {event.available_slots === 0 ? 'Sin cupos' : 'Inscribirme al evento'}
                </Button>
              )}
              {isCancelled && (
                <Button
                  disabled={event.available_slots === 0 || enrollMutation.isPending}
                  onClick={handleEnroll}
                  isLoading={enrollMutation.isPending}
                >
                  {event.available_slots === 0 ? 'Sin cupos' : 'Reinscribirme'}
                </Button>
              )}
              {isEnrolled && (
                <Link to="/my-enrollments">
                  <Button>Ver mi inscripción</Button>
                </Link>
              )}
              <VirtualRoomAccessButton event={event} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
