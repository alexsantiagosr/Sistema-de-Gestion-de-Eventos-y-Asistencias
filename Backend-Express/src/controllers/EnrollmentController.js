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
      if (['EVENT_NOT_FOUND', 'EVENT_NOT_ACTIVE', 'NO_AVAILABLE_SLOTS', 'ALREADY_ENROLLED'].includes(error.code)) {
        return res.status(400).json({
          error: 'No se puede realizar la inscripción',
          message: error.message
        });
      }
      next(error);
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
   * Registrar check-in (admin)
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
   * POST /api/enrollments/:id/mark-used
   * Marcar como usada/asistencia completa (admin)
   */
  async markUsed(req, res, next) {
    try {
      const { id } = req.params;

      const result = await EnrollmentService.markAsUsed(id);

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
          error: 'No se puede registrar asistencia',
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
  }
};

module.exports = EnrollmentController;
