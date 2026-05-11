import { useState, useCallback, useRef } from 'react';
import {
  LogOut, Calendar, Users, CheckCircle, XCircle,
  Clock, MapPin, Camera, CameraOff, ChevronDown, ChevronUp,
  Search, ArrowRightLeft, Shield, Award, User, Zap
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
  type: 'enter' | 'exit' | 'warning' | 'error';
  title: string;
  detail: string;
  time?: string;
  userName?: string;
  durationStr?: string;
  activeSeconds?: number;
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function modalityGradient(m: string) {
  if (m === 'presencial') return 'from-amber-500 to-orange-600';
  if (m === 'virtual') return 'from-violet-500 to-indigo-600';
  return 'from-teal-400 to-cyan-600';
}
function modalityLabel(m: string) {
  if (m === 'presencial') return 'Presencial';
  if (m === 'virtual') return 'Virtual';
  return 'Híbrido';
}
function fmtSeconds(s: number) {
  if (!s || s <= 0) return '0 min';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}
function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m} min ${s}s`;
  return `${s}s`;
}

export default function StaffScanPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: eventsData } = useEvents();

  const activeEvents: Event[] = (eventsData?.events ?? []).filter(
    (e) => e.status === 'active'
  );

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEventFinished, setIsEventFinished] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const hasScannedRef = useRef(false);

  // ── cargar lista ──────────────────────────────────────────────────────────
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
    setShowList((v) => !v);
  };

  // ── seleccionar evento ────────────────────────────────────────────────────
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEventFinished(event.status === 'finished');
    setScanResult(null);
    setCameraOn(false);
    setScanKey((k) => k + 1);
    setEnrollments([]);
    setShowList(false);
    setSearchTerm('');
    setScanCount(0);
    hasScannedRef.current = false;
  };

  // ── toggle cámara ─────────────────────────────────────────────────────────
  const toggleCamera = () => {
    if (!selectedEvent) {
      toast.error('Selecciona un evento primero');
      return;
    }
    setCameraOn((v) => !v);
    setScanResult(null);
    hasScannedRef.current = false;
    setScanKey((k) => k + 1);
  };

  // ── procesar QR (TOGGLE) ──────────────────────────────────────────────────
  const handleScan = useCallback(
    async (qrToken: string) => {
      if (isProcessing || hasScannedRef.current || !selectedEvent) return;
      hasScannedRef.current = true;
      setIsProcessing(true);
      setScanResult(null);

      const now = new Date();
      const timeStr = format(now, 'HH:mm:ss', { locale: es });

      try {
        // 1. Validar QR
        const qrData = await enrollmentsApi.validateQR(qrToken);
        if (!qrData.valid || !qrData.enrollment) {
          setScanResult({ type: 'error', title: 'QR inválido', detail: 'El código no corresponde a ninguna inscripción.', time: timeStr });
          return;
        }

        const enrollment = qrData.enrollment;

        // 2. Validar evento
        if (enrollment.event?.id !== selectedEvent.id) {
          setScanResult({
            type: 'error',
            title: 'Evento incorrecto',
            detail: `Este QR es del evento "${enrollment.event?.title ?? '?'}".`,
            time: timeStr,
          });
          return;
        }

        // 3. Validar estado
        if (enrollment.status === 'cancelled') {
          setScanResult({ type: 'error', title: 'Inscripción cancelada', detail: `${enrollment.user?.name} tiene la inscripción cancelada.`, time: timeStr });
          return;
        }

        // 4. TOGGLE — el backend decide si es entrada o salida
        const result = await enrollmentsApi.togglePhysicalAttendance(enrollment.id);
        setScanCount((c) => c + 1);

        if (result.action === 'checked_in') {
          setScanResult({
            type: 'enter',
            title: '✅ Entrada registrada',
            detail: `${enrollment.user?.name} ingresó correctamente.`,
            time: timeStr,
            userName: enrollment.user?.name,
          });
        } else {
          const dur = result.durationSeconds ? fmtDuration(result.durationSeconds) : '';
          setScanResult({
            type: 'exit',
            title: '🔄 Salida temporal',
            detail: `${enrollment.user?.name} salió. Sesión: ${dur}.`,
            time: timeStr,
            userName: enrollment.user?.name,
            durationStr: dur,
            activeSeconds: result.activeSeconds,
          });
        }

        if (showList) loadEnrollments(selectedEvent.id);
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Error al procesar el QR';
        if (msg.toLowerCase().includes('no está activo')) {
          setIsEventFinished(true);
          setCameraOn(false);
        }
        setScanResult({ type: 'error', title: 'Error', detail: msg, time: timeStr });
      } finally {
        setIsProcessing(false);
        setTimeout(() => {
          setScanResult(null);
          hasScannedRef.current = false;
          setScanKey((k) => k + 1);
        }, 4000);
      }
    },
    [isProcessing, selectedEvent, showList]
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // ── filtrar lista ─────────────────────────────────────────────────────────
  const filtered = enrollments.filter(
    (e) =>
      (e.users?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.users?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total: enrollments.length,
    present: enrollments.filter((e: any) => e.check_in).length,
    certified: enrollments.filter((e: any) => e.isCertified).length,
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ── Header ── */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Control de Asistencia</h1>
            <p className="text-xs text-slate-400">{user?.name} · Staff</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all">
          <LogOut className="w-3.5 h-3.5" /> Salir
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* ── Selección de evento ── */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            Evento activo
          </h2>

          {activeEvents.length === 0 ? (
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-white/5 p-10 text-center">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No hay eventos activos en este momento</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeEvents.map((event) => {
                const sel = selectedEvent?.id === event.id;
                return (
                  <button
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className={`w-full text-left rounded-2xl overflow-hidden transition-all duration-300 ${
                      sel
                        ? 'ring-2 ring-blue-400 shadow-lg shadow-blue-500/10 scale-[1.01]'
                        : 'ring-1 ring-white/5 hover:ring-white/15'
                    }`}
                  >
                    <div className={`bg-gradient-to-r ${modalityGradient(event.modality)} px-4 py-3 flex items-center justify-between`}>
                      <h3 className="text-sm font-bold text-white line-clamp-1">{event.title}</h3>
                      <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 font-medium ml-2 shrink-0">
                        {modalityLabel(event.modality)}
                      </span>
                    </div>
                    <div className="bg-slate-800/90 backdrop-blur px-4 py-2.5 flex items-center gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(event.date), 'dd MMM · HH:mm', { locale: es })}
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
                      {sel && (
                        <span className="ml-auto text-blue-400 font-semibold flex items-center gap-1 shrink-0">
                          <CheckCircle className="w-3 h-3" /> Activo
                        </span>
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
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            {/* Header panel */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Escáner QR
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {cameraOn ? 'Apunta al código QR del estudiante' : 'Activa la cámara para comenzar'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {scanCount > 0 && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 rounded-full px-2.5 py-0.5 font-medium">
                    {scanCount} escaneos
                  </span>
                )}
                <button
                  onClick={toggleCamera}
                  disabled={isProcessing || isEventFinished}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-200 ${
                    cameraOn
                      ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/20'
                      : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {cameraOn ? (
                    <><CameraOff className="w-3.5 h-3.5" /> Apagar</>
                  ) : (
                    <><Camera className="w-3.5 h-3.5" /> Encender</>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado */}
            {scanResult && (
              <div
                className={`mx-4 mt-3 rounded-xl p-4 border transition-all duration-300 animate-[slideDown_0.3s_ease-out] ${
                  scanResult.type === 'enter'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : scanResult.type === 'exit'
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : scanResult.type === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      scanResult.type === 'enter'
                        ? 'bg-emerald-500/20'
                        : scanResult.type === 'exit'
                        ? 'bg-amber-500/20'
                        : scanResult.type === 'warning'
                        ? 'bg-yellow-500/20'
                        : 'bg-red-500/20'
                    }`}
                  >
                    {scanResult.type === 'enter' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                    {scanResult.type === 'exit' && <ArrowRightLeft className="w-5 h-5 text-amber-400" />}
                    {scanResult.type === 'warning' && <XCircle className="w-5 h-5 text-yellow-400" />}
                    {scanResult.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${
                      scanResult.type === 'enter' ? 'text-emerald-300' :
                      scanResult.type === 'exit' ? 'text-amber-300' :
                      scanResult.type === 'warning' ? 'text-yellow-300' : 'text-red-300'
                    }`}>{scanResult.title}</p>
                    <p className={`text-xs mt-0.5 ${
                      scanResult.type === 'enter' ? 'text-emerald-400/70' :
                      scanResult.type === 'exit' ? 'text-amber-400/70' :
                      scanResult.type === 'warning' ? 'text-yellow-400/70' : 'text-red-400/70'
                    }`}>{scanResult.detail}</p>
                    {scanResult.activeSeconds !== undefined && (
                      <p className="text-[10px] text-slate-500 mt-1">Tiempo acumulado total: {fmtSeconds(scanResult.activeSeconds)}</p>
                    )}
                    {scanResult.time && (
                      <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {scanResult.time}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Scanner / Placeholder */}
            <div className="p-4">
              {isEventFinished ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3 text-red-400">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium text-center">Este evento ha finalizado.<br/>El escáner ha sido deshabilitado.</p>
                </div>
              ) : (
                <>
                  {isProcessing && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-12 h-12 rounded-full border-3 border-blue-500/30 border-t-blue-400 animate-spin" />
                      <span className="mt-3 text-sm text-blue-300 font-medium">Procesando…</span>
                    </div>
                  )}

              {cameraOn && !isProcessing && !scanResult && (
                <div className="relative">
                  <div className="rounded-xl overflow-hidden ring-2 ring-blue-400/30 animate-pulse">
                    <QRScanner
                      key={scanKey}
                      onScanSuccess={handleScan}
                      onScanError={() => {
                        setCameraOn(false);
                        toast.error('No se pudo acceder a la cámara.');
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 pointer-events-none rounded-xl border-2 border-blue-400/20" />
                </div>
              )}

              {!cameraOn && !isProcessing && !scanResult && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-3">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-500">Presiona "Encender" para activar la cámara</p>
                </div>
              )}

              {/* Ingreso manual */}
              {!isProcessing && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[11px] text-slate-500 mb-2 uppercase tracking-wider font-semibold">Ingreso manual de código</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Escribe el token QR..."
                      className="flex-1 bg-slate-700/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handleScan(e.currentTarget.value.trim());
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button
                      className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm font-medium rounded-xl transition-colors border border-white/5"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input.value.trim()) {
                          handleScan(input.value.trim());
                          input.value = '';
                        }
                      }}
                    >
                      Validar
                    </button>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Lista de asistentes ── */}
        {selectedEvent && (
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
            <button
              onClick={toggleList}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-white hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Lista de asistentes
                {enrollments.length > 0 && (
                  <span className="bg-blue-500/20 text-blue-300 text-[10px] rounded-full px-2 py-0.5 font-medium">
                    {stats.present}/{stats.total}
                  </span>
                )}
                {stats.certified > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full px-2 py-0.5 font-medium flex items-center gap-0.5">
                    <Award className="w-2.5 h-2.5" /> {stats.certified}
                  </span>
                )}
              </span>
              {showList ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showList && (
              <div className="border-t border-white/5">
                {/* Search */}
                {enrollments.length > 0 && (
                  <div className="px-4 pt-3 pb-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o email…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-700/50 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                      />
                    </div>
                  </div>
                )}

                {isLoadingList ? (
                  <div className="py-10 flex justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
                  </div>
                ) : enrollments.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">Sin inscripciones registradas</p>
                ) : (
                  <ul className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                    {filtered.map((en: any) => {
                      const activeMin = Math.round((en.active_seconds || 0) / 60);
                      const pct = en.percentage || 0;
                      const certified = !!en.isCertified;
                      const hasSession = !!en.session_start;
                      const isInside = hasSession && !en.session_end;
                      const evtDuration = selectedEvent?.duration || 1;

                      return (
                        <li key={en.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Avatar */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isInside ? 'bg-emerald-500/20' : en.check_in ? 'bg-slate-600/50' : 'bg-slate-700/50'
                              }`}>
                                <User className={`w-4 h-4 ${isInside ? 'text-emerald-400' : 'text-slate-500'}`} />
                                {isInside && (
                                  <span className="absolute -mt-5 -mr-5 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-white truncate">{en.users?.name ?? '—'}</p>
                                <p className="text-[10px] text-slate-500 truncate">{en.users?.email}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                              {/* Status */}
                              {isInside ? (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 rounded-full px-2 py-0.5 font-medium">🟢 En sala</span>
                              ) : en.check_in ? (
                                <span className="text-[10px] bg-slate-600/50 text-slate-400 rounded-full px-2 py-0.5">Fuera</span>
                              ) : (
                                <span className="text-[10px] text-slate-600">Sin entrada</span>
                              )}
                              {/* Time + cert */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">{activeMin}/{evtDuration}m</span>
                                <span className={`text-[10px] font-medium ${pct >= (selectedEvent as any)?.min_attendance_percentage ? 'text-emerald-400' : 'text-slate-500'}`}>
                                  {pct}%
                                </span>
                                {certified && <Award className="w-3 h-3 text-amber-400" />}
                              </div>
                            </div>
                          </div>
                          {/* Progress bar */}
                          {en.check_in && (
                            <div className="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${certified ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* slideDown animation */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
