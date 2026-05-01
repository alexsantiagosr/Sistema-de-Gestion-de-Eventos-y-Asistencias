const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');
const authMiddleware = require('../middlewares/auth');

/**
 * Rutas de eventos
 * Base: /api/events
 */

// Rutas públicas (lectura)
router.get('/', EventController.index);
router.get('/available', EventController.available);

// Estudiante: acceso a sala virtual (antes de /:id para evitar ambigüedad)
router.get(
  '/:eventId/virtual-access',
  authMiddleware.authenticate,
  authMiddleware.requireRole('student'),
  EventController.virtualAccess
);

router.get('/:id', EventController.show);

// Rutas protegidas (solo admin)
router.post('/',
  authMiddleware.authenticate,
  authMiddleware.requireRole('admin'),
  EventController.create
);

router.put('/:id',
  authMiddleware.authenticate,
  authMiddleware.requireRole('admin'),
  EventController.update
);

router.delete('/:id',
  authMiddleware.authenticate,
  authMiddleware.requireRole('admin'),
  EventController.delete
);

router.patch('/:id/status',
  authMiddleware.authenticate,
  authMiddleware.requireRole('admin'),
  EventController.updateStatus
);

router.post('/:id/start',
  authMiddleware.authenticate,
  authMiddleware.requireRole('admin'),
  EventController.startVirtualRoom
);

module.exports = router;
