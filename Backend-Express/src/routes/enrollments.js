const express = require('express');
const router = express.Router();
const EnrollmentController = require('../controllers/enrollmentController');
const authMiddleware = require('../middlewares/auth');

/**
 * Rutas de inscripciones
 * Base: /api/enrollments
 */

// Rutas protegidas para estudiantes
router.post('/:eventId',
  authMiddleware.authenticate,
  EnrollmentController.enroll
);

router.get('/my-enrollments',
  authMiddleware.authenticate,
  EnrollmentController.myEnrollments
);

router.get('/:id',
  authMiddleware.authenticate,
  EnrollmentController.show
);

router.delete('/:id',
  authMiddleware.authenticate,
  EnrollmentController.cancel
);

// Ruta pública para validar QR
router.get('/qr/:qrToken',
  EnrollmentController.getByQr
);

// Check-in: estudiante (id = eventId) o admin (id = enrollmentId)
router.post('/:id/check-in',
  authMiddleware.authenticate,
  EnrollmentController.checkInDispatcher
);

// Check-out: estudiante (id = eventId) o admin (id = enrollmentId)
// Usa authenticateWithQueryToken para soportar navigator.sendBeacon (sin headers)
router.post('/:id/check-out',
  authMiddleware.authenticateWithQueryToken,
  EnrollmentController.checkOutDispatcher
);

router.post('/:id/mark-used',
  authMiddleware.authenticate,
  authMiddleware.requireRole('admin'),
  EnrollmentController.markUsed
);

// Obtener inscripciones de un evento (admin)
router.get('/event/:eventId',
  authMiddleware.authenticate,
  authMiddleware.requireRole('admin'),
  EnrollmentController.getEventEnrollments
);

// Obtener porcentaje de asistencia (student - propia)
router.get('/:eventId/attendance',
  authMiddleware.authenticate,
  EnrollmentController.getAttendance
);

// Registrar tiempo de asistencia activa (student)
router.post('/:eventId/attendance-time',
  authMiddleware.authenticate,
  EnrollmentController.addAttendanceTime
);

module.exports = router;
