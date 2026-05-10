import { useState, useCallback } from 'react';
import { LogOut, Calendar, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { enrollmentsApi } from '@/api/enrollments.api';
import QRScanner from '@/components/ui/QRScanner';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ScanResult = {
  type: 'success' | 'error' | 'warning';
  title: string;
  detail: string;
  studentName?: string;
  time?: string;
  action?: 'check-in' | 'check-out';
};

export default function StaffScanPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: eventsData } = useEvents({ status: 'active' });

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanKey, setScanKey] = useState(0); // fuerza remontado de QRScanner
  const [enrollmentsList, setEnrollmentsList] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const activeEvents = eventsData?.events?.filter(e => e.status === 'active') ?? [];
  const selectedEvent = activeEvents.find(e => e.id === selectedEventId);

  // ─── Carga lista de asistentes ───────────────────────────────────────────
  const loadEnrollments = async (eventId: string) => {
    setIsLoadingList(true);
    try {
      const data = await enrollmentsApi.getEventEnrollments(eventId);
      setEnrollmentsList(data.enrollments || []);
    } catch {
      toast.error('No se pudo cargar la lista de asistentes');
    } finally {
      setIsLoadingList(false);
    }
  };

  // ─── Manejo del escaneo QR ───────────────────────────────────────────────
  const handleScan = useCallback(async (qrToken: string) => {
    if (!selectedEventId) {
      setScanResult({
        type: 'error',
        title: 'Sin evento seleccionado',
        detail: 'Selecciona un evento activo antes de escanear.',
      });
      return;
    }
    if (isProcessing) return;

    setIsProcessing(true);
    setScanResult(null);

    try {
      // 1. Validar que el QR existe
      const qrData = await enrollmentsApi.validateQR(qrToken);

      if (!qrData.valid || !qrData.enrollment) {
        setScanResult({
          type: 'error',
          title: 'QR inválido',
          detail: 'El código QR no corresponde a ninguna inscripción.',
        });
        return;
      }

      const enrollment = qrData.enrollment;

      // 2. Validar que pertenece al evento seleccionado
      if (enrollment.event?.id !== selectedEventId) {
        setScanResult({
          type: 'error',
          title: 'Evento incorrecto',
          detail: `Este QR es del evento "${enrollment.event?.title}", no del evento seleccionado.`,
          studentName: enrollment.user?.name,
        });
        return;
      }

      // 3. Validar inscripción activa
      if (enrollment.status !== 'active' && enrollment.status !== 'completed') {
        setScanResult({
          type: 'error',
          title: 'Inscripción inválida',
          detail: `La inscripción de ${enrollment.user?.name} está ${enrollment.status === 'cancelled' ? 'cancelada' : 'inactiva'}.`,
          studentName: enrollment.user?.name,
        });
        return;
      }

      const now = new Date();
      const timeStr = format(now, "HH:mm:ss", { locale: es });

      // 4. Decidir si es check-in o check-out
      if (!enrollment.check_in) {
        // ── CHECK-IN ──
        await enrollmentsApi.checkIn(enrollment.id);
        setScanResult({
          type: 'success',
          title: '✅ Entrada registrada',
          detail: `Ingreso de ${enrollment.user?.name} registrado correctamente.`,
          studentName: enrollment.user?.name,
          time: timeStr,
          action: 'check-in',
        });
        if (showList) loadEnrollments(selectedEventId);
      } else if (enrollment.check_in && !enrollment.check_out) {
        // ── CHECK-OUT ──
        await enrollmentsApi.checkOut(enrollment.id);

        // Calcular tiempo de permanencia
        const checkInTime = new Date(enrollment.check_in);
        const diffMs = now.getTime() - checkInTime.getTime();
        const diffMin = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        const duration = hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;

        setScanResult({
          type: 'success',
          title: '✅ Salida registrada',
          detail: `Salida de ${enrollment.user?.name} registrada. Permanencia: ${duration}.`,
          studentName: enrollment.user?.name,
          time: timeStr,
          action: 'check-out',
        });
        if (showList) loadEnrollments(selectedEventId);
      } else {
        // Ya tiene check-in y check-out
        setScanResult({
          type: 'warning',
          title: '⚠️ Ya registrado',
          detail: `${enrollment.user?.name} ya tiene entrada y salida registradas para este evento.`,
          studentName: enrollment.user?.name,
        });
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Error al procesar el QR';
      setScanResult({
        type: 'error',
        title: 'Error al validar',
        detail: msg,
      });
    } finally {
      setIsProcessing(false);
      // Reiniciar escáner después de 3 segundos para el siguiente escaneo
      setTimeout(() => {
        setScanResult(null);
        setScanKey(k => k + 1);
      }, 3500);
    }
  }, [selectedEventId, isProcessing, showList]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setScanResult(null);
    setScanKey(k => k + 1);
    setEnrollmentsList([]);
    setShowList(false);
  };

  const toggleList = async () => {
    if (!showList && selectedEventId) {
      await loadEnrollments(selectedEventId);
    }
    setShowList(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-gray-900">📋 Control de Asistencia</h1>
          <p className="text-xs text-gray-500">{user?.name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Selector de evento ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Evento activo
          </label>
          <select
            value={selectedEventId}
            onChange={e => handleEventChange(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Selecciona un evento --</option>
            {activeEvents.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.title} — {format(new Date(ev.date), "dd/MM/yyyy HH:mm", { locale: es })}
              </option>
            ))}
          </select>

          {selectedEvent && (
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {selectedEvent.duration} min
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {selectedEvent.capacity - selectedEvent.available_slots}/{selectedEvent.capacity} inscritos
              </span>
            </div>
          )}
        </div>

        {/* ── Escáner QR ── */}
        {selectedEventId ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                {isProcessing ? '⏳ Procesando...' : '📷 Escanear código QR'}
              </h2>
              <p className="text-xs text-gray-400">
                Apunta la cámara al QR del estudiante para registrar su entrada o salida.
              </p>
            </div>

            {/* Resultado del escaneo */}
            {scanResult && (
              <div className={`mx-4 mb-3 rounded-xl p-3 border ${
                scanResult.type === 'success'
                  ? 'bg-green-50 border-green-200'
                  : scanResult.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
              }`}>
                <p className={`font-semibold text-sm ${
                  scanResult.type === 'success' ? 'text-green-800'
                    : scanResult.type === 'warning' ? 'text-yellow-800'
                      : 'text-red-800'
                }`}>
                  {scanResult.title}
                </p>
                <p className={`text-xs mt-0.5 ${
                  scanResult.type === 'success' ? 'text-green-700'
                    : scanResult.type === 'warning' ? 'text-yellow-700'
                      : 'text-red-700'
                }`}>
                  {scanResult.detail}
                </p>
                {scanResult.time && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {scanResult.time}
                  </p>
                )}
              </div>
            )}

            {/* El escáner se re-monta con key para reiniciar después de cada escaneo */}
            {!isProcessing && !scanResult && (
              <div className="px-4 pb-4">
                <QRScanner
                  key={scanKey}
                  onScanSuccess={handleScan}
                  onScanError={() => {
                    toast.error('No se pudo acceder a la cámara.');
                  }}
                />
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center py-10">
                <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">📸</div>
            <p className="text-sm text-gray-500">Selecciona un evento para comenzar a escanear</p>
          </div>
        )}

        {/* ── Lista de asistentes ── */}
        {selectedEventId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <button
              onClick={toggleList}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-700"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Lista de asistentes
              </span>
              <span className="text-gray-400 text-xs">{showList ? '▲ Ocultar' : '▼ Ver lista'}</span>
            </button>

            {showList && (
              <div className="border-t border-gray-100">
                {isLoadingList ? (
                  <div className="py-8 flex justify-center">
                    <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : enrollmentsList.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Sin asistentes registrados aún</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {enrollmentsList.map((en) => (
                      <li key={en.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{en.users?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{en.users?.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {en.check_in ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              {format(new Date(en.check_in), "HH:mm")}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">Sin entrada</span>
                          )}
                          {en.check_out ? (
                            <span className="flex items-center gap-1 text-xs text-purple-600">
                              <XCircle className="w-3 h-3" />
                              {format(new Date(en.check_out), "HH:mm")}
                            </span>
                          ) : en.check_in ? (
                            <span className="text-xs text-yellow-500">En evento</span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
