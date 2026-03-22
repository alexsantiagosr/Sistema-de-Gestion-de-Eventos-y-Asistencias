const express = require('express');
const router = express.Router();
const QRController = require('../controllers/QRController');
const authMiddleware = require('../middlewares/auth');

/**
 * Rutas de códigos QR
 * Base: /api/qr
 */

// Rutas protegidas para obtener/descargar QR
router.get('/:enrollmentId',
  authMiddleware.authenticate,
  QRController.getQR
);

router.get('/:enrollmentId/download',
  authMiddleware.authenticate,
  QRController.downloadQR
);

router.get('/:enrollmentId/svg',
  authMiddleware.authenticate,
  QRController.getQRSVG
);

// Ruta pública para validar QR (también disponible en /api/enrollments/qr/:token)
router.get('/validate/:qrToken',
  QRController.validateQR
);

module.exports = router;
