import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

/**
 * Componente de escáner QR usando la cámara del dispositivo.
 * Usa html5-qrcode para decodificar códigos QR en tiempo real.
 */
export default function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasScanned = useRef(false);

  useEffect(() => {
    const scannerId = `qr-scanner-${Date.now()}`;

    // Crear el div dinámicamente dentro del contenedor
    if (!containerRef.current) return;

    const scannerDiv = document.createElement('div');
    scannerDiv.id = scannerId;
    containerRef.current.appendChild(scannerDiv);

    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' }, // Cámara trasera preferida
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // Evitar múltiples escaneos del mismo QR
          if (hasScanned.current) return;
          hasScanned.current = true;
          onScanSuccess(decodedText);
        },
        () => {
          // Silencioso — se llama en cada frame sin detección
        }
      )
      .then(() => {
        setIsStarting(false);
      })
      .catch((err) => {
        const msg = typeof err === 'string' ? err : err?.message || 'No se pudo acceder a la cámara';
        setError(msg);
        setIsStarting(false);
        onScanError?.(msg);
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(() => {});
      } else {
        try { scannerRef.current?.clear(); } catch { /* already cleared */ }
      }
      // Limpiar el div creado
      if (containerRef.current && scannerDiv.parentNode === containerRef.current) {
        containerRef.current.removeChild(scannerDiv);
      }
    };
  }, []);

  return (
    <div className="relative">
      {isStarting && (
        <div className="flex items-center justify-center py-12 text-secondary">
          <svg className="animate-spin h-6 w-6 mr-3 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Iniciando cámara…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <p className="font-medium">No se pudo iniciar la cámara</p>
          <p className="text-xs mt-1">{error}</p>
          <p className="text-xs mt-2 text-red-500">
            Verifica que tu navegador tenga permisos de cámara habilitados.
          </p>
        </div>
      )}

      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg"
        style={{ minHeight: isStarting ? 0 : 280 }}
      />
    </div>
  );
}
