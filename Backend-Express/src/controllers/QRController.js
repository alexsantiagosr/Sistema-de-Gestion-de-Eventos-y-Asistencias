const QRService = require('../services/QRService');
const EnrollmentService = require('../services/EnrollmentService');

/**
 * Controlador de Códigos QR
 * Maneja la generación y descarga de QR para inscripciones
 */
const QRController = {
  /**
   * GET /api/qr/:enrollmentId
   * Obtener QR de una inscripción (formato JSON con data URL)
   */
  async getQR(req, res, next) {
    try {
      const { enrollmentId } = req.params;
      const userId = req.user.id;

      // Verificar que la inscripción pertenece al usuario
      const enrollment = await EnrollmentService.getEnrollment(enrollmentId);

      if (enrollment.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Prohibido',
          message: 'No tienes permiso para ver este QR'
        });
      }

      const qrData = await QRService.generateForEnrollment(enrollmentId);

      res.json({
        success: true,
        qr: qrData
      });
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: 'Inscripción no encontrada'
        });
      }
      if (error.message.includes('Error generando QR')) {
        return res.status(500).json({
          error: 'Error generando QR',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * GET /api/qr/:enrollmentId/download
   * Descargar QR como imagen PNG
   */
  async downloadQR(req, res, next) {
    try {
      const { enrollmentId } = req.params;
      const userId = req.user.id;

      // Verificar que la inscripción pertenece al usuario
      const enrollment = await EnrollmentService.getEnrollment(enrollmentId);

      if (enrollment.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Prohibido',
          message: 'No tienes permiso para descargar este QR'
        });
      }

      const qrData = await QRService.generateDownloadable(enrollmentId);

      // Configurar headers para descarga
      res.setHeader('Content-Type', qrData.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${qrData.filename}"`);

      // Enviar buffer
      res.send(qrData.buffer);
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: 'Inscripción no encontrada'
        });
      }
      if (error.message.includes('Error generando QR')) {
        return res.status(500).json({
          error: 'Error generando QR',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * GET /api/qr/:enrollmentId/svg
   * Obtener QR en formato SVG
   */
  async getQRSVG(req, res, next) {
    try {
      const { enrollmentId } = req.params;
      const userId = req.user.id;

      // Verificar que la inscripción pertenece al usuario
      const enrollment = await EnrollmentService.getEnrollment(enrollmentId);

      if (enrollment.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Prohibido',
          message: 'No tienes permiso para ver este QR'
        });
      }

      const svg = await QRService.generateSVG(enrollmentId);

      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: 'Inscripción no encontrada'
        });
      }
      if (error.message.includes('Error generando QR')) {
        return res.status(500).json({
          error: 'Error generando QR',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * GET /api/qr/validate/:qrToken
   * Validar QR y obtener información (también disponible en /api/enrollments/qr/:qrToken)
   */
  async validateQR(req, res, next) {
    try {
      const { qrToken } = req.params;

      const enrollment = await EnrollmentService.getByQrToken(qrToken);

      res.json({
        valid: true,
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          event: {
            id: enrollment.events.id,
            title: enrollment.events.title,
            date: enrollment.events.date,
            modality: enrollment.events.modality,
            location: enrollment.events.location
          },
          user: {
            id: enrollment.users.id,
            name: enrollment.users.name,
            email: enrollment.users.email
          },
          check_in: enrollment.check_in,
          check_out: enrollment.check_out
        },
        message: enrollment.status === 'active' 
          ? 'QR válido - Inscripción activa' 
          : `QR válido - Estado: ${enrollment.status}`
      });
    } catch (error) {
      if (error.code === 'INVALID_QR') {
        return res.status(404).json({
          valid: false,
          error: 'QR inválido',
          message: 'El código QR no existe o ha sido revocado'
        });
      }
      next(error);
    }
  }
};

module.exports = QRController;
