const { supabaseAdmin } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Modelo de Sesiones de Evento
 * Maneja operaciones CRUD sobre la tabla 'event_sessions'
 * Cada sesión representa una entrada y salida de un evento
 */
const EventSessionModel = {
  /**
   * Crear una nueva sesión
   * @param {string} enrollmentId - UUID de la inscripción
   * @returns {Promise<Object>} Sesión creada
   */
  async create(enrollmentId) {
    const { data, error } = await supabaseAdmin
      .from('event_sessions')
      .insert([{
        id: uuidv4(),
        enrollment_id: enrollmentId,
        start_time: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Obtener sesión activa (sin end_time)
   * @param {string} enrollmentId - UUID de la inscripción
   * @returns {Promise<Object|null>} Sesión activa o null
   */
  async findActiveSession(enrollmentId) {
    const { data, error } = await supabaseAdmin
      .from('event_sessions')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .is('end_time', null)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Obtener todas las sesiones de una inscripción
   * @param {string} enrollmentId - UUID de la inscripción
   * @returns {Promise<Array>} Lista de sesiones
   */
  async findByEnrollment(enrollmentId) {
    const { data, error } = await supabaseAdmin
      .from('event_sessions')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Cerrar sesión activa (registrar end_time)
   * @param {string} sessionId - UUID de la sesión
   * @returns {Promise<Object>} Sesión actualizada
   */
  async closeSession(sessionId) {
    const { data, error } = await supabaseAdmin
      .from('event_sessions')
      .update({
        end_time: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select();

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Cerrar todas las sesiones de un evento
   */
  async closeAllEventSessions(eventId) {
    // 1. Obtener enrollments
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('event_id', eventId);

    if (enrollments && enrollments.length > 0) {
      const enrollmentIds = enrollments.map(e => e.id);
      await supabaseAdmin
        .from('event_sessions')
        .update({ end_time: new Date().toISOString() })
        .is('end_time', null)
        .in('enrollment_id', enrollmentIds);
    }
  },

  /**
   * Obtener sesiones por evento
   * @param {string} eventId - UUID del evento
   * @returns {Promise<Array>} Lista de sesiones
   */
  async findByEvent(eventId) {
    const { data, error } = await supabaseAdmin
      .from('event_sessions')
      .select(`
        *,
        enrollments (
          id,
          user_id,
          event_id,
          status,
          users (
            id,
            name,
            email
          )
        )
      `)
      .eq('enrollments.event_id', eventId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

module.exports = EventSessionModel;
