import { useSearchParams } from 'react-router-dom';
import { BarChart3, Users, CheckCircle, XCircle, Percent, RefreshCw } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useEventEnrollments } from '@/hooks/useEnrollments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import CustomSelect from '@/components/ui/CustomSelect';

export default function ReportsDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdParam = searchParams.get('eventId') || '';

  const { data: eventsData, isLoading: eventsLoading } = useEvents();
  const events = eventsData?.events || [];

  // Polling enabled if we have a selected event
  const {
    data: enrollmentsData,
    isLoading: enrollmentsLoading,
    isRefetching,
    refetch,
  } = useEventEnrollments(eventIdParam);

  const selectedEvent = events.find((e) => e.id === eventIdParam);
  const enrollments = enrollmentsData?.enrollments || [];
  
  // Filter active and completed (exclude cancelled for reporting stats)
  const validEnrollments = enrollments.filter((e) => e.status !== 'cancelled');

  // Calculations
  const totalEnrolled = validEnrollments.length;
  const checkedInCount = validEnrollments.filter((e) => e.check_in || e.session_start).length;
  const approvedCount = validEnrollments.filter((e) => e.isCertified).length;
  const notApprovedCount = totalEnrolled - approvedCount;
  
  const avgAttendance = totalEnrolled > 0
    ? Math.round(validEnrollments.reduce((acc, e) => acc + (e.percentage || 0), 0) / totalEnrolled)
    : 0;

  // Distribution calculations
  const ranges = {
    '0-25%': validEnrollments.filter(e => (e.percentage || 0) <= 25).length,
    '26-50%': validEnrollments.filter(e => (e.percentage || 0) > 25 && (e.percentage || 0) <= 50).length,
    '51-75%': validEnrollments.filter(e => (e.percentage || 0) > 50 && (e.percentage || 0) <= 75).length,
    '76-100%': validEnrollments.filter(e => (e.percentage || 0) > 75).length,
  };

  const handleEventChange = (value: string) => {
    if (value) {
      setSearchParams({ eventId: value });
    } else {
      setSearchParams({});
    }
  };

  // Build select options
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
            <BarChart3 className="w-6 h-6 text-primary" />
            Dashboard Comparativo
          </h1>
          <p className="text-secondary mt-1 text-sm sm:text-base">
            Inscritos vs Asistentes, estados de aprobación y asistencia en tiempo real.
          </p>
        </div>

        {/* Polling Indicator */}
        {eventIdParam && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100 text-xs text-secondary font-medium">
            <span className={`w-2 h-2 rounded-full ${isRefetching ? 'bg-primary animate-ping' : 'bg-green-500 animate-pulse'}`} />
            {isRefetching ? 'Actualizando...' : 'En tiempo real (10s)'}
            <button 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="ml-1 p-1 hover:bg-gray-150 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Select Event Filter Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="max-w-md">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Seleccionar Evento para Analizar
            </label>
            {eventsLoading ? (
              <Spinner size="sm" />
            ) : (
              <CustomSelect
                value={eventIdParam}
                onChange={handleEventChange}
                options={[{ value: '', label: 'Seleccione un evento...' }, ...eventOptions]}
                placeholder="Elige un evento para ver las estadísticas"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {!eventIdParam ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Ningún evento seleccionado</h3>
          <p className="text-secondary max-w-sm mx-auto text-sm">
            Por favor selecciona un evento de la lista superior para visualizar el análisis comparativo detallado de sus asistentes.
          </p>
        </div>
      ) : enrollmentsLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Stats Summary Widgets */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <Card className="hover:scale-[1.01] transition-transform duration-200">
              <CardContent className="p-4 lg:p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Inscritos Totales</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{totalEnrolled}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Users className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:scale-[1.01] transition-transform duration-200">
              <CardContent className="p-4 lg:p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Asistieron</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-primary mt-2">{checkedInCount}</p>
                </div>
                <div className="p-3 bg-primary-50 text-primary rounded-2xl">
                  <Percent className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:scale-[1.01] transition-transform duration-200">
              <CardContent className="p-4 lg:p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Aprobados</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-success mt-2">{approvedCount}</p>
                </div>
                <div className="p-3 bg-green-50 text-success rounded-2xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:scale-[1.01] transition-transform duration-200">
              <CardContent className="p-4 lg:p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider">No Aprobados</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-error mt-2">{notApprovedCount}</p>
                </div>
                <div className="p-3 bg-red-50 text-error rounded-2xl">
                  <XCircle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Doughnut Chart: Aprobados vs No Aprobados */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Estado de Certificación y Aprobación</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center justify-around gap-6 py-6">
                {totalEnrolled === 0 ? (
                  <p className="text-secondary text-sm">No hay datos suficientes</p>
                ) : (
                  <>
                    {/* SVG Doughnut */}
                    <div className="relative w-44 h-44 flex-shrink-0">
                      <svg width="176" height="176" viewBox="0 0 36 36" className="transform -rotate-90">
                        {/* Background Ring */}
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="3" />
                        
                        {/* Approved Segment */}
                        <circle
                          cx="18" cy="18" r="15.915"
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="3.2"
                          strokeDasharray={`${(approvedCount / totalEnrolled) * 100} ${100 - (approvedCount / totalEnrolled) * 100}`}
                          strokeDashoffset="0"
                          className="transition-all duration-500 ease-out"
                        />

                        {/* Not Approved Segment */}
                        <circle
                          cx="18" cy="18" r="15.915"
                          fill="transparent"
                          stroke="#ef4444"
                          strokeWidth="3.2"
                          strokeDasharray={`${(notApprovedCount / totalEnrolled) * 100} ${100 - (notApprovedCount / totalEnrolled) * 100}`}
                          strokeDashoffset={`${-((approvedCount / totalEnrolled) * 100)}`}
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      {/* Inner percentage */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-gray-900">
                          {totalEnrolled > 0 ? Math.round((approvedCount / totalEnrolled) * 100) : 0}%
                        </span>
                        <span className="text-[10px] uppercase font-bold text-secondary">Aprobados</span>
                      </div>
                    </div>

                    {/* Legends */}
                    <div className="space-y-4 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded-md bg-success flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">Aprobados ({approvedCount})</p>
                          <p className="text-xs text-secondary">
                            Superaron el {selectedEvent?.min_attendance_percentage}% de asistencia requerida.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded-md bg-error flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">No Aprobados ({notApprovedCount})</p>
                          <p className="text-xs text-secondary">
                            No alcanzaron el porcentaje mínimo exigido.
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 pt-3 mt-1 flex justify-between text-xs text-secondary font-medium">
                        <span>Asistencia Promedio:</span>
                        <span className="font-bold text-gray-900">{avgAttendance}%</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart: COMPARATIVO */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Comparativo de Embudo de Participación</CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                {totalEnrolled === 0 ? (
                  <p className="text-secondary text-sm text-center">Sin datos de inscripciones</p>
                ) : (
                  <div className="space-y-5">
                    {/* Row 1: Inscritos */}
                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-2">
                        <span className="text-gray-700">Total Inscritos</span>
                        <span className="text-gray-900">{totalEnrolled} estudiantes (100%)</span>
                      </div>
                      <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000 flex items-center justify-end pr-3 text-[11px] font-bold text-white"
                          style={{ width: '100%' }}
                        >
                          100%
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Asistieron (Check-in) */}
                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-2">
                        <span className="text-gray-700">Asistentes Reales (Check-in)</span>
                        <span className="text-gray-900">
                          {checkedInCount} de {totalEnrolled} ({totalEnrolled > 0 ? Math.round((checkedInCount / totalEnrolled) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-1000 flex items-center justify-end pr-3 text-[11px] font-bold text-white min-w-[2.5rem]"
                          style={{ width: `${totalEnrolled > 0 ? (checkedInCount / totalEnrolled) * 100 : 0}%` }}
                        >
                          {totalEnrolled > 0 ? Math.round((checkedInCount / totalEnrolled) * 100) : 0}%
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Aprobados (Certificados) */}
                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-2">
                        <span className="text-gray-700">Aprobados Certificados</span>
                        <span className="text-gray-900">
                          {approvedCount} de {totalEnrolled} ({totalEnrolled > 0 ? Math.round((approvedCount / totalEnrolled) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success rounded-full transition-all duration-1000 flex items-center justify-end pr-3 text-[11px] font-bold text-white min-w-[2.5rem]"
                          style={{ width: `${totalEnrolled > 0 ? (approvedCount / totalEnrolled) * 100 : 0}%` }}
                        >
                          {totalEnrolled > 0 ? Math.round((approvedCount / totalEnrolled) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Distribución de Rangos de Asistencia</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-6">
              {totalEnrolled === 0 ? (
                <p className="text-secondary text-sm text-center">Sin datos de asistencia</p>
              ) : (
                <div>
                  <div className="flex items-end justify-around h-48 border-b border-gray-200 pb-2">
                    {Object.entries(ranges).map(([range, count]) => {
                      const percentage = totalEnrolled > 0 ? Math.round((count / totalEnrolled) * 100) : 0;
                      return (
                        <div key={range} className="flex flex-col items-center w-full max-w-[80px]">
                          {/* Label count */}
                          <span className="text-xs font-bold text-gray-900 mb-1">{count}</span>
                          
                          {/* Bar */}
                          <div 
                            className="w-full bg-primary-100 hover:bg-primary-300 transition-all duration-300 rounded-t-lg relative group cursor-pointer"
                            style={{ height: `${Math.max(4, percentage * 1.4)}px` }}
                          >
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap shadow">
                              {percentage}% de estudiantes
                            </div>
                          </div>

                          {/* Range Label */}
                          <span className="text-[11px] font-medium text-secondary mt-2">{range}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-xs text-secondary font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-100" />
                      Porcentaje de asistencia alcanzado por los estudiantes
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
