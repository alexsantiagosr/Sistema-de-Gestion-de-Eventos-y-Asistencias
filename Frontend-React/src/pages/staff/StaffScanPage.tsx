import { useState, useCallback, useRef } from 'react';
import {
  LogOut, Calendar, Users, CheckCircle, XCircle,
  Clock, MapPin, Camera, CameraOff, ChevronDown, ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { enrollmentsApi } from '@/api/enrollments.api';
import QRScanner from '@/components/ui/QRScanner';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Event } from '@/types';

// ─── tipos ───────────────────────────────────────────────────────────────────
type ScanResult = {
  type: 'success-in' | 'success-out' | 'warning' | 'error';
  title: string;
  detail: string;
  time?: string;
};

// ─── helper: color de modalidad (igual que EventsPage) ───────────────────────
function modalityGradient(modality: string) {
  if (modality === 'presencial') return 'from-orange-400 to-orange-600';
  if (modality === 'virtual')    return 'from-indigo-400 to-indigo-600';
  return 'from-cyan-400 to-cyan-600';
}
function modalityLabel(modality: string) {
  if (modality === 'presencial') return 'Presencial';
  if (modality === 'virtual')    return 'Virtual';
  return 'Híbrido';
}

export default function StaffScanPage() {
  const navigate   = useNavigate();
  const { user, logout } = useAuth();
  const { data: eventsData } = useEvents();

  // Eventos activos y en vivo (is_live o estado active con fecha pasada)
  const activeEvents: Event[] = (eventsData?.events ?? []).filter(
    e => e.status === 'active'
  );

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [cameraOn,      setCameraOn]      = useState(false);
  const [scanResult,    setScanResult]    = useState<ScanResult | null>(null);
  const [isProcessing,  setIsProcessing]  = useState(false);
  const [scanKey,       setScanKey]       = useState(0);
  const [enrollments,   setEnrollments]   = useState<any[]>([]);
  const [showList,      setShowList]      = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const hasScannedRef = useRef(false);

  // ── cargar lista de asistentes ────────────────────────────────────────────
  const loadEnrollments = async (eventId: string) => {
    setIsLoadingList(true);
    try {
      const data = await enrollmentsApi.getEventEnrollments(eventId);
      setEnrollments(data.enrollments || []);
    } catch {
      toast.error('No se pudo cargar la lista de asistentes');
    } finally {
      setIsLoadingList(false);
    }
  };

  const toggleList = async () => {
    if (!showList && selectedEvent) await loadEnrollments(selectedEvent.id);
    setShowList(v => !v);
  };

  // ── seleccionar evento ────────────────────────────────────────────────────
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setScanResult(null);
    setCameraOn(false);
    setScanKey(k => k + 1);
    setEnrollments([]);
    setShowList(false);
    hasScannedRef.current = false;
  };

  // ── toggle cámara ─────────────────────────────────────────────────────────
  const toggleCamera = () => {
    if (!selectedEvent) {
      toast.error('Selecciona un evento primero');
      return;
    }
    setCameraOn(v => !v);
    setScanResult(null);
    hasScannedRef.current = false;
    setScanKey(k => k + 1);
  };

  // ── procesar QR escaneado ─────────────────────────────────────────────────
  const handleScan = useCallback(async (qrToken: string) => {
    if (isProcessing || hasScannedRef.current || !selectedEvent) return;
    hasScannedRef.current = true;
    setIsProcessing(true);
    setScanResult(null);

    const now     = new Date();
    const timeStr = format(now, 'HH:mm:ss', { locale: es });

    try {
      // 1. Validar QR
      const qrData = await enrollmentsApi.validateQR(qrToken);
      if (!qrData.valid || !qrData.enrollment) {
        setScanResult({ type: 'error', title: '❌ QR inválido', detail: 'El código no corresponde a ninguna inscripción.', time: timeStr });
        return;
      }

      const enrollment = qrData.enrollment;

      // 2. Validar evento
      if (enrollment.event?.id !== selectedEvent.id) {
        setScanResult({
          type: 'error',
          title: '❌ Evento incorrecto',
          detail: `Este QR es del evento "${enrollment.event?.title ?? '?'}".`,
          time: timeStr,
        });
        return;
      }

      // 3. Validar estado
      if (enrollment.status === 'cancelled') {
        setScanResult({ type: 'error', title: '❌ Inscripción cancelada', detail: `${enrollment.user?.name} tiene la inscripción cancelada.`, time: timeStr });
        return;
      }

      // 4. Dispatch: check-in o check-out
      if (!enrollment.check_in) {
        // ── ENTRADA ──
        await enrollmentsApi.checkIn(enrollment.id);
        setScanResult({
          type: 'success-in',
          title: '✅ Entrada registrada',
          detail: `${enrollment.user?.name} ingresó correctamente.`,
          time: timeStr,
        });
        if (showList) loadEnrollments(selectedEvent.id);

      } else if (enrollment.check_in && !enrollment.check_out) {
        // ── SALIDA ──
        const checkInTime = new Date(enrollment.check_in);
        const diffMin     = Math.round((now.getTime() - checkInTime.getTime()) / 60000);
        const hours       = Math.floor(diffMin / 60);
        const mins        = diffMin % 60;
        const duration    = hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;

        await enrollmentsApi.checkOut(enrollment.id);
        setScanResult({
          type: 'success-out',
          title: '✅ Salida registrada',
          detail: `${enrollment.user?.name} salió. Permanencia: ${duration}.`,
          time: timeStr,
        });
        if (showList) loadEnrollments(selectedEvent.id);

      } else {
        // Ya tiene ambos registros
        setScanResult({
          type: 'warning',
          title: '⚠️ Ya registrado',
          detail: `${enrollment.user?.name} ya tiene entrada y salida registradas.`,
          time: timeStr,
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al procesar el QR';
      setScanResult({ type: 'error', title: '❌ Error', detail: msg, time: timeStr });
    } finally {
      setIsProcessing(false);
      // Reiniciar para siguiente escaneo después de 3.5 s
      setTimeout(() => {
        setScanResult(null);
        hasScannedRef.current = false;
        setScanKey(k => k + 1);
      }, 3500);
    }
  }, [isProcessing, selectedEvent, showList]);

  // ── logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-gray-900">📋 Control de Asistencia</h1>
          <p className="text-xs text-gray-500">{user?.name} · Personal de apoyo</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium">
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Selección de evento (cards con gradiente, sin <select>) ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Selecciona el evento activo
          </h2>

          {activeEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No hay eventos activos en este momento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeEvents.map(event => {
                const isSelected = selectedEvent?.id === event.id;
                return (
                  <button
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className={`w-full text-left rounded-2xl overflow-hidden shadow-sm border-2 transition-all ${
                      isSelected ? 'border-blue-500 shadow-blue-100 shadow-md' : 'border-transparent'
                    }`}
                  >
                    {/* Header con gradiente igual a EventsPage */}
                    <div className={`bg-gradient-to-br ${modalityGradient(event.modality)} px-4 py-3 flex items-center justify-between`}>
                      <h3 className="text-sm font-bold text-white line-clamp-1">{event.title}</h3>
                      <span className="text-xs bg-white/20 text-white rounded-full px-2 py-0.5 shrink-0 ml-2">
                        {modalityLabel(event.modality)}
                      </span>
                    </div>
                    {/* Detalles */}
                    <div className="bg-white px-4 py-3 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(event.date), "dd MMM · HH:mm", { locale: es })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {event.duration} min
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </span>
                      )}
                      {isSelected && (
                        <span className="ml-auto text-blue-600 font-semibold shrink-0">✓ Seleccionado</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Panel de escaneo ── */}
        {selectedEvent && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header del panel */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Escáner QR</p>
                <p className="text-xs text-gray-400">
                  {cameraOn ? 'Apunta la cámara al código QR del estudiante' : 'Activa la cámara para comenzar'}
                </p>
              </div>
              {/* Botón toggle cámara */}
              <button
                onClick={toggleCamera}
                disabled={isProcessing}
                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                  cameraOn
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {cameraOn
                  ? <><CameraOff className="w-4 h-4" /> Apagar</>
                  : <><Camera className="w-4 h-4" /> Encender</>
                }
              </button>
            </div>

            {/* Resultado del último escaneo */}
            {scanResult && (
              <div className={`mx-4 mt-3 rounded-xl p-3 border ${
                scanResult.type === 'success-in'  ? 'bg-green-50  border-green-200'  :
                scanResult.type === 'success-out' ? 'bg-purple-50 border-purple-200' :
                scanResult.type === 'warning'     ? 'bg-yellow-50 border-yellow-200' :
                                                    'bg-red-50    border-red-200'
              }`}>
                <p className={`font-semibold text-sm ${
                  scanResult.type === 'success-in'  ? 'text-green-800'  :
                  scanResult.type === 'success-out' ? 'text-purple-800' :
                  scanResult.type === 'warning'     ? 'text-yellow-800' : 'text-red-800'
                }`}>{scanResult.title}</p>
                <p className={`text-xs mt-0.5 ${
                  scanResult.type === 'success-in'  ? 'text-green-700'  :
                  scanResult.type === 'success-out' ? 'text-purple-700' :
                  scanResult.type === 'warning'     ? 'text-yellow-700' : 'text-red-700'
                }`}>{scanResult.detail}</p>
                {scanResult.time && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {scanResult.time}
                  </p>
                )}
              </div>
            )}

            {/* Escáner (solo si cámara encendida y no procesando) */}
            <div className="p-4">
              {isProcessing && (
                <div className="flex items-center justify-center py-10">
                  <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="ml-3 text-sm text-blue-600">Procesando…</span>
                </div>
              )}

              {cameraOn && !isProcessing && !scanResult && (
                <QRScanner
                  key={scanKey}
                  onScanSuccess={handleScan}
                  onScanError={() => {
                    setCameraOn(false);
                    toast.error('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
                  }}
                />
              )}

              {!cameraOn && !isProcessing && !scanResult && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <Camera className="w-12 h-12 mb-2" />
                  <p className="text-sm">Presiona "Encender" para activar la cámara</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Lista de asistentes ── */}
        {selectedEvent && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <button
              onClick={toggleList}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-700"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Lista de asistentes
                {enrollments.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs rounded-full px-2 py-0.5">
                    {enrollments.filter(e => e.check_in).length}/{enrollments.length}
                  </span>
                )}
              </span>
              {showList ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
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
                ) : enrollments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Sin inscripciones registradas</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {enrollments.map((en) => (
                      <li key={en.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{en.users?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{en.users?.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          {en.check_in ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <CheckCircle className="w-3 h-3" />
                              {format(new Date(en.check_in), 'HH:mm')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">Sin entrada</span>
                          )}
                          {en.check_out ? (
                            <span className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                              <XCircle className="w-3 h-3" />
                              {format(new Date(en.check_out), 'HH:mm')}
                            </span>
                          ) : en.check_in ? (
                            <span className="text-xs text-yellow-500 font-medium">En evento</span>
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
