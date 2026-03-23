// Tipos de usuario
export type UserRole = 'admin' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Tipos de evento
export type EventModality = 'presencial' | 'virtual' | 'híbrido';
export type EventStatus = 'active' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  modality: EventModality;
  capacity: number;
  available_slots: number;
  duration: number;
  min_attendance_percentage: number;
  location: string | null;
  status: EventStatus;
  created_by: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at: string;
}

// Tipos de inscripción
export type EnrollmentStatus = 'active' | 'used' | 'cancelled';

export interface Enrollment {
  id: string;
  user_id: string;
  event_id: string;
  qr_token: string;
  status: EnrollmentStatus;
  check_in: string | null;
  check_out: string | null;
  created_at: string;
  events?: Event;
  users?: User;
}

// Tipos de certificado
export interface Certificate {
  enrollmentId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  attendancePercentage: number;
  minRequired: number;
  eligible: boolean;
  canDownload: boolean;
}

export interface CertificateData {
  user: {
    name: string;
    email: string;
  };
  event: {
    title: string;
    date: string;
    duration: number;
    modality: EventModality;
    location: string | null;
  };
  attendance: {
    eligible: boolean;
    percentage: number;
    duration_attended: number;
    duration_total: number;
    min_required: number;
    certified: boolean;
  };
  generatedAt: string;
}

// Tipos de autenticación
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Tipos de respuesta API
export interface ApiResponse<T> {
  message?: string;
  user?: T;
  token?: string;
  events?: T[];
  event?: T;
  enrollments?: T[];
  enrollment?: T;
  certificates?: T[];
  count?: number;
  error?: string;
}

export interface ApiError {
  error: string;
  message: string;
}

// Tipos para formularios
export interface CreateEventFormData {
  title: string;
  description: string;
  date: string;
  modality: EventModality;
  capacity: number;
  duration: number;
  min_attendance_percentage: number;
  location: string;
}

export interface UpdateEventFormData extends Partial<CreateEventFormData> {
  status?: EventStatus;
}
