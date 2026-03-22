const express = require('express');
const router = express.Router();
const CertificateController = require('../controllers/CertificateController');
const authMiddleware = require('../middlewares/auth');

/**
 * Rutas de certificados
 * Base: /api/certificates
 */

// Todas las rutas requieren autenticación
router.use(authMiddleware.authenticate);

// Listar mis certificados disponibles
router.get('/my-certificates',
  CertificateController.myCertificates
);

// Verificar elegibilidad para certificado
router.get('/:eventId/eligibility',
  CertificateController.checkEligibility
);

// Obtener vista previa del certificado
router.get('/:eventId/preview',
  CertificateController.previewCertificate
);

// Descargar certificado PDF
router.get('/:eventId',
  CertificateController.getCertificate
);

module.exports = router;
