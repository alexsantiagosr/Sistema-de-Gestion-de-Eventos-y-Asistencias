const CertificateService = require('../services/CertificateService');
const EnrollmentService = require('../services/EnrollmentService');

/**
 * Controlador de Certificados
 * Maneja la generación y descarga de certificados PDF
 */
const CertificateController = {
  /**
   * GET /api/certificates/:eventId/eligibility
   * Verificar si el usuario puede obtener certificado
   */
  async checkEligibility(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;

      const eligibility = await CertificateService.checkEligibility(userId, eventId);

      res.json({
        eligible: true,
        attendance: eligibility
      });
    } catch (error) {
      if (error.code === 'NOT_ENROLLED') {
        return res.status(404).json({
          eligible: false,
          error: 'No inscrito',
          message: error.message
        });
      }
      if (error.code === 'INSUFFICIENT_ATTENDANCE') {
        return res.status(400).json({
          eligible: false,
          error: 'Asistencia insuficiente',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * GET /api/certificates/:eventId
   * Generar y descargar certificado PDF
   */
  async getCertificate(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;

      // Verificar elegibilidad primero
      await CertificateService.checkEligibility(userId, eventId);

      // Generar PDF
      const pdfBuffer = await CertificateService.generateCertificate(userId, eventId);

      // Obtener datos para el nombre del archivo
      const enrollment = await CertificateService.getEnrollmentData(userId, eventId);

      // Configurar headers para descarga
      const filename = `certificado-${enrollment.user.name.replace(/[^a-z0-9]/gi, '-')}-${enrollment.event.title.replace(/[^a-z0-9]/gi, '-')}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Enviar PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error.code === 'NOT_ENROLLED') {
        return res.status(404).json({
          error: 'No inscrito',
          message: error.message
        });
      }
      if (error.code === 'INSUFFICIENT_ATTENDANCE') {
        return res.status(400).json({
          error: 'Asistencia insuficiente',
          message: error.message
        });
      }
      if (error.message.includes('Inscripción no encontrada')) {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * GET /api/certificates/:eventId/preview
   * Obtener datos del certificado (sin generar PDF)
   */
  async previewCertificate(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;

      // Verificar elegibilidad
      const eligibility = await CertificateService.checkEligibility(userId, eventId);
      const enrollment = await CertificateService.getEnrollmentData(userId, eventId);

      res.json({
        eligible: true,
        certificate: {
          user: enrollment.user,
          event: enrollment.event,
          attendance: eligibility,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error.code === 'NOT_ENROLLED') {
        return res.status(404).json({
          eligible: false,
          error: 'No inscrito',
          message: error.message
        });
      }
      if (error.code === 'INSUFFICIENT_ATTENDANCE') {
        return res.status(400).json({
          eligible: false,
          error: 'Asistencia insuficiente',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * GET /api/certificates/my-certificates
   * Listar certificados disponibles para el usuario
   */
  async myCertificates(req, res, next) {
    try {
      const userId = req.user.id;

      // Obtener todas las inscripciones del usuario
      const enrollments = await EnrollmentService.getUserEnrollments(userId);

      const certificates = [];

      for (const enrollment of enrollments) {
        // Solo eventos completados
        if (enrollment.events?.status !== 'completed') {
          continue;
        }

        try {
          const attendance = await EnrollmentService.calculateAttendancePercentage(
            userId, 
            enrollment.event_id
          );

          certificates.push({
            enrollmentId: enrollment.id,
            eventId: enrollment.event_id,
            eventTitle: enrollment.events?.title,
            eventDate: enrollment.events?.date,
            attendancePercentage: attendance?.percentage || 0,
            minRequired: attendance?.min_required || 0,
            eligible: attendance?.certified || false,
            canDownload: attendance?.certified || false
          });
        } catch {
          // Si no se puede calcular asistencia, skip
        }
      }

      res.json({
        count: certificates.length,
        certificates
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = CertificateController;
