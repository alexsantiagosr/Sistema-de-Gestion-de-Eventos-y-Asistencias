import { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  XCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useMyEnrollments, useCancelEnrollment } from '@/hooks/useEnrollments';
import { toast } from 'sonner';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import QRModal from '@/components/ui/QRModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import VirtualRoomAccessButton from '@/components/student/VirtualRoomAccessButton';
import Spinner from '@/components/ui/Spinner';
import { qrApi } from '@/api/qr.api';
import { useAuth } from '@/context/AuthContext';

export default function MyEnrollmentsPage() {
  const [selectedEnrollment, setSelectedEnrollment] = useState<{
    id: string;
    qrDataUrl?: string;
    qrToken?: string;
    eventTitle?: string;
  } | null>(null);
  const [enrollmentToCancel, setEnrollmentToCancel] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const { data: enrollmentsData, isLoading, refetch } = useMyEnrollments();
  const cancelMutation = useCancelEnrollment();
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso denegado</h3>
          <p className="text-secondary">Solo los estudiantes pueden acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  const enrollments = enrollmentsData?.enrollments || [];

  const handleViewQR = async (enrollmentId: string) => {
    try {
      const response = await qrApi.getQR(enrollmentId);
      setSelectedEnrollment({
        id: enrollmentId,
        qrDataUrl: response.qr.qrDataUrl,
        qrToken: response.qr.qrToken,
        eventTitle: response.qr.event.title,
      });
    } catch {
      toast.error('Error al cargar el QR');
    }
  };

  const handleCancelEnrollment = async () => {
    if (!enrollmentToCancel) return;

    try {
      await cancelMutation.mutateAsync(enrollmentToCancel.id);
      toast.success('Inscripción cancelada correctamente');
      setEnrollmentToCancel(null);
      refetch();
    } catch {
      toast.error('Error al cancelar la inscripción');
    }
  };

  const getStatusBadge = (enrollment: any) => {
    if (enrollment.status === 'cancelled') {
       return <Badge variant="error">Cancelada</Badge>;
    } 
    
    const event = enrollment.events;
    if (event && (event.status === 'finished' || event.status === 'completed' || enrollment.status === 'completed')) {
       // Usar isCertified del backend (misma fórmula que admin)
       if (enrollment.isCertified) {
         return <Badge variant="success">Certificado</Badge>;
       } else {
         return <Badge variant="error">No certificado</Badge>;
       }
    }

    // Evento activo o próximo
    const now = Date.now();
    if (event?.status === 'cancelled') {
      return <Badge variant="error">Cancelado</Badge>;
    } else if (now < new Date(event?.date || '').getTime()) {
      return <Badge variant="info">Próximo</Badge>;
    } else {
      return <Badge variant="success">En vivo</Badge>;
    }
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
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mis Inscripciones</h1>
        <p className="text-secondary mt-1 text-sm sm:text-base">Gestiona tus inscripciones a eventos</p>
      </div>

      {/* Enrollments List */}
      {enrollments.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes inscripciones
              </h3>
              <p className="text-secondary mb-4">
                Explora los eventos disponibles e inscríbete
              </p>
              <a href="/events">
                <Button>Ver eventos disponibles</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {enrollments.map((enrollment) => {
            const isActive = enrollment.events?.status === 'active';

            return (
            <Card key={enrollment.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Event Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        {enrollment.events?.title}
                      </h3>
                      {getStatusBadge(enrollment)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                      <div className="flex items-center text-xs sm:text-sm text-secondary">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(enrollment.events?.date || '').toLocaleString('es-CO', {
                          timeZone: 'America/Bogota',
                          dateStyle: 'long',
                          timeStyle: 'short'
                        })}
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-secondary">
                        <Clock className="w-4 h-4 mr-2" />
                        {enrollment.events?.duration} minutos
                      </div>
                      {enrollment.events?.location && (
                        <div className="flex items-center text-xs sm:text-sm text-secondary">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="line-clamp-1">{enrollment.events.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Attendance Info */}
                    {(enrollment.session_start || enrollment.session_end) && (
                      <div className="p-3 bg-gray-50 rounded-lg mb-4">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                          {enrollment.session_start && (
                            <span className="text-success flex items-center">
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              Check-in: {new Date(enrollment.session_start).toLocaleString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {enrollment.session_end && (
                            <span className="text-success flex items-center">
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              Check-out: {new Date(enrollment.session_end).toLocaleString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap sm:flex-col gap-2 ml-0 sm:ml-4">
                    {enrollment.status === 'active' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewQR(enrollment.id)}
                          className="flex-1 sm:flex-none"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Ver QR
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            setEnrollmentToCancel({
                              id: enrollment.id,
                              title: enrollment.events?.title || '',
                            })
                          }
                          className="flex-1 sm:flex-none"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                        {isActive && (
                          <VirtualRoomAccessButton
                            event={{
                              id: enrollment.event_id,
                              modality: enrollment.events?.modality ?? 'virtual',
                              location: enrollment.events?.location || ''
                            }}
                            className="flex-1 sm:flex-none"
                          />
                        )}
                      </>
                    )}
                    
                    {enrollment.status === 'cancelled' && (
                      <Badge variant="error">Cancelada</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      {/* QR Modal */}
      <QRModal
        isOpen={!!selectedEnrollment}
        onClose={() => setSelectedEnrollment(null)}
        qrDataUrl={selectedEnrollment?.qrDataUrl}
        qrToken={selectedEnrollment?.qrToken}
        eventTitle={selectedEnrollment?.eventTitle}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={!!enrollmentToCancel}
        onClose={() => setEnrollmentToCancel(null)}
        onConfirm={handleCancelEnrollment}
        title="Cancelar inscripción"
        message={`¿Estás seguro de que deseas cancelar tu inscripción a "${enrollmentToCancel?.title}"? Esta acción liberará tu cupo para otro participante.`}
        confirmText="Sí, cancelar"
        cancelText="No cancelar"
        variant="warning"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
