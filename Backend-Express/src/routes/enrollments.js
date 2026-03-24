const express = require('express');
const router = express.Router();
const EnrollmentController = require('../controllers/EnrollmentController');
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

// Rutas de administración (check-in, check-out, mark-used)
router.post('/:id/check-in',
  authMiddleware.authenticate,
  authMiddleware.requireRole('admin'),
  EnrollmentController.checkIn
);

router.post('/:id/check-out',
  authMiddleware.authenticate,
  authMiddleware.requireRole('admin'),
  EnrollmentController.checkOut
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

module.exports = router;
