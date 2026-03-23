import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Eye, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEvents, useDeleteEvent, useUpdateEventStatus } from '@/hooks/useEvents';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Spinner from '@/components/ui/Spinner';
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

  // Filtrar por búsqueda
  const events = eventsData?.events.filter((event) =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDelete = async () => {
    if (!eventToDelete) return;

    try {
      await deleteMutation.mutateAsync(eventToDelete.id);
      toast.success(`Evento "${eventToDelete.title}" eliminado correctamente`);
      setEventToDelete(null);
    } catch {
      toast.error('Error al eliminar el evento');
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

  const getStatusBadge = (status: string) => {
    const config = {
      active: { variant: 'success' as const, label: 'Activo' },
      completed: { variant: 'info' as const, label: 'Completado' },
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Eventos</h1>
          <p className="text-secondary mt-1">Administra todos los eventos del sistema</p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="w-5 h-5" />}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Estado
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-base"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="completed">Completados</option>
                  <option value="cancelled">Cancelados</option>
                </select>
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
      </div>

      {/* Table */}
      <Card>
        <CardContent padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead>Cupos</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
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
                          <p className="text-sm text-secondary">{event.location}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(event.date), "dd 'de' MMMM, yyyy", { locale: es })}
                      <p className="text-sm text-secondary">
                        {format(new Date(event.date), 'HH:mm')}
                      </p>
                    </TableCell>
                    <TableCell>{getModalityBadge(event.modality)}</TableCell>
                    <TableCell>
                      <span className={event.available_slots === 0 ? 'text-error font-medium' : ''}>
                        {event.available_slots} / {event.capacity}
                      </span>
                    </TableCell>
                    <TableCell>{event.duration} min</TableCell>
                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/events/${event.id}/attendance`)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/events/${event.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {event.status === 'active' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar evento"
        message={`¿Estás seguro de que deseas eliminar el evento "${eventToDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
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
