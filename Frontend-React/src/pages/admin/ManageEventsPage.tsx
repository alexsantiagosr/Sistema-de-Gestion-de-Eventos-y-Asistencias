import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Eye, CheckCircle, Trash2, Play } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEvents, useDeleteEvent, useUpdateEventStatus, useStartVirtualRoom } from '@/hooks/useEvents';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Spinner from '@/components/ui/Spinner';
import CustomSelect from '@/components/ui/CustomSelect';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/Table';

export default function ManageEventsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modalityFilter, setModalityFilter] = useState<string>('');
  const [eventToDelete, setEventToDelete] = useState<{ id: string; title: string } | null>(null);
  const [eventToCancel, setEventToCancel] = useState<{ id: string; title: string; status: string } | null>(null);

  const { data: eventsData, isLoading, refetch } = useEvents({
    status: statusFilter || undefined,
    modality: modalityFilter || undefined,
  });

  const deleteMutation = useDeleteEvent();
  const updateStatusMutation = useUpdateEventStatus();
  const startRoomMutation = useStartVirtualRoom();

  // Filtrar por búsqueda y ordenar por fecha de creación descendente
  const events = [...(eventsData?.events || [])]
    .filter((event) => event.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleDelete = async () => {
    if (!eventToDelete) return;

    try {
      await deleteMutation.mutateAsync(eventToDelete.id);
      toast.success(`Evento "${eventToDelete.title}" cancelado correctamente`);
      setEventToDelete(null);
    } catch {
      toast.error('Error al cancelar el evento');
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'completed' | 'cancelled') => {
    if (!eventToCancel) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: eventToCancel.id,
        status: newStatus,
      });

      const statusLabels = {
        active: 'activado',
        completed: 'completado',
        cancelled: 'cancelado',
      };

      toast.success(`Evento "${eventToCancel.title}" ${statusLabels[newStatus]} correctamente`);
      setEventToCancel(null);
      refetch();
    } catch {
      toast.error('Error al cambiar el estado del evento');
    }
  };

  const handleStartVirtualRoom = async (eventId: string, eventTitle: string) => {
    try {
      await startRoomMutation.mutateAsync(eventId);
      toast.success(`Sala iniciada para el evento "${eventTitle}"`);
      navigate(`/events/${eventId}/virtual-room`);
    } catch {
      toast.error('Error al iniciar la sala virtual');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { variant: 'success' as const, label: 'Activo' },
      completed: { variant: 'info' as const, label: 'Completado' },
      finished: { variant: 'info' as const, label: 'Finalizado' },
      cancelled: { variant: 'error' as const, label: 'Cancelado' },
    };
    const { variant, label } = config[status as keyof typeof config] || config.active;
    return <Badge variant={variant}>{label}</Badge>;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Eventos</h1>
          <p className="text-secondary mt-1 text-sm sm:text-base">Administra todos los eventos del sistema</p>
        </div>
        <Link to="/admin/events/new">
          <Button>
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Evento
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Card>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4">
              <div className="flex-1 sm:flex-[2]">
                <Input
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="w-5 h-5" />}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Estado
                </label>
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: '', label: 'Todos los estados' },
                    { value: 'active', label: 'Activos' },
                    { value: 'completed', label: 'Completados' },
                    { value: 'cancelled', label: 'Cancelados' },
                  ]}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Modalidad
                </label>
                <CustomSelect
                  value={modalityFilter}
                  onChange={setModalityFilter}
                  options={[
                    { value: '', label: 'Todas las modalidades' },
                    { value: 'presencial', label: 'Presencial' },
                    { value: 'virtual', label: 'Virtual' },
                    { value: 'híbrido', label: 'Híbrido' },
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent padding="none">
          <div className="overflow-x-auto rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="hidden lg:table-cell">Modalidad</TableHead>
                  <TableHead>Cupos</TableHead>
                  <TableHead className="hidden lg:table-cell">Duración</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableEmpty colSpan={7} message="No hay eventos registrados" />
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{event.title}</p>
                          {event.location && (
                            <p className="text-xs sm:text-sm text-secondary hidden md:block">{event.location}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(event.date), "dd 'de' MMMM, yyyy", { locale: es })}
                        <p className="text-xs sm:text-sm text-secondary">
                          {format(new Date(event.date), 'HH:mm')}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{getModalityBadge(event.modality)}</TableCell>
                      <TableCell>
                        <span className={event.available_slots === 0 ? 'text-error font-medium' : ''}>
                          {event.available_slots} / {event.capacity}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{event.duration} min</TableCell>
                      <TableCell className="hidden sm:table-cell">{getStatusBadge(event.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/events/${event.id}/attendance`)}
                            className="inline-flex"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/events/${event.id}`)}
                            className="inline-flex"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                            className="inline-flex"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {event.status === 'active' && (event.modality === 'virtual' || event.modality === 'híbrido' || event.modality === ('hibrido' as any)) && !event.is_live && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartVirtualRoom(event.id, event.title)}
                              className="inline-flex text-green-600 hover:bg-green-50"
                              title="Iniciar sala virtual"
                              disabled={startRoomMutation.isPending}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          {event.is_live && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/events/${event.id}/virtual-room`)}
                              className="inline-flex text-blue-600 hover:bg-blue-50"
                              title="Ir a sala virtual"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEventToDelete({ id: event.id, title: event.title })}
                            className="inline-flex text-error hover:bg-error/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog (using DELETE endpoint logically) */}
      <ConfirmDialog
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleDelete}
        title="Cancelar evento"
        message={`¿Estás seguro de que deseas cancelar el evento "${eventToDelete?.title}"? Esta acción no se puede deshacer y los usuarios inscritos serán notificados.`}
        confirmText="Sí, cancelar"
        cancelText="Volver"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Status Change Dialog */}
      <ConfirmDialog
        isOpen={!!eventToCancel}
        onClose={() => setEventToCancel(null)}
        onConfirm={() => handleStatusChange('cancelled')}
        title="Cancelar evento"
        message={`¿Estás seguro de que deseas cancelar el evento "${eventToCancel?.title}"? Los usuarios inscritos serán notificados.`}
        confirmText="Cancelar evento"
        cancelText="No cancelar"
        variant="warning"
        isLoading={updateStatusMutation.isPending}
      />
    </div>
  );
}
