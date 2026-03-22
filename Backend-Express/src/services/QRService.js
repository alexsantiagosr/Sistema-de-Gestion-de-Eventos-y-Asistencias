const QRCode = require('qrcode');
const EnrollmentService = require('./EnrollmentService');

/**
 * Servicio de Generación de QR
 * Maneja la creación de códigos QR para inscripciones
 */
const QRService = {
  /**
   * Generar QR como Data URL (base64)
   * @param {string} data - Datos a codificar
   * @param {Object} options - Opciones de configuración
   * @returns {Promise<string>} Data URL del QR
   */
  async generateDataUrl(data, options = {}) {
    const config = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      ...options
    };

    try {
      const dataUrl = await QRCode.toDataURL(data, config);
      return dataUrl;
    } catch (error) {
      throw new Error('Error generando QR: ' + error.message);
    }
  },

  /**
   * Generar QR como Buffer (para enviar como archivo)
   * @param {string} data - Datos a codificar
   * @param {Object} options - Opciones de configuración
   * @returns {Promise<Buffer>} Buffer del QR en formato PNG
   */
  async generateBuffer(data, options = {}) {
    const config = {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      ...options
    };

    try {
      const buffer = await QRCode.toBuffer(data, config);
      return buffer;
    } catch (error) {
      throw new Error('Error generando QR: ' + error.message);
    }
  },

  /**
   * Generar QR para una inscripción
   * @param {string} enrollmentId - UUID de la inscripción
   * @returns {Promise<Object>} Datos del QR generado
   */
  async generateForEnrollment(enrollmentId) {
    // Obtener inscripción completa
    const enrollment = await EnrollmentService.getEnrollment(enrollmentId);

    // Datos que irá en el QR
    const qrData = {
      type: 'SGEH_ENROLLMENT',
      enrollmentId: enrollment.id,
      qrToken: enrollment.qr_token,
      event: {
        id: enrollment.events.id,
        title: enrollment.events.title,
        date: enrollment.events.date
      },
      user: {
        id: enrollment.users.id,
        name: enrollment.users.name,
        email: enrollment.users.email
      },
      // URL para validar el QR (puede ser la del frontend)
      validationUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/enrollments/qr/${enrollment.qr_token}`
    };

    // Generar QR con el token (más simple para escanear)
    const qrDataUrl = await this.generateDataUrl(enrollment.qr_token, {
      width: 400,
      margin: 3,
      errorCorrectionLevel: 'H' // Mayor corrección de errores
    });

    return {
      enrollmentId: enrollment.id,
      qrToken: enrollment.qr_token,
      qrDataUrl,
      qrData,
      event: {
        title: enrollment.events.title,
        date: enrollment.events.date,
        modality: enrollment.events.modality
      },
      user: {
        name: enrollment.users.name,
        email: enrollment.users.email
      }
    };
  },

  /**
   * Generar QR descargable para una inscripción
   * @param {string} enrollmentId - UUID de la inscripción
   * @returns {Promise<Object>} Buffer y metadata del QR
   */
  async generateDownloadable(enrollmentId) {
    const enrollment = await EnrollmentService.getEnrollment(enrollmentId);

    // Generar QR como buffer
    const qrBuffer = await this.generateBuffer(enrollment.qr_token, {
      width: 500,
      margin: 4,
      errorCorrectionLevel: 'H'
    });

    return {
      buffer: qrBuffer,
      filename: `qr-${enrollment.events.title.replace(/[^a-z0-9]/gi, '-')}-${enrollment.users.email.replace(/[^a-z0-9]/gi, '-')}.png`,
      mimeType: 'image/png',
      enrollmentId: enrollment.id,
      qrToken: enrollment.qr_token
    };
  },

  /**
   * Generar QR con información adicional en formato SVG
   * @param {string} enrollmentId - UUID de la inscripción
   * @returns {Promise<string>} SVG del QR
   */
  async generateSVG(enrollmentId) {
    const enrollment = await EnrollmentService.getEnrollment(enrollmentId);

    const svg = await QRCode.toString(enrollment.qr_token, {
      type: 'svg',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return svg;
  }
};

module.exports = QRService;
