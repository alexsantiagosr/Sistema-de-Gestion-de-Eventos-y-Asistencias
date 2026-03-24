import { useState } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { toast } from 'sonner';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrDataUrl?: string;
  qrToken?: string;
  eventTitle?: string;
}

export default function QRModal({
  isOpen,
  onClose,
  qrDataUrl,
  qrToken,
  eventTitle,
}: QRModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!qrToken) return;

    try {
      await navigator.clipboard.writeText(qrToken);
      setCopied(true);
      toast.success('¡Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  };

  const handleDownloadPNG = async () => {
    if (!qrDataUrl) return;

    try {
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `qr-${eventTitle?.replace(/[^a-z0-9]/gi, '-') || 'ticket'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR descargado correctamente');
    } catch {
      toast.error('Error al descargar QR');
    }
  };

  if (!isOpen || !qrDataUrl || !qrToken) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎫 Tu ticket digital"
      size="md"
    >
      <div className="text-center">
        {/* QR Code */}
        <div className="mb-6">
          <img
            src={qrDataUrl}
            alt="Código QR"
            className="mx-auto max-w-[280px] rounded-lg border-2 border-gray-200 shadow-md"
          />
        </div>

        {/* Código de verificación hash */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Código de verificación:
          </p>
          <div className="relative">
            <div className="flex items-center bg-gray-100 border border-gray-300 rounded-lg px-4 py-3">
              <code className="flex-1 font-mono text-sm text-gray-800 break-all">
                {qrToken}
              </code>
              <button
                onClick={handleCopy}
                className="ml-3 p-2 text-gray-500 hover:text-primary transition-colors rounded-md hover:bg-gray-200"
                title="Copiar código"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-secondary mt-2">
            Presenta este código si no puedes mostrar el QR
          </p>
        </div>

        {/* Información del evento */}
        {eventTitle && (
          <div className="mb-6 p-3 bg-primary/5 rounded-lg">
            <p className="text-sm font-medium text-primary">{eventTitle}</p>
          </div>
        )}

        {/* Botón de acción - Solo PNG */}
        <div className="mb-4">
          <Button
            variant="secondary"
            onClick={handleDownloadPNG}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PNG
          </Button>
        </div>

        {/* Botón cerrar */}
        <Button variant="ghost" onClick={onClose} className="w-full">
          <X className="w-4 h-4 mr-2" />
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
