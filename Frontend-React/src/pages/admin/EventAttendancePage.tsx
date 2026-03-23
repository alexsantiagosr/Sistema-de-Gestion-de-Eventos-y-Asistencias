import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEvent } from '@/hooks/useEvents';
import { useEventEnrollments, useCheckIn, useCheckOut, useMarkAsUsed } from '@/hooks/useEnrollments';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import { enrollmentsApi } from '@/api/enrollments.api';

export default function EventAttendancePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scannedToken, setScannedToken] = useState('');

  const { data: eventData } = useEvent(id!);
  const { data: enrollmentsData, refetch } = useEventEnrollments(id!);

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const markAsUsedMutation = useMarkAsUsed();

  const event = eventData?.event;
  const enrollments = enrollmentsData?.enrollments || [];

  // Filtrar por búsqueda
  const filteredEnrollments = enrollments.filter((enrollment) =>
    enrollment.users?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enrollment.users?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas
  const stats = {
    total: enrollments.length,
    checkedIn: enrollments.filter(e => e.check_in).length,
    checkedOut: enrollments.filter(e => e.check_out).length,
    completed: enrollments.filter(e => e.status === 'used').length,
  };

  const handleScanQR = async () => {
    if (!scannedToken) {
      toast.error('Ingresa el código QR');
      return;
    }

    try {
      const response = await enrollmentsApi.validateQR(scannedToken);

      if (response.valid && response.enrollment) {
        // Marcar asistencia completa automáticamente
        await markAsUsedMutation.mutateAsync(response.enrollment.id);
        toast.success(`Asistencia registrada para ${response.enrollment.user.name}`);
        setScannedToken('');
        setQrModalOpen(false);
        refetch();
      }
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || 'QR inválido');
      } else {
        toast.error('QR inválido o no encontrado');
      }
    }
  };

  const handleCheckIn = async (enrollmentId: string, userName: string) => {
    try {
      await checkInMutation.mutateAsync(enrollmentId);
      toast.success(`Check-in registrado para ${userName}`);
      refetch();
    } catch {
      toast.error('Error al registrar check-in');
    }
  };

  const handleCheckOut = async (enrollmentId: string, userName: string) => {
    try {
      await checkOutMutation.mutateAsync(enrollmentId);
      toast.success(`Check-out registrado para ${userName}`);
      refetch();
    } catch {
      toast.error('Error al registrar check-out');
    }
  };

  const handleMarkAsUsed = async (enrollmentId: string, userName: string) => {
    try {
      await markAsUsedMutation.mutateAsync(enrollmentId);
      toast.success(`Asistencia completada para ${userName}`);
      refetch();
    } catch {
      toast.error('Error al marcar asistencia');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nombre', 'Email', 'Estado', 'Check-in', 'Check-out', 'Asistencia %'];
    const rows = enrollments.map(e => {
      const duration = e.check_in && e.check_out
        ? Math.round((new Date(e.check_out).getTime() - new Date(e.check_in).getTime()) / 1000 / 60)
        : 0;
      const percentage = event?.duration ? Math.min(100, Math.round((duration / event.duration) * 100)) : 0;

      return [
        e.users?.name || '',
        e.users?.email || '',
        e.status,
        e.check_in ? format(new Date(e.check_in), 'HH:mm') : '',
        e.check_out ? format(new Date(e.check_out), 'HH:mm') : '',
        `${percentage}%`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asistencia-${event?.title.replace(/[^a-z0-9]/gi, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Lista exportada correctamente');
  };

  if (!event || !enrollmentsData) {
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
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/events')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Control de Asistencias</h1>
            <p className="text-secondary">{event.title}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => setQrModalOpen(true)}>
            <QrCode className="w-4 h-4 mr-2" />
            Escanear QR
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-secondary">Total Inscritos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-secondary">Check-in</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.checkedIn}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-secondary">Check-out</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.checkedOut}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-secondary">Completados</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información del Evento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-secondary">Fecha</p>
              <p className="font-medium text-gray-900">
                {format(new Date(event.date), "dd 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-sm text-secondary">Duración</p>
              <p className="font-medium text-gray-900">{event.duration} minutos</p>
            </div>
            <div>
              <p className="text-sm text-secondary">Asistencia mínima</p>
              <p className="font-medium text-gray-900">{event.min_attendance_percentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="mb-6">
        <CardContent>
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Enrollments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Asistentes ({filteredEnrollments.length})</CardTitle>
        </CardHeader>
        <CardContent padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Participante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Check-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Check-out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Asistencia
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                      No hay participantes registrados
                    </td>
                  </tr>
                ) : (
                  filteredEnrollments.map((enrollment) => {
                    const duration = enrollment.check_in && enrollment.check_out
                      ? Math.round((new Date(enrollment.check_out).getTime() - new Date(enrollment.check_in).getTime()) / 1000 / 60)
                      : 0;
                    const percentage = event.duration ? Math.min(100, Math.round((duration / event.duration) * 100)) : 0;
                    const isEligible = percentage >= event.min_attendance_percentage;

                    return (
                      <tr key={enrollment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{enrollment.users?.name}</p>
                            <p className="text-sm text-secondary">{enrollment.users?.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              enrollment.status === 'used'
                                ? 'success'
                                : enrollment.status === 'active'
                                  ? 'info'
                                  : 'error'
                            }
                          >
                            {enrollment.status === 'used'
                              ? 'Completado'
                              : enrollment.status === 'active'
                                ? 'Activo'
                                : 'Cancelado'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {enrollment.check_in ? (
                            <span className="text-success">
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              {format(new Date(enrollment.check_in), 'HH:mm')}
                            </span>
                          ) : (
                            <span className="text-secondary">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {enrollment.check_out ? (
                            <span className="text-purple-600">
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              {format(new Date(enrollment.check_out), 'HH:mm')}
                            </span>
                          ) : (
                            <span className="text-secondary">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span
                              className={`font-medium ${isEligible ? 'text-success' : 'text-error'
                                }`}
                            >
                              {percentage}%
                            </span>
                            {isEligible && (
                              <CheckCircle className="w-4 h-4 text-success ml-2" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {enrollment.status === 'active' && !enrollment.check_in && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  handleCheckIn(enrollment.id, enrollment.users?.name || '')
                                }
                              >
                                Check-in
                              </Button>
                            )}
                            {enrollment.check_in && !enrollment.check_out && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  handleCheckOut(enrollment.id, enrollment.users?.name || '')
                                }
                              >
                                Check-out
                              </Button>
                            )}
                            {enrollment.status === 'active' && enrollment.check_out && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  handleMarkAsUsed(enrollment.id, enrollment.users?.name || '')
                                }
                                isLoading={markAsUsedMutation.isPending}
                              >
                                Completar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* QR Scanner Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          setScannedToken('');
        }}
        title="Escanear Código QR"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Ingresa el token del código QR escaneado o escribe manualmente:
          </p>
          <Input
            placeholder="ENROLL-xxxx-xxxx-xxxx"
            value={scannedToken}
            onChange={(e) => setScannedToken(e.target.value)}
            icon={<QrCode className="w-5 h-5" />}
          />
          <div className="flex items-center justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setQrModalOpen(false);
                setScannedToken('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleScanQR} isLoading={checkInMutation.isPending}>
              Registrar Asistencia
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
