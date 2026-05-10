const EnrollmentModel = require('../models/EnrollmentModel');
const EventSessionModel = require('../models/EventSessionModel');
const EventModel = require('../models/EventModel');
const { v4: uuidv4 } = require('uuid');

/**
 * Servicio de Inscripciones
 * Maneja la lógica de negocio para inscripciones a eventos
 */
const EnrollmentService = {
  /**
   * Inscribir usuario a un evento (con UPSERT para reinscripción)
   * @param {string} userId - UUID del usuario
   * @param {string} eventId - UUID del evento
   */
  async enroll(userId, eventId) {
    // Verificar que el evento existe
    const event = await EventModel.findById(eventId);
    if (!event) {
      const error = new Error('Evento no encontrado');
      error.code = 'EVENT_NOT_FOUND';
      throw error;
    }

    // Verificar que el evento está activo
    if (event.status !== 'active') {
      const error = new Error('El evento no está activo');
      error.code = 'EVENT_NOT_ACTIVE';
      throw error;
    }

    // Verificar que hay cupos disponibles
    if (event.available_slots <= 0) {
      const error = new Error('No hay cupos disponibles');
      error.code = 'NO_AVAILABLE_SLOTS';
      throw error;
    }

    // Verificar inscripción existente (UPSERT logic)
    const existingEnrollment = await EnrollmentModel.findByUserAndEvent(userId, eventId);

    if (existingEnrollment) {
      // Activa → error
      if (existingEnrollment.status === 'active') {
        const error = new Error('Ya estás inscrito en este evento');
        error.code = 'ALREADY_ENROLLED';
        throw error;
      }

      // Completada → error
      if (existingEnrollment.status === 'completed') {
        const error = new Error('Ya asististe a este evento');
        error.code = 'ALREADY_ATTENDED';
        throw error;
      }

      // Cancelada → reactivar con nuevo QR
      if (existingEnrollment.status === 'cancelled') {
        const newQrToken = `E-${uuidv4().replace(/-/g, '').substring(0, 8)}-${Date.now().toString(36)}`;

        const updated = await EnrollmentModel.update(existingEnrollment.id, {
          status: 'active',
          qr_token: newQrToken,
          check_in: null,
          check_out: null
        });

        // Decrementar cupos manualmente (el trigger solo aplica en INSERT)
        await EventModel.update(eventId, {
          available_slots: event.available_slots - 1
        });

        return {
          message: 'Inscripción reactivada exitosamente',
          enrollment: updated
        };
      }
    }

    // No existe → INSERT normal
    const enrollment = await EnrollmentModel.create({
      user_id: userId,
      event_id: eventId
    });

    return {
      message: 'Inscripción realizada exitosamente',
      enrollment
    };
  },

  /**
   * Obtener inscripciones de un usuario
   * @param {string} userId - UUID del usuario
   * @param {string} status - Filtrar por estado (opcional)
   */
  async getUserEnrollments(userId, status = null) {
    const enrollments = await EnrollmentModel.findByUser(userId, status);

    // Enriquecer cada inscripción con porcentaje, certificación y tiempos de sesión reales
    return enrollments.map(enrollment => {
      const event = enrollment.events;
      if (!event) return enrollment;

      const { percentage, isCertified } = this.calculateAttendance(enrollment, event);
      const { session_start, session_end } = this.extractSessionTimes(enrollment.event_sessions);
      return {
        ...enrollment,
        percentage,
        isCertified,
        session_start,
        session_end
      };
    });
  },

  /**
   * Obtener detalle de una inscripción
   * @param {string} enrollmentId - UUID de la inscripción
   */
  async getEnrollment(enrollmentId) {
    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) {
      const error = new Error('Inscripción no encontrada');
      error.code = 'NOT_FOUND';
      throw error;
    }
    return enrollment;
  },

  /**
   * Cancelar inscripción de un usuario
   * @param {string} userId - UUID del usuario
   * @param {string} enrollmentId - UUID de la inscripción
   */
  async cancelEnrollment(userId, enrollmentId) {
    // Verificar que la inscripción existe y pertenece al usuario
    const enrollment = await this.getEnrollment(enrollmentId);

    if (enrollment.user_id !== userId) {
      const error = new Error('No tienes permiso para cancelar esta inscripción');
      error.code = 'FORBIDDEN';
      throw error;
    }

    // Verificar que no esté ya cancelada o usada
    if (enrollment.status === 'cancelled') {
      const error = new Error('La inscripción ya está cancelada');
      error.code = 'ALREADY_CANCELLED';
      throw error;
    }

    if (enrollment.status === 'completed') {
      const error = new Error('No se puede cancelar una inscripción con asistencia registrada');
      error.code = 'CANNOT_CANCEL_COMPLETED';
      throw error;
    }

    // Cancelar inscripción (el trigger incrementa available_slots automáticamente)
    const updated = await EnrollmentModel.cancel(enrollmentId);

    return {
      message: 'Inscripción cancelada exitosamente',
      enrollment: updated
    };
  },

  /**
   * Obtener inscripción por QR token
   * @param {string} qrToken - Token del QR
   */
  async getByQrToken(qrToken) {
    const enrollment = await EnrollmentModel.findByQrToken(qrToken);
    if (!enrollment) {
      const error = new Error('QR inválido o no encontrado');
      error.code = 'INVALID_QR';
      throw error;
    }
    return enrollment;
  },

  /**
   * Registrar asistencia (check-in)
   * Solo admin puede hacerlo
   * @param {string} enrollmentId - UUID de la inscripción
   */
  async registerCheckIn(enrollmentId) {
    const enrollment = await this.getEnrollment(enrollmentId);

    if (enrollment.status !== 'active') {
      const error = new Error('La inscripción no está activa');
      error.code = 'ENROLLMENT_NOT_ACTIVE';
      throw error;
    }

    const updated = await EnrollmentModel.checkIn(enrollmentId);

    return {
      message: 'Check-in registrado exitosamente',
      enrollment: updated
    };
  },

  /**
   * Check-in al entrar a sala virtual (estudiante): crear sesión en event_sessions
   * @param {string} userId
   * @param {string} eventId
   */
  async registerStudentVirtualCheckIn(userId, eventId) {
    const enrollment = await EnrollmentModel.findByUserAndEvent(userId, eventId);

    if (!enrollment) {
      const error = new Error('No estás inscrito en este evento');
      error.code = 'NOT_ENROLLED';
      throw error;
    }

    if (enrollment.status !== 'active' && enrollment.status !== 'completed') {
      const error = new Error('Tu inscripción no está activa');
      error.code = 'ENROLLMENT_NOT_ACTIVE';
      throw error;
    }

    // Buscar sesión activa existente
    const activeSession = await EventSessionModel.findActiveSession(enrollment.id);
    
    if (activeSession) {
      // Ya existe sesión activa, asegurar que check_in oficial esté marcado si estaba vacío
      if (!enrollment.check_in) {
        await EnrollmentModel.update(enrollment.id, {
          check_in: new Date().toISOString()
        });
      }

      return {
        message: 'Sesión ya iniciada',
        enrollment,
        session: activeSession,
        alreadyCheckedIn: true
      };
    }

    // Marcar check_in oficial si es la primera vez que entra a la sala
    if (!enrollment.check_in) {
      await EnrollmentModel.update(enrollment.id, {
        check_in: new Date().toISOString()
      });
    }

    // Crear nueva sesión
    const session = await EventSessionModel.create(enrollment.id);

    return {
      message: 'Check-in registrado exitosamente',
      enrollment,
      session,
      alreadyCheckedIn: false
    };
  },

  /**
   * Registrar salida (check-out)
   * Solo admin puede hacerlo
   * @param {string} enrollmentId - UUID de la inscripción
   */
  async registerCheckOut(enrollmentId) {
    const enrollment = await this.getEnrollment(enrollmentId);

    if (!enrollment.check_in) {
      const error = new Error('Debe registrar check-in antes del check-out');
      error.code = 'NO_CHECKIN';
      throw error;
    }

    const updated = await EnrollmentModel.checkOut(enrollmentId);

    return {
      message: 'Check-out registrado exitosamente',
      enrollment: updated
    };
  },

  /**
   * Check-in presencial (staff/admin via QR)
   * Replica el flujo virtual: crea event_session + marca check_in + session_start
   * @param {string} enrollmentId - UUID de la inscripción (obtenido del QR)
   */
  async registerPhysicalCheckIn(enrollmentId) {
    const enrollment = await this.getEnrollment(enrollmentId);

    if (enrollment.status !== 'active' && enrollment.status !== 'completed') {
      const error = new Error('La inscripción no está activa');
      error.code = 'ENROLLMENT_NOT_ACTIVE';
      throw error;
    }

    // No permitir doble check-in si ya hay sesión activa
    const activeSession = await EventSessionModel.findActiveSession(enrollmentId);
    if (activeSession) {
      return {
        message: 'Ya tiene una sesión activa en curso',
        enrollment,
        session: activeSession,
        alreadyCheckedIn: true
      };
    }

    const now = new Date().toISOString();

    // Marcar check_in físico si es la primera vez
    if (!enrollment.check_in) {
      await EnrollmentModel.update(enrollmentId, { check_in: now });
    }

    // Crear sesión en event_sessions (igual que virtual)
    const session = await EventSessionModel.create(enrollmentId);

    return {
      message: 'Entrada presencial registrada exitosamente',
      enrollment,
      session,
      alreadyCheckedIn: false
    };
  },

  /**
   * Check-out presencial (staff/admin via QR)
   * Cierra la sesión en event_sessions, calcula active_seconds y marca check_out
   * @param {string} enrollmentId - UUID de la inscripción
   */
  async registerPhysicalCheckOut(enrollmentId) {
    const enrollment = await this.getEnrollment(enrollmentId);

    if (!enrollment.check_in) {
      const error = new Error('Debe registrar entrada antes de la salida');
      error.code = 'NO_CHECKIN';
      throw error;
    }

    // Buscar sesión activa
    const activeSession = await EventSessionModel.findActiveSession(enrollmentId);

    if (!activeSession) {
      return {
        message: 'No hay sesión activa para cerrar',
        enrollment,
        alreadyCheckedOut: true
      };
    }

    // Calcular duración antes de cerrar
    const endTime = new Date();
    const startTime = new Date(activeSession.start_time);
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    // Cerrar sesión en event_sessions
    await EventSessionModel.closeSession(activeSession.id);

    // Acumular active_seconds en la inscripción
    if (durationSeconds > 0) {
      await EnrollmentModel.addActiveSeconds(enrollmentId, durationSeconds);
    }

    // Marcar check_out físico
    await EnrollmentModel.update(enrollmentId, { check_out: endTime.toISOString() });

    return {
      message: 'Salida presencial registrada exitosamente',
      enrollment,
      durationSeconds,
      alreadyCheckedOut: false
    };
  },



  /**
   * Calcular asistencia a partir de modelo en memoria (sin queries)
   */
  calculateAttendance(enrollment, event) {
    if (!enrollment || !event) return { percentage: 0, isCertified: false };
    
    const activeMinutes = (enrollment.active_seconds || 0) / 60;
    const percentage = Math.min(100, Math.round((activeMinutes / event.duration) * 100));
    const isCertified = percentage >= event.min_attendance_percentage;
    
    return { percentage, isCertified };
  },

  /**
   * Extraer tiempos reales de sesión desde event_sessions
   * @param {Array} sessions - Array de sesiones { start_time, end_time }
   * @returns {{ session_start: string|null, session_end: string|null }}
   */
  extractSessionTimes(sessions) {
    if (!sessions || sessions.length === 0) {
      return { session_start: null, session_end: null };
    }

    // Primera entrada (start_time más antiguo)
    const starts = sessions
      .filter(s => s.start_time)
      .map(s => new Date(s.start_time).getTime());
    
    // Última salida (end_time más reciente, excluyendo null = sesión aún activa)
    const ends = sessions
      .filter(s => s.end_time)
      .map(s => new Date(s.end_time).getTime());

    const session_start = starts.length > 0
      ? new Date(Math.min(...starts)).toISOString()
      : null;

    const session_end = ends.length > 0
      ? new Date(Math.max(...ends)).toISOString()
      : null;

    return { session_start, session_end };
  },

  /**
   * Obtener todas las inscripciones de un evento y añadir lógica de certificación
   * @param {string} eventId - UUID del evento
   */
  async getEventEnrollments(eventId) {
    const enrollments = await EnrollmentModel.findByEvent(eventId);
    const event = await EventModel.findById(eventId);
    
    if (!event) return enrollments;

    return enrollments.map(enrollment => {
      const { percentage, isCertified } = this.calculateAttendance(enrollment, event);
      const { session_start, session_end } = this.extractSessionTimes(enrollment.event_sessions);
      return {
        ...enrollment,
        percentage,
        isCertified,
        session_start,
        session_end
      };
    });
  },

  /**
   * Check-out al salir de sala virtual (estudiante): cerrar sesión en event_sessions
   * @param {string} userId - UUID del usuario
   * @param {string} eventId - UUID del evento
   */
  async registerStudentVirtualCheckOut(userId, eventId) {
    const enrollment = await EnrollmentModel.findByUserAndEvent(userId, eventId);

    if (!enrollment) {
      const error = new Error('No estás inscrito en este evento');
      error.code = 'NOT_ENROLLED';
      throw error;
    }

    // Permitir check-out de inscripciones completadas (sala aún activa)
    if (enrollment.status !== 'active' && enrollment.status !== 'completed') {
      const error = new Error('Tu inscripción no está activa');
      error.code = 'ENROLLMENT_NOT_ACTIVE';
      throw error;
    }

    // Buscar sesión activa (sin end_time)
    const activeSession = await EventSessionModel.findActiveSession(enrollment.id);

    if (!activeSession) {
      // No hay sesión activa, retornar éxito (flujo silencioso)
      return {
        message: 'No hay sesión activa para cerrar',
        enrollment,
        alreadyCheckedOut: true
      };
    }

    // Cerrar la sesión activa
    const closedSession = await EventSessionModel.closeSession(activeSession.id);

    // Actualizar check_out informativo
    await EnrollmentModel.update(enrollment.id, {
      check_out: new Date().toISOString()
    });

    return {
      message: 'Check-out registrado exitosamente',
      enrollment,
      session: closedSession,
      alreadyCheckedOut: false
    };
  },

  /**
   * Calcular porcentaje de asistencia de un usuario en un evento basado en active_seconds
   * @param {string} userId - UUID del usuario
   * @param {string} eventId - UUID del evento
   */
  async calculateAttendancePercentage(userId, eventId) {
    const enrollment = await EnrollmentModel.findByUserAndEvent(userId, eventId);
    if (!enrollment) return null;

    const event = await EventModel.findById(eventId);
    if (!event) return null;

    const { percentage, isCertified } = this.calculateAttendance(enrollment, event);

    return {
      percentage,
      duration_attended: Math.round((enrollment.active_seconds || 0) / 60),
      duration_total: event.duration,
      min_required: event.min_attendance_percentage,
      certified: isCertified
    };
  },

  async addActiveSeconds(enrollmentId, seconds) {
    if (typeof seconds !== 'number' || seconds <= 0 || seconds > 300) {
      const error = new Error('Cantidad de segundos inválida para reporte');
      error.code = 'INVALID_SECONDS';
      throw error;
    }

    const enrollment = await this.getEnrollment(enrollmentId);

    if (enrollment.status !== 'active') {
      const error = new Error('La inscripción no está activa');
      error.code = 'ENROLLMENT_NOT_ACTIVE';
      throw error;
    }

    return await EnrollmentModel.addActiveSeconds(enrollmentId, seconds);
  }
};

module.exports = EnrollmentService;
