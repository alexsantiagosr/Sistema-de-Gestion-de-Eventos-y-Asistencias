import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle, XCircle, Percent, Download, Save, Settings } from 'lucide-react';
import { useEvents, useEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useEventEnrollments } from '@/hooks/useEnrollments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import CustomSelect from '@/components/ui/CustomSelect';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { toast } from 'sonner';

export default function AttendanceControlPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdParam = searchParams.get('eventId') || '';

  // Get list of events for the select dropdown
  const { data: eventsData, isLoading: eventsLoading } = useEvents();
  const events = eventsData?.events || [];

  // Get details of the selected event
  const { data: eventDetailData, isLoading: eventDetailLoading, refetch: refetchEvent } = useEvent(eventIdParam);
  const selectedEvent = eventDetailData?.event;

  // Get enrollments for the selected event
  const {
    data: enrollmentsData,
    isLoading: enrollmentsLoading,
    refetch: refetchEnrollments,
    isRefetching
  } = useEventEnrollments(eventIdParam);

  const enrollments = enrollmentsData?.enrollments || [];
  
  // Filter active and completed (exclude cancelled)
  const validEnrollments = enrollments.filter((e) => e.status !== 'cancelled');

  // Mutation to update event configuration
  const updateEventMutation = useUpdateEvent();

  // Local configuration states for in-memory recalculation
  const [localMinPercentage, setLocalMinPercentage] = useState<number>(80);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Sync local state when event details load
  useEffect(() => {
    if (selectedEvent) {
      setLocalMinPercentage(selectedEvent.min_attendance_percentage);
      setIsDirty(false);
    }
  }, [selectedEvent]);

  const handleEventChange = (value: string) => {
    if (value) {
      setSearchParams({ eventId: value });
    } else {
      setSearchParams({});
    }
  };

  const handleSliderChange = (val: number) => {
    setLocalMinPercentage(val);
    setIsDirty(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedEvent) return;

    try {
      await updateEventMutation.mutateAsync({
        id: selectedEvent.id,
        data: {
          min_attendance_percentage: localMinPercentage,
        },
      });
      toast.success('Configuración de asistencia guardada correctamente');
      setIsDirty(false);
      refetchEvent();
      refetchEnrollments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar la configuración');
    }
  };

  // Perform in-memory calculations for the live display
  const duration = selectedEvent?.duration || 60;
  
  const computedStudents = validEnrollments.map((e) => {
    const activeMinutes = (e.active_seconds || 0) / 60;
    const percentage = Math.min(100, Math.round((activeMinutes / duration) * 100));
    const isCertified = percentage >= localMinPercentage;
    return {
      ...e,
      percentage,
      isCertified,
      activeMinutes: Math.round(activeMinutes),
    };
  });

  const totalStudents = computedStudents.length;
  const certifiedCount = computedStudents.filter((s) => s.isCertified).length;
  const uncertifiedCount = totalStudents - certifiedCount;
  
  const avgAttendance = totalStudents > 0
    ? Math.round(computedStudents.reduce((acc, s) => acc + s.percentage, 0) / totalStudents)
    : 0;

  const handleExportCSV = () => {
    if (!selectedEvent) return;
    
    const headers = ['Nombre', 'Email', 'Check-in', 'Check-out', 'Minutos Activos', 'Duración Evento (min)', 'Asistencia %', 'Mínimo Requerido %', 'Estado Certificación'];
    
    const rows = computedStudents.map((s) => [
      s.users?.name || '',
      s.users?.email || '',
      s.session_start ? new Date(s.session_start).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '',
      s.session_end ? new Date(s.session_end).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '',
      s.activeMinutes.toString(),
      duration.toString(),
      `${s.percentage}%`,
      `${localMinPercentage}%`,
      s.isCertified ? 'Certificado' : 'No certificado'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `control-asistencia-${selectedEvent.title.replace(/[^a-z0-9]/gi, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Asistencia exportada en CSV correctamente');
  };

  // Build options for selector
  const eventOptions = events.map((e) => ({
    value: e.id,
    label: `${e.title} (${e.status === 'active' ? 'Activo' : e.status === 'finished' ? 'Finalizado' : 'Cancelado'})`,
  }));

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-success" />
            Configuración y Control de Asistencia
          </h1>
          <p className="text-secondary mt-1 text-sm sm:text-base">
            Configura el porcentaje de aprobación y visualiza el progreso de estudiantes con recálculo dinámico.
          </p>
        </div>

        {eventIdParam && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100 text-xs text-secondary font-medium">
            <span className={`w-2 h-2 rounded-full ${isRefetching ? 'bg-primary animate-ping' : 'bg-green-500 animate-pulse'}`} />
            Sincronizado
          </div>
        )}
      </div>

      {/* Selector Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="max-w-md">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Seleccionar Evento
            </label>
            {eventsLoading ? (
              <Spinner size="sm" />
            ) : (
              <CustomSelect
                value={eventIdParam}
                onChange={handleEventChange}
                options={[{ value: '', label: 'Seleccione un evento...' }, ...eventOptions]}
                placeholder="Elige un evento para configurar"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {!eventIdParam ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Ningún evento seleccionado</h3>
          <p className="text-secondary max-w-sm mx-auto text-sm">
            Selecciona un evento para administrar su porcentaje de asistencia, recalcular las aprobaciones y exportar resultados.
          </p>
        </div>
      ) : eventDetailLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : !selectedEvent ? (
        <div className="bg-red-50 text-error p-6 rounded-2xl border border-red-200">
          No se encontró la información del evento seleccionado.
        </div>
      ) : (
        <>
          {/* Main Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Control Panel Card */}
            <Card className="lg:col-span-1 h-fit">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base sm:text-lg">Configuración de Asistencia</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Event info summary */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-secondary font-medium">Modalidad:</span>
                    <span className="font-bold capitalize">{selectedEvent.modality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary font-medium">Duración total:</span>
                    <span className="font-bold">{selectedEvent.duration} minutos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary font-medium">Capacidad:</span>
                    <span className="font-bold">{selectedEvent.capacity} alumnos</span>
                  </div>
                </div>

                {/* Percentage Slider (Dynamic Recalculation) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-800">
                      Asistencia mínima requerida
                    </label>
                    <span className="bg-primary/10 text-primary text-sm font-extrabold px-3 py-1 rounded-lg">
                      {localMinPercentage}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={localMinPercentage}
                    onChange={(e) => handleSliderChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  
                  <p className="text-xs text-secondary leading-relaxed">
                    Mueve la barra para previsualizar los cambios instantáneamente en la tabla de alumnos.
                  </p>
                </div>

                {/* Save and Actions */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleSaveConfig}
                    className="w-full flex items-center justify-center gap-2"
                    disabled={!isDirty || updateEventMutation.isPending}
                  >
                    <Save className="w-4 h-4" />
                    {updateEventMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={handleExportCSV}
                    className="w-full flex items-center justify-center gap-2"
                    disabled={totalStudents === 0}
                  >
                    <Download className="w-4 h-4" />
                    Exportar Asistencia CSV
                  </Button>
                </div>

                {isDirty && (
                  <div className="bg-amber-50 text-amber-800 text-xs border border-amber-250 p-3 rounded-xl leading-relaxed">
                    ⚠️ Tienes cambios locales sin guardar. Los resultados mostrados y el archivo CSV exportado reflejan tu selección actual, pero debes guardar para aplicarlos oficialmente a los certificados.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* In-Memory Stats & Student Table */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Dynamic Recalculated Stats widgets */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-green-50/50 border-green-100">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
                    <p className="text-xs font-semibold text-green-700">Aprobados</p>
                    <p className="text-xl sm:text-2xl font-black text-green-950 mt-1">{certifiedCount}</p>
                  </CardContent>
                </Card>

                <Card className="bg-red-50/50 border-red-100">
                  <CardContent className="p-4 text-center">
                    <XCircle className="w-5 h-5 text-error mx-auto mb-1" />
                    <p className="text-xs font-semibold text-red-700">No Aprobados</p>
                    <p className="text-xl sm:text-2xl font-black text-red-950 mt-1">{uncertifiedCount}</p>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50/50 border-blue-100">
                  <CardContent className="p-4 text-center">
                    <Percent className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-blue-700">Asist. Promedio</p>
                    <p className="text-xl sm:text-2xl font-black text-blue-950 mt-1">{avgAttendance}%</p>
                  </CardContent>
                </Card>
              </div>

              {/* Student Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base sm:text-lg">Progreso y Certificación de Alumnos</CardTitle>
                  <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {totalStudents} alumnos inscritos
                  </span>
                </CardHeader>
                <CardContent padding="none">
                  {enrollmentsLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Spinner size="md" />
                    </div>
                  ) : computedStudents.length === 0 ? (
                    <div className="py-12 text-center text-secondary text-sm">
                      No hay estudiantes registrados en este evento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Estudiante</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Tiempos</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Asistencia</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-150">
                          {computedStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-gray-50/70 transition-colors">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{student.users?.name}</p>
                                  <p className="text-xs text-secondary">{student.users?.email}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-600">
                                <div className="space-y-1">
                                  <div>
                                    <span className="font-semibold text-gray-400">Entrada:</span>{' '}
                                    {student.session_start
                                      ? new Date(student.session_start).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })
                                      : '-'}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-400">Salida:</span>{' '}
                                    {student.session_end
                                      ? new Date(student.session_end).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })
                                      : student.session_start ? 'En sala / Activa' : '-'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1 max-w-[120px]">
                                  <div className="flex justify-between text-xs font-bold text-gray-900">
                                    <span>{student.percentage}%</span>
                                    <span className="text-secondary">{student.activeMinutes} / {duration} min</span>
                                  </div>
                                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${student.isCertified ? 'bg-success' : 'bg-primary/50'}`}
                                      style={{ width: `${student.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant={student.isCertified ? 'success' : 'error'}>
                                  {student.isCertified ? 'Certificado' : 'No certificado'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
