import { FileText, Download, CheckCircle, XCircle } from 'lucide-react';
import { useMyCertificates } from '@/hooks/useCertificates';
import { toast } from 'sonner';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { certificatesApi } from '@/api/certificates.api';

export default function CertificatesPage() {
  const { data: certificatesData, isLoading } = useMyCertificates();
  const certificates = certificatesData?.certificates || [];

  const handleDownloadCertificate = async (eventId: string, eventTitle: string) => {
    try {
      const blob = await certificatesApi.download(eventId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificado-${eventTitle.replace(/[^a-z0-9]/gi, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Certificado descargado correctamente');
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(
          apiError.response?.data?.message ||
          'No alcanzas el porcentaje mínimo de asistencia'
        );
      } else {
        toast.error('Error al descargar el certificado');
      }
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis Certificados</h1>
        <p className="text-secondary mt-1">
          Descarga tus certificados de asistencia a eventos
        </p>
      </div>

      {/* Certificates List */}
      {certificates.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes certificados disponibles
              </h3>
              <p className="text-secondary">
                Completa eventos con el porcentaje de asistencia requerido para obtener certificados
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <Card key={cert.enrollmentId}>
              <CardContent>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {cert.eventTitle}
                    </h3>
                    <p className="text-sm text-secondary">
                      {new Date(cert.eventDate).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {cert.eligible ? (
                    <Badge variant="success">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Elegible
                    </Badge>
                  ) : (
                    <Badge variant="error">
                      <XCircle className="w-3 h-3 mr-1" />
                      No elegible
                    </Badge>
                  )}
                </div>

                {/* Attendance Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-secondary">Asistencia</span>
                    <span
                      className={`font-medium ${cert.attendancePercentage >= cert.minRequired
                          ? 'text-success'
                          : 'text-error'
                        }`}
                    >
                      {cert.attendancePercentage}% / {cert.minRequired}% requerida
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${cert.attendancePercentage >= cert.minRequired
                          ? 'bg-success'
                          : 'bg-error'
                        }`}
                      style={{ width: `${Math.min(100, cert.attendancePercentage)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <Button
                  className="w-full"
                  disabled={!cert.canDownload}
                  onClick={() =>
                    handleDownloadCertificate(cert.eventId, cert.eventTitle)
                  }
                >
                  <Download className="w-4 h-4 mr-2" />
                  {cert.canDownload ? 'Descargar Certificado' : 'No disponible aún'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
