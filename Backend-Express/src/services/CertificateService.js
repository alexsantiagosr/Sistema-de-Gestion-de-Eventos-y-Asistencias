const PDFDocument = require('pdfkit');
const EnrollmentService = require('./EnrollmentService');
const { supabaseAdmin } = require('../config/database');

/**
 * Servicio de Generación de Certificados PDF
 * Genera certificados de asistencia para eventos con diseño profesional
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
      margin: 0,
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
          location,
          organized_by,
          min_attendance_percentage
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
        location: enrollment.events?.location,
        organized_by: enrollment.events?.organized_by || null,
        min_attendance_percentage: enrollment.events?.min_attendance_percentage || 80
      },
      attendance: {
        active_seconds: enrollment.active_seconds || 0
      }
    };
  },

  // ─── Color palette ───
  colors: {
    navy:      '#0f2b46',
    darkNavy:  '#091e33',
    gold:      '#c9a84c',
    darkGold:  '#a88a3a',
    teal:      '#2a7d8c',
    lightTeal: '#e8f4f6',
    text:      '#1a1a2e',
    subtle:    '#6b7280',
    muted:     '#9ca3af',
    bg:        '#fdfcfa',
    line:      '#d1d5db',
    white:     '#ffffff',
  },

  /**
   * Dibujar el certificado en el documento PDF
   */
  drawCertificate(doc, enrollment, eligibility) {
    const { width, height } = doc.page;
    const c = this.colors;

    // ─── 1. FONDO ───
    doc.rect(0, 0, width, height).fill(c.bg);

    // ─── 2. FRANJA SUPERIOR (header decorativo) ───
    doc.rect(0, 0, width, 90).fill(c.navy);
    // Línea dorada bajo el header
    doc.rect(0, 90, width, 4).fill(c.gold);

    // ─── 3. FRANJA INFERIOR ───
    doc.rect(0, height - 60, width, 60).fill(c.navy);
    doc.rect(0, height - 64, width, 4).fill(c.gold);

    // ─── 4. BORDE DECORATIVO INTERIOR ───
    doc.lineWidth(1.5);
    doc.strokeColor(c.gold);
    doc.roundedRect(30, 108, width - 60, height - 186, 3).stroke();

    // Borde interior fino
    doc.lineWidth(0.5);
    doc.strokeColor(c.line);
    doc.roundedRect(36, 114, width - 72, height - 198, 2).stroke();

    // ─── 5. ESQUINAS DECORATIVAS ───
    this.drawCornerOrnament(doc, 38, 116, c.gold);
    this.drawCornerOrnament(doc, width - 38, 116, c.gold, true, false);
    this.drawCornerOrnament(doc, 38, height - 82, c.gold, false, true);
    this.drawCornerOrnament(doc, width - 38, height - 82, c.gold, true, true);

    // ─── 6. LOGOTIPO / TEXTO INSTITUCIONAL EN HEADER ───
    doc.fillColor(c.white);
    doc.fontSize(11);
    doc.font('Helvetica');
    doc.text('SISTEMA DE GESTIÓN DE EVENTOS Y ASISTENCIAS', 0, 25, {
      align: 'center',
      width
    });
    doc.fontSize(9);
    doc.fillColor(c.gold);
    doc.text('SGEH — Plataforma Académica Institucional', 0, 45, {
      align: 'center',
      width
    });

    // ─── 7. LÍNEA DORADA DECORATIVA ───
    const ornY = 130;
    doc.lineWidth(0.5);
    doc.strokeColor(c.gold);
    doc.moveTo(width / 2 - 120, ornY).lineTo(width / 2 - 20, ornY).stroke();
    doc.moveTo(width / 2 + 20, ornY).lineTo(width / 2 + 120, ornY).stroke();
    // Diamante central
    const dX = width / 2, dY = ornY;
    doc.save();
    doc.fillColor(c.gold);
    doc.moveTo(dX, dY - 5).lineTo(dX + 5, dY).lineTo(dX, dY + 5).lineTo(dX - 5, dY).closePath().fill();
    doc.restore();

    // ─── 8. TÍTULO ───
    doc.fillColor(c.navy);
    doc.fontSize(30);
    doc.font('Helvetica-Bold');
    doc.text('CERTIFICADO DE ASISTENCIA', 0, 145, {
      align: 'center',
      width,
      characterSpacing: 2
    });

    // ─── 9. SUBTÍTULO ───
    doc.fillColor(c.teal);
    doc.fontSize(12);
    doc.font('Helvetica');
    doc.text('Se otorga el presente certificado a:', 0, 190, {
      align: 'center',
      width
    });

    // ─── 10. NOMBRE DEL ESTUDIANTE ───
    doc.fillColor(c.navy);
    doc.fontSize(26);
    doc.font('Helvetica-Bold');
    doc.text(enrollment.user.name.toUpperCase(), 0, 215, {
      align: 'center',
      width,
      characterSpacing: 1.5
    });

    // Línea bajo el nombre
    const nameWidth = Math.min(380, enrollment.user.name.length * 14);
    doc.lineWidth(1);
    doc.strokeColor(c.gold);
    doc.moveTo(width / 2 - nameWidth / 2, 248).lineTo(width / 2 + nameWidth / 2, 248).stroke();

    // Email
    doc.fontSize(10);
    doc.font('Helvetica');
    doc.fillColor(c.subtle);
    doc.text(enrollment.user.email, 0, 256, {
      align: 'center',
      width
    });

    // ─── 11. CUERPO — POR HABER ASISTIDO ───
    doc.fillColor(c.text);
    doc.fontSize(11);
    doc.font('Helvetica');
    doc.text('Por haber participado satisfactoriamente en el evento:', 0, 285, {
      align: 'center',
      width
    });

    // Nombre del evento
    doc.fillColor(c.navy);
    doc.fontSize(20);
    doc.font('Helvetica-Bold');
    doc.text(`"${enrollment.event.title}"`, 80, 308, {
      align: 'center',
      width: width - 160
    });

    // ─── 12. DETALLES DEL EVENTO ───
    const detailY = 345;
    doc.fontSize(9.5);
    doc.font('Helvetica');
    doc.fillColor(c.subtle);

    const detailParts = [
      this.formatDate(enrollment.event.date),
      `${this.capitalize(enrollment.event.modality)}${enrollment.event.location ? ' — ' + enrollment.event.location : ''}`
    ];

    doc.text(detailParts.join('     |     '), 60, detailY, {
      align: 'center',
      width: width - 120
    });

    if (enrollment.event.organized_by) {
      doc.text(`Organizado por: ${enrollment.event.organized_by}`, 0, detailY + 18, {
        align: 'center',
        width
      });
    }

    // ─── 13. (SECCIÓN DE ASISTENCIA REMOVIDA PARA DISEÑO MÁS LIMPIO) ───

    // ─── 14. FIRMAS ───
    const sigY = height - 140;

    // Firma izquierda
    const sigLeftX = width / 2 - 180;
    doc.lineWidth(1);
    doc.strokeColor(c.navy);
    doc.moveTo(sigLeftX - 80, sigY).lineTo(sigLeftX + 80, sigY).stroke();
    doc.fillColor(c.navy);
    doc.fontSize(10);
    doc.font('Helvetica-Bold');
    doc.text('COORDINADOR ACADÉMICO', sigLeftX - 80, sigY + 8, { align: 'center', width: 160 });
    doc.fontSize(8);
    doc.font('Helvetica');
    doc.fillColor(c.subtle);
    doc.text('Dirección de Eventos', sigLeftX - 80, sigY + 22, { align: 'center', width: 160 });

    // Firma derecha
    const sigRightX = width / 2 + 180;
    doc.lineWidth(1);
    doc.strokeColor(c.navy);
    doc.moveTo(sigRightX - 80, sigY).lineTo(sigRightX + 80, sigY).stroke();
    doc.fillColor(c.navy);
    doc.fontSize(10);
    doc.font('Helvetica-Bold');
    doc.text('DIRECTOR DE PROGRAMA', sigRightX - 80, sigY + 8, { align: 'center', width: 160 });
    doc.fontSize(8);
    doc.font('Helvetica');
    doc.fillColor(c.subtle);
    doc.text('Facultad Académica', sigRightX - 80, sigY + 22, { align: 'center', width: 160 });

    // ─── 15. PIE DE PÁGINA (sobre la franja navy) ───
    const footY = height - 50;
    const verificationCode = `CERT-${enrollment.event.title.replace(/[^a-z0-9]/gi, '').substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    doc.fillColor(c.muted);
    doc.fontSize(7.5);
    doc.font('Helvetica');
    doc.text(
      `Certificado generado el ${new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: 'long', day: 'numeric' })}  •  Código de verificación: ${verificationCode}`,
      0, footY, { align: 'center', width }
    );
    doc.text(
      'SGEH — Sistema de Gestión de Eventos y Asistencias  •  Documento generado automáticamente',
      0, footY + 13, { align: 'center', width }
    );
  },

  /**
   * Dibujar ornamento de esquina
   */
  drawCornerOrnament(doc, x, y, color, flipX = false, flipY = false) {
    const size = 20;
    const dx = flipX ? -1 : 1;
    const dy = flipY ? -1 : 1;

    doc.lineWidth(1.5);
    doc.strokeColor(color);

    // L shape
    doc.moveTo(x, y + dy * size).lineTo(x, y).lineTo(x + dx * size, y).stroke();

    // Inner dot
    doc.lineWidth(1);
    doc.moveTo(x + dx * 4, y + dy * 4).lineTo(x + dx * 8, y + dy * 4).stroke();
    doc.moveTo(x + dx * 4, y + dy * 4).lineTo(x + dx * 4, y + dy * 8).stroke();
  },

  /**
   * Formatear fecha
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
