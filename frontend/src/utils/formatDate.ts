import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha ISO a formato legible en español
 */
export function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), "dd 'de' MMMM, yyyy", { locale: es });
  } catch {
    return dateString;
  }
}

/**
 * Formatea una fecha ISO con hora
 */
export function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
  } catch {
    return dateString;
  }
}

/**
 * Formatea duración en minutos a formato legible
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Obtiene el color del badge según el estado
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-800 bg-green-100',
    completed: 'text-blue-800 bg-blue-100',
    cancelled: 'text-red-800 bg-red-100',
    used: 'text-purple-800 bg-purple-100',
  };
  
  return colors[status] || 'text-gray-800 bg-gray-100';
}
