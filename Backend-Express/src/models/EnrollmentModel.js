const { supabaseAdmin } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Modelo de Inscripción
 * Maneja operaciones CRUD sobre la tabla 'enrollments'
 */
const EnrollmentModel = {
  /**
   * Obtener todas las inscripciones de un usuario
   * @param {string} userId - UUID del usuario
   * @param {string} status - Filtrar por estado (opcional)
   * @returns {Promise<Array>} Lista de inscripciones
   */
  async findByUser(userId, status = null) {
    let query = supabaseAdmin
      .from('enrollments')
      .select(`
        *,
        events (
          id,
          title,
          description,
          date,
          modality,
          duration,
          location,
          status
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener inscripción por ID
   * @param {string} id - UUID de la inscripción
   * @returns {Promise<Object|null>} Inscripción o null
   */
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select(`
        *,
        events (
          id,
          title,
          description,
          date,
          modality,
          duration,
          location,
          status,
          min_attendance_percentage
        ),
        users (
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Obtener inscripción por usuario y evento
   * @param {string} userId - UUID del usuario
   * @param {string} eventId - UUID del evento
   * @returns {Promise<Object|null>} Inscripción o null
   */
  async findByUserAndEvent(userId, eventId) {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select(`
        *,
        events (
          id,
          title,
          status,
          available_slots
        )
      `)
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Obtener inscripción por QR token
   * @param {string} qrToken - Token QR
   * @returns {Promise<Object|null>} Inscripción o null
   */
  async findByQrToken(qrToken) {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select(`
        *,
        events (
          id,
          title,
          status
        ),
        users (
          id,
          name,
          email
        )
      `)
      .eq('qr_token', qrToken)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Crear una nueva inscripción
   * @param {Object} enrollmentData - Datos de la inscripción
   * @param {string} enrollmentData.user_id - UUID del usuario
   * @param {string} enrollmentData.event_id - UUID del evento
   * @returns {Promise<Object>} Inscripción creada
   */
  async create({ user_id, event_id }) {
    // Generar token QR único
    const qrToken = `ENROLL-${uuidv4()}-${Date.now()}`;

    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .insert([{
        user_id,
        event_id,
        qr_token: qrToken
      }])
      .select(`
        *,
        events (
          id,
          title,
          description,
          date,
          modality,
          duration,
          location,
          status
        )
      `)
      .limit(1);

    if (error) throw error;
    return data[0];
  },

  /**
   * Actualizar inscripción
   * @param {string} id - UUID de la inscripción
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<Object>} Inscripción actualizada
   */
  async update(id, updates) {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        events (
          id,
          title,
          date,
          modality
        )
      `)
      .limit(1);

    if (error) throw error;
    return data[0];
  },

  /**
   * Cancelar inscripción
   * @param {string} id - UUID de la inscripción
   * @returns {Promise<Object>} Inscripción actualizada
   */
  async cancel(id) {
    return await this.update(id, { status: 'cancelled' });
  },

  /**
   * Registrar check-in
   * @param {string} id - UUID de la inscripción
   * @returns {Promise<Object>} Inscripción actualizada
   */
  async checkIn(id) {
    return await this.update(id, { check_in: new Date().toISOString() });
  },

  /**
   * Registrar check-out
   * @param {string} id - UUID de la inscripción
   * @returns {Promise<Object>} Inscripción actualizada
   */
  async checkOut(id) {
    return await this.update(id, { check_out: new Date().toISOString() });
  },

  /**
   * Obtener todas las inscripciones de un evento
   * @param {string} eventId - UUID del evento
   * @returns {Promise<Array>} Lista de inscripciones
   */
  async findByEvent(eventId) {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select(`
        *,
        users (
          id,
          name,
          email
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
};

module.exports = EnrollmentModel;
