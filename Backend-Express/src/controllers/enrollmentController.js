const EnrollmentService = require('../services/EnrollmentService');

/**
 * Controlador de Inscripciones
 * Maneja las rutas para inscripciones a eventos
 */
const EnrollmentController = {
  /**
   * POST /api/enrollments/:eventId
   * Inscribirse a un evento (student)
   */
  async enroll(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;

      const result = await EnrollmentService.enroll(userId, eventId);

      res.status(201).json(result);
    } catch (error) {
      console.error("Error en inscripción:", error);
      
      if (error.code === 'EVENT_NOT_FOUND') return res.status(404).json({ message: error.message });
      if (error.code === 'EVENT_NOT_ACTIVE') return res.status(403).json({ message: "El evento no está disponible" });
      if (error.code === 'ALREADY_ENROLLED') return res.status(409).json({ message: error.message });
      if (error.code === 'NO_AVAILABLE_SLOTS') return res.status(400).json({ message: error.message });

      return res.status(500).json({
        message: "Error interno del servidor",
        error: error.message
      });
    }
  },

  /**
   * GET /api/enrollments/my-enrollments
   * Obtener mis inscripciones (student)
   */
  async myEnrollments(req, res, next) {
    try {
      const { status } = req.query;
      const userId = req.user.id;

      const enrollments = await EnrollmentService.getUserEnrollments(userId, status);

      res.json({
        count: enrollments.length,
        enrollments
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/enrollments/:id
   * Obtener detalle de una inscripción (student - solo las propias)
   */
  async show(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const enrollment = await EnrollmentService.getEnrollment(id);

      // Verificar que la inscripción pertenece al usuario
      if (enrollment.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Prohibido',
          message: 'No tienes permiso para ver esta inscripción'
        });
      }

      res.json({ enrollment });
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * DELETE /api/enrollments/:id
   * Cancelar inscripción (student - solo las propias)
   */
  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await EnrollmentService.cancelEnrollment(userId, id);

      res.json(result);
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      if (['FORBIDDEN', 'ALREADY_CANCELLED', 'CANNOT_CANCEL_USED'].includes(error.code)) {
        return res.status(400).json({
          error: 'No se puede cancelar',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * GET /api/enrollments/qr/:qrToken
   * Obtener información por QR (público para validación)
   */
  async getByQr(req, res, next) {
    try {
      const { qrToken } = req.params;

      const enrollment = await EnrollmentService.getByQrToken(qrToken);

      res.json({
        valid: true,
        enrollment: {
          id: enrollment.id,
          event: enrollment.events,
          user: enrollment.users,
          status: enrollment.status,
          check_in: enrollment.check_in,
          check_out: enrollment.check_out
        }
      });
    } catch (error) {
      if (error.code === 'INVALID_QR') {
        return res.status(404).json({
          valid: false,
          error: 'QR inválido',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * POST /api/enrollments/:id/check-in
   * Admin: id = inscripción. Estudiante: id = eventId (sala virtual).
   */
  async checkInDispatcher(req, res, next) {
    if (req.user.role === 'student') {
      try {
        const { id: eventId } = req.params;
        const result = await EnrollmentService.registerStudentVirtualCheckIn(req.user.id, eventId);
        return res.json(result);
      } catch (error) {
        if (error.code === 'NOT_ENROLLED') {
          return res.status(404).json({
            error: 'No encontrado',
            message: error.message
          });
        }
        if (error.code === 'ENROLLMENT_NOT_ACTIVE') {
          return res.status(400).json({
            error: 'No se puede registrar check-in',
            message: error.message
          });
        }
        return next(error);
      }
    }
    if (req.user.role === 'admin') {
      return EnrollmentController.checkIn(req, res, next);
    }
    return res.status(403).json({
      error: 'Prohibido',
      message: 'No tienes permiso para esta acción'
    });
  },

  /**   * POST /api/enrollments/:id/check-out
   * Dispatcher: Estudiante (id = eventId) o Admin (id = enrollmentId)
   */
  async checkOutDispatcher(req, res, next) {
    if (req.user.role === 'student') {
      try {
        const { id: eventId } = req.params;
        const result = await EnrollmentService.registerStudentVirtualCheckOut(req.user.id, eventId);
        return res.json(result);
      } catch (error) {
        if (error.code === 'NOT_ENROLLED') {
          return res.status(404).json({
            error: 'No encontrado',
            message: error.message
          });
        }
        if (['ENROLLMENT_NOT_ACTIVE', 'NO_CHECKIN'].includes(error.code)) {
          return res.status(400).json({
            error: 'No se puede registrar check-out',
            message: error.message
          });
        }
        return next(error);
      }
    }
    if (req.user.role === 'admin') {
      return EnrollmentController.checkOut(req, res, next);
    }
    return res.status(403).json({
      error: 'Prohibido',
      message: 'No tienes permiso para esta acción'
    });
  },

  /**   * POST /api/enrollments/:id/check-in (admin — llamado desde checkInDispatcher)
   */
  async checkIn(req, res, next) {
    try {
      const { id } = req.params;

      const result = await EnrollmentService.registerCheckIn(id);

      res.json(result);
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      if (error.code === 'ENROLLMENT_NOT_ACTIVE') {
        return res.status(400).json({
          error: 'No se puede registrar check-in',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * POST /api/enrollments/:id/check-out
   * Registrar check-out (admin)
   */
  async checkOut(req, res, next) {
    try {
      const { id } = req.params;

      const result = await EnrollmentService.registerCheckOut(id);

      res.json(result);
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      if (['ENROLLMENT_NOT_ACTIVE', 'NO_CHECKIN'].includes(error.code)) {
        return res.status(400).json({
          error: 'No se puede registrar check-out',
          message: error.message
        });
      }
      next(error);
    }
  },



  /**
   * GET /api/enrollments/event/:eventId
   * Obtener todas las inscripciones de un evento (admin)
   */
  async getEventEnrollments(req, res, next) {
    try {
      const { eventId } = req.params;

      const enrollments = await EnrollmentService.getEventEnrollments(eventId);

      res.json({
        count: enrollments.length,
        enrollments
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/enrollments/:eventId/check-out
   * Estudiante: registra check-out al salir de sala virtual (id = eventId)
   */
  /**
   * GET /api/enrollments/:eventId/attendance
   * Calcular porcentaje de asistencia (student - propia)
   */
  async getAttendance(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;

      const attendance = await EnrollmentService.calculateAttendancePercentage(userId, eventId);

      if (!attendance) {
        return res.status(404).json({
          error: 'No encontrado',
          message: 'No estás inscrito en este evento'
        });
      }

      res.json({
        attendance
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/enrollments/:eventId/attendance-time
   * Acumular segundos de asistencia activa (student)
   */
  async addAttendanceTime(req, res, next) {
    try {
      const { eventId } = req.params;
      const { seconds } = req.body;
      const userId = req.user.id;

      if (typeof seconds !== 'number' || seconds <= 0 || seconds > 300) { // Permitir hasta 5 minutos por seguridad
        return res.status(400).json({ error: 'Tiempo activo inválido (debe ser numérico mayor a 0 y razonable)' });
      }

      // Validar enrollment existente
      const enrollments = await EnrollmentService.getUserEnrollments(userId, 'active');
      const eventEnrollment = enrollments.find(e => e.event_id === eventId);
      
      if (!eventEnrollment) {
        return res.status(404).json({ error: 'Inscripción no encontrada o no está activa' });
      }

      await EnrollmentService.addActiveSeconds(eventEnrollment.id, seconds);

      res.json({ ok: true, message: 'Tiempo activo reportado con éxito.' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = EnrollmentController;
