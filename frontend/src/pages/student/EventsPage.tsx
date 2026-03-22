import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAvailableEvents } from '@/hooks/useEvents';
import { useEnroll } from '@/hooks/useEnrollments';
import { toast } from 'sonner';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

export default function EventsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState<string>('');

  const { data: eventsData, isLoading } = useAvailableEvents();
  const enrollMutation = useEnroll();

  // Filtrar eventos
  const events = eventsData?.events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModality = !modalityFilter || event.modality === modalityFilter;
    return matchesSearch && matchesModality;
  }) || [];

  const handleEnroll = async (eventId: string, eventTitle: string) => {
    try {
      await enrollMutation.mutateAsync(eventId);
      toast.success(`Te has inscrito correctamente a "${eventTitle}"`);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Eventos Disponibles</h1>
        <p className="text-secondary mt-1">Explora e inscríbete en los eventos disponibles</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-base pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Modalidad
              </label>
              <select
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value)}
                className="input-base"
              >
                <option value="">Todas las modalidades</option>
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="híbrido">Híbrido</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Grid */}
      {events.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay eventos disponibles
              </h3>
              <p className="text-secondary">
                {searchTerm || modalityFilter
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Pronto se publicarán nuevos eventos'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="flex flex-col">
              {/* Event Header with Gradient */}
              <div
                className={`h-32 rounded-t-2xl relative p-6 ${event.modality === 'presencial'
                  ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                  : event.modality === 'virtual'
                    ? 'bg-gradient-to-br from-indigo-400 to-indigo-600'
                    : 'bg-gradient-to-br from-cyan-400 to-cyan-600'
                  }`}
              >
                <div className="absolute top-4 right-4">
                  {getModalityBadge(event.modality)}
                </div>
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                  {event.title}
                </h3>
              </div>

              <CardContent className="flex-1 flex flex-col">
                {/* Event Details */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center text-sm text-secondary">
                    <Calendar className="w-4 h-4 mr-2" />
                    {format(new Date(event.date), "dd 'de' MMMM, yyyy", { locale: es })}
                  </div>
                  <div className="flex items-center text-sm text-secondary">
                    <Clock className="w-4 h-4 mr-2" />
                    {event.duration} minutos
                  </div>
                  {event.location && (
                    <div className="flex items-center text-sm text-secondary">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Users className="w-4 h-4 mr-2" />
                    <span
                      className={
                        event.available_slots === 0
                          ? 'text-error font-medium'
                          : event.available_slots < 10
                            ? 'text-warning font-medium'
                            : 'text-success font-medium'
                      }
                    >
                      {event.available_slots} cupos disponibles de {event.capacity}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-sm text-secondary mt-4 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link to={`/events/${event.id}`}>
                    <Button variant="secondary" className="w-full mb-2">
                      Ver detalle
                    </Button>
                  </Link>
                  <Button
                    className="w-full"
                    disabled={event.available_slots === 0 || enrollMutation.isPending}
                    onClick={() => handleEnroll(event.id, event.title)}
                    isLoading={enrollMutation.isPending}
                  >
                    {event.available_slots === 0 ? 'Sin cupos' : 'Inscribirse'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
