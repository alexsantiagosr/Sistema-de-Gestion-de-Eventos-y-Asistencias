import { useState } from 'react';
import { Calendar, Clock, MapPin, QrCode, Download, XCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMyEnrollments, useCancelEnrollment } from '@/hooks/useEnrollments';
import { useDownloadCertificate } from '@/hooks/useCertificates';
import { toast } from 'sonner';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Spinner from '@/components/ui/Spinner';
import { qrApi } from '@/api/qr.api';
import { certificatesApi } from '@/api/certificates.api';

export default function MyEnrollmentsPage() {
  const [selectedEnrollment, setSelectedEnrollment] = useState<{
    id: string;
    qrDataUrl?: string;
  } | null>(null);
  const [enrollmentToCancel, setEnrollmentToCancel] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const { data: enrollmentsData, isLoading, refetch } = useMyEnrollments();
  const cancelMutation = useCancelEnrollment();
  const downloadCertMutation = useDownloadCertificate();

  const enrollments = enrollmentsData?.enrollments || [];

  const handleViewQR = async (enrollmentId: string) => {
    try {
      const response = await qrApi.getQR(enrollmentId);
      setSelectedEnrollment({
        id: enrollmentId,
        qrDataUrl: response.qr.qrDataUrl,
      });
    } catch {
      toast.error('Error al cargar el QR');
    }
  };

  const handleDownloadQR = async (enrollmentId: string) => {
    try {
      const blob = await qrApi.downloadQR(enrollmentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-inscripcion-${enrollmentId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('QR descargado correctamente');
    } catch {
      toast.error('Error al descargar el QR');
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

  const handleDownloadCertificate = async (eventId: string) => {
    try {
      const blob = await certificatesApi.download(eventId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificado-${eventId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Certificado descargado correctamente');
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || 'No eres elegible para el certificado aún');
      } else {
        toast.error('Error al descargar el certificado');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { variant: 'success' as const, label: 'Activa' },
      used: { variant: 'info' as const, label: 'Completada' },
      cancelled: { variant: 'error' as const, label: 'Cancelada' },
    };
    const { variant, label } = config[status as keyof typeof config] || config.active;
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
        <h1 className="text-2xl font-bold text-gray-900">Mis Inscripciones</h1>
        <p className="text-secondary mt-1">Gestiona tus inscripciones a eventos</p>
      </div>

      {/* Enrollments List */}
      {enrollments.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardContent>
                <div className="flex items-start justify-between">
                  {/* Event Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {enrollment.events?.title}
                      </h3>
                      {getStatusBadge(enrollment.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm text-secondary">
                        <Calendar className="w-4 h-4 mr-2" />
                        {format(
                          new Date(enrollment.events?.date || ''),
                          "dd 'de' MMMM, yyyy",
                          { locale: es }
                        )}
                      </div>
                      <div className="flex items-center text-sm text-secondary">
                        <Clock className="w-4 h-4 mr-2" />
                        {enrollment.events?.duration} minutos
                      </div>
                      {enrollment.events?.location && (
                        <div className="flex items-center text-sm text-secondary">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="line-clamp-1">{enrollment.events.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Attendance Info */}
                    {(enrollment.check_in || enrollment.check_out) && (
                      <div className="p-3 bg-gray-50 rounded-lg mb-4">
                        <div className="flex items-center space-x-4 text-sm">
                          {enrollment.check_in && (
                            <span className="text-success">
                              ✓ Check-in: {format(new Date(enrollment.check_in), 'HH:mm')}
                            </span>
                          )}
                          {enrollment.check_out && (
                            <span className="text-success">
                              ✓ Check-out: {format(new Date(enrollment.check_out), 'HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    {enrollment.status === 'active' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewQR(enrollment.id)}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Ver QR
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownloadQR(enrollment.id)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
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
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </>
                    )}
                    {enrollment.status === 'used' && enrollment.events && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownloadCertificate(enrollment.event_id)}
                        isLoading={downloadCertMutation.isPending}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Descargar Certificado
                      </Button>
                    )}
                    {enrollment.status === 'cancelled' && (
                      <Badge variant="error">Cancelada</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Modal */}
      <Modal
        isOpen={!!selectedEnrollment}
        onClose={() => setSelectedEnrollment(null)}
        title="Código QR de Inscripción"
        size="md"
      >
        <div className="text-center">
          {selectedEnrollment?.qrDataUrl && (
            <>
              <img
                src={selectedEnrollment.qrDataUrl}
                alt="QR de inscripción"
                className="mx-auto mb-4 rounded-lg"
              />
              <p className="text-sm text-secondary mb-4">
                Muestra este código QR en el evento para registrar tu asistencia
              </p>
              <div className="flex items-center justify-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={() =>
                    selectedEnrollment && handleDownloadQR(selectedEnrollment.id)
                  }
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
                <Button onClick={() => setSelectedEnrollment(null)}>
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

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
