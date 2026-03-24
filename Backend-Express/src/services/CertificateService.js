const PDFDocument = require('pdfkit');
const EnrollmentService = require('./EnrollmentService');
const { supabaseAdmin } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Servicio de Generación de Certificados PDF
 * Genera certificados de asistencia para eventos
 */
const CertificateService = {
  /**
   * Verificar si un usuario puede obtener certificado
   * @param {string} userId - UUID del usuario
   * @param {string} eventId - UUID del evento
   * @returns {Promise<Object>} Información de elegibilidad
   */
  async checkEligibility(userId, eventId) {
    const attendance = await EnrollmentService.calculateAttendancePercentage(userId, eventId);

    if (!attendance) {
      const error = new Error('No estás inscrito en este evento');
      error.code = 'NOT_ENROLLED';
      throw error;
    }

    if (!attendance.certified) {
      const error = new Error(`No alcanzas el porcentaje mínimo. Tienes ${attendance.percentage}%, se requiere ${attendance.min_required}%`);
      error.code = 'INSUFFICIENT_ATTENDANCE';
      throw error;
    }

    return {
      eligible: true,
      ...attendance
    };
  },

  /**
   * Generar certificado PDF como buffer
   * @param {string} userId - UUID del usuario
   * @param {string} eventId - UUID del evento
   * @returns {Promise<Buffer>} Buffer del PDF
   */
  async generateCertificate(userId, eventId) {
    // Verificar elegibilidad
    const eligibility = await this.checkEligibility(userId, eventId);

    // Obtener datos completos
    const enrollment = await this.getEnrollmentData(userId, eventId);

    // Crear documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      layout: 'landscape'
    });

    return new Promise((resolve, reject) => {
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Generar contenido
      this.drawCertificate(doc, enrollment, eligibility);

      doc.end();
    });
  },

  /**
   * Obtener datos de inscripción para el certificado
   */
  async getEnrollmentData(userId, eventId) {
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select(`
        *,
        events (
          id,
          title,
          date,
          duration,
          modality,
          location
        ),
        users (
          id,
          name,
          email
        )
      `)
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .limit(1);

    const enrollment = enrollments && enrollments.length > 0 ? enrollments[0] : null;

    if (!enrollment) {
      const error = new Error('Inscripción no encontrada');
      error.code = 'NOT_ENROLLED';
      throw error;
    }

    return {
      user: {
        name: enrollment.users?.name || enrollment.user?.name || 'Usuario',
        email: enrollment.users?.email || enrollment.user?.email || ''
      },
      event: {
        title: enrollment.events?.title || 'Evento',
        date: enrollment.events?.date,
        duration: enrollment.events?.duration,
        modality: enrollment.events?.modality,
        location: enrollment.events?.location
      },
      attendance: {
        check_in: enrollment.check_in,
        check_out: enrollment.check_out
      }
    };
  },

  /**
   * Dibujar el certificado en el documento PDF
   */
  drawCertificate(doc, enrollment, eligibility) {
    const { width, height } = doc.page;
    const centerX = width / 2;
    const centerY = height / 2;

    // === FONDO DECORATIVO ===
    // Borde exterior
    doc.lineWidth(10);
    doc.strokeColor('#1a5f7a');
    doc.rect(20, 20, width - 40, height - 40).stroke();

    // Borde interior
    doc.lineWidth(2);
    doc.strokeColor('#159895');
    doc.rect(35, 35, width - 70, height - 70).stroke();

    // Esquinas decorativas
    this.drawCorner(doc, 45, 45);
    this.drawCorner(doc, width - 45, 45, true, true);
    this.drawCorner(doc, 45, height - 45, true, false);
    this.drawCorner(doc, width - 45, height - 45, false, true);

    // === ENCABEZADO ===
    doc.fillColor('#1a5f7a');
    doc.fontSize(36);
    doc.font('Helvetica-Bold');
    doc.text('CERTIFICADO DE ASISTENCIA', centerX, 100, {
      align: 'center',
      width: width - 200
    });

    // Subtítulo
    doc.fillColor('#159895');
    doc.fontSize(16);
    doc.font('Helvetica');
    doc.text('Se otorga el presente certificado a:', centerX, 160, {
      align: 'center',
      width: width - 200
    });

    // === NOMBRE DEL ESTUDIANTE ===
    doc.fillColor('#000000');
    doc.fontSize(28);
    doc.font('Helvetica-Bold');
    doc.text(enrollment.user.name, centerX, 200, {
      align: 'center',
      width: width - 200
    });

    // Email
    doc.fontSize(14);
    doc.font('Helvetica');
    doc.fillColor('#666666');
    doc.text(enrollment.user.email, centerX, 235, {
      align: 'center',
      width: width - 200
    });

    // === INFORMACIÓN DEL EVENTO ===
    doc.fillColor('#1a5f7a');
    doc.fontSize(18);
    doc.font('Helvetica-Bold');
    doc.text('Por haber asistido al evento:', centerX, 290, {
      align: 'center',
      width: width - 200
    });

    doc.fillColor('#000000');
    doc.fontSize(24);
    doc.font('Helvetica-Bold');
    doc.text(enrollment.event.title, centerX, 325, {
      align: 'center',
      width: width - 200
    });

    // Detalles del evento
    doc.fontSize(14);
    doc.font('Helvetica');
    doc.fillColor('#333333');

    const eventDetails = [
      `Fecha: ${this.formatDate(enrollment.event.date)}`,
      `Duración: ${enrollment.event.duration} minutos`,
      `Modalidad: ${this.capitalize(enrollment.event.modality)}`,
      enrollment.event.location ? `Lugar: ${enrollment.event.location}` : ''
    ].filter(Boolean).join(' | ');

    doc.text(eventDetails, centerX, 375, {
      align: 'center',
      width: width - 200
    });

    // === PORCENTAJE DE ASISTENCIA ===
    const badgeY = 430;
    const badgeX = centerX - 100;

    // Círculo de porcentaje
    doc.lineWidth(8);
    doc.strokeColor('#159895');
    doc.circle(badgeX + 100, badgeY + 50, 60).stroke();

    doc.fillColor('#1a5f7a');
    doc.fontSize(32);
    doc.font('Helvetica-Bold');
    doc.text(`${eligibility.percentage}%`, badgeX + 100, badgeY + 40, {
      align: 'center',
      width: 120
    });

    doc.fontSize(12);
    doc.font('Helvetica');
    doc.text('ASISTENCIA', badgeX + 100, badgeY + 85, {
      align: 'center',
      width: 120
    });

    // === PIE DE PÁGINA ===
    const footerY = height - 120;

    // Línea divisoria
    doc.lineWidth(1);
    doc.strokeColor('#cccccc');
    doc.moveTo(100, footerY);
    doc.lineTo(width - 100, footerY).stroke();

    // Texto de validación
    doc.fillColor('#999999');
    doc.fontSize(10);
    doc.font('Helvetica');
    doc.text(`Certificado generado el: ${new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, centerX, footerY + 15, {
      align: 'center',
      width: width - 200
    });

    // Código de verificación
    const verificationCode = `CERT-${enrollment.event.title.replace(/[^a-z0-9]/gi, '').substring(0, 8).toUpperCase()}-${Date.now()}`;
    doc.text(`Código de verificación: ${verificationCode}`, centerX, footerY + 35, {
      align: 'center',
      width: width - 200
    });

    // === FIRMA ===
    const signatureY = height - 80;
    const signatureX = centerX + 150;

    doc.lineWidth(2);
    doc.strokeColor('#1a5f7a');
    doc.moveTo(signatureX - 100, signatureY);
    doc.lineTo(signatureX + 100, signatureY).stroke();

    doc.fillColor('#1a5f7a');
    doc.fontSize(12);
    doc.font('Helvetica-Bold');
    doc.text('COORDINADOR ACADÉMICO', signatureX, signatureY + 10, {
      align: 'center',
      width: 200
    });

    doc.fontSize(10);
    doc.font('Helvetica');
    doc.fillColor('#666666');
    doc.text('SGEH - Sistema de Gestión de Eventos', signatureX, signatureY + 30, {
      align: 'center',
      width: 200
    });
  },

  /**
   * Dibujar esquina decorativa
   */
  drawCorner(doc, x, y, flipX = false, flipY = false) {
    const size = 30;
    doc.lineWidth(3);
    doc.strokeColor('#159895');

    if (flipX && flipY) { // Superior derecha
      doc.moveTo(x, y - size);
      doc.lineTo(x, y);
      doc.lineTo(x - size, y).stroke();
    } else if (flipX) { // Inferior derecha
      doc.moveTo(x, y + size);
      doc.lineTo(x, y);
      doc.lineTo(x - size, y).stroke();
    } else if (flipY) { // Superior izquierda
      doc.moveTo(x, y - size);
      doc.lineTo(x, y);
      doc.lineTo(x + size, y).stroke();
    } else { // Inferior izquierda
      doc.moveTo(x, y + size);
      doc.lineTo(x, y);
      doc.lineTo(x + size, y).stroke();
    }
  },

  /**
   * Formatear fecha
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Capitalizar primera letra
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

module.exports = CertificateService;
