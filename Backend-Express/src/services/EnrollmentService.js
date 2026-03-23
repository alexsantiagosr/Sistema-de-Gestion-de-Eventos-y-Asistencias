const EnrollmentModel = require('../models/EnrollmentModel');
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

      // Usada → error
      if (existingEnrollment.status === 'used') {
        const error = new Error('Ya asististe a este evento');
        error.code = 'ALREADY_ATTENDED';
        throw error;
      }

      // Cancelada → reactivar con nuevo QR
      if (existingEnrollment.status === 'cancelled') {
        const newQrToken = `ENROLL-${uuidv4()}-${Date.now()}`;

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
    return await EnrollmentModel.findByUser(userId, status);
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

    if (enrollment.status === 'used') {
      const error = new Error('No se puede cancelar una inscripción con asistencia registrada');
      error.code = 'CANNOT_CANCEL_USED';
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
   * Marcar inscripción como usada (asistencia completa)
   * Solo admin puede hacerlo
   * @param {string} enrollmentId - UUID de la inscripción
   */
  async markAsUsed(enrollmentId) {
    const enrollment = await this.getEnrollment(enrollmentId);

    if (enrollment.status !== 'active') {
      const error = new Error('La inscripción no está activa');
      error.code = 'ENROLLMENT_NOT_ACTIVE';
      throw error;
    }

    const updated = await EnrollmentModel.update(enrollmentId, {
      status: 'used',
      check_in: enrollment.check_in || new Date().toISOString(),
      check_out: enrollment.check_out || new Date().toISOString()
    });

    return {
      message: 'Asistencia registrada exitosamente',
      enrollment: updated
    };
  },

  /**
   * Obtener todas las inscripciones de un evento
   * @param {string} eventId - UUID del evento
   */
  async getEventEnrollments(eventId) {
    return await EnrollmentModel.findByEvent(eventId);
  },

  /**
   * Calcular porcentaje de asistencia de un usuario en un evento
   * @param {string} userId - UUID del usuario
   * @param {string} eventId - UUID del evento
   */
  async calculateAttendancePercentage(userId, eventId) {
    const enrollment = await EnrollmentModel.findByUserAndEvent(userId, eventId);

    if (!enrollment) {
      return null;
    }

    const event = await EventModel.findById(eventId);
    if (!event) return null;

    // Si tiene check_out, calculamos el porcentaje
    if (enrollment.check_in && enrollment.check_out) {
      const checkIn = new Date(enrollment.check_in);
      const checkOut = new Date(enrollment.check_out);
      const durationMinutes = (checkOut - checkIn) / 1000 / 60;

      const percentage = Math.min(100, Math.round((durationMinutes / event.duration) * 100));
      return {
        percentage,
        duration_attended: Math.round(durationMinutes),
        duration_total: event.duration,
        min_required: event.min_attendance_percentage,
        certified: percentage >= event.min_attendance_percentage
      };
    }

    return {
      percentage: 0,
      duration_attended: 0,
      duration_total: event.duration,
      min_required: event.min_attendance_percentage,
      certified: false
    };
  }
};

module.exports = EnrollmentService;
