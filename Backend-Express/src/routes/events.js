const express = require('express');
const router = express.Router();
const EventController = require('../controllers/EventController');
const authMiddleware = require('../middlewares/auth');

/**
 * Rutas de eventos
 * Base: /api/events
 */

// Rutas públicas (lectura)
router.get('/', EventController.index);
router.get('/available', EventController.available);
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

module.exports = router;
