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
   * Cerrar todas las sesiones abiertas de un evento Y acumular active_seconds
   * @param {string} eventId - UUID del evento
   * @returns {Promise<number>} Cantidad de sesiones cerradas
   */
  async closeAllEventSessions(eventId) {
    // 1. Obtener enrollments del evento
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('event_id', eventId);

    if (!enrollments || enrollments.length === 0) return 0;

    const enrollmentIds = enrollments.map(e => e.id);

    // 2. Obtener todas las sesiones abiertas (con start_time para calcular duración)
    const { data: openSessions } = await supabaseAdmin
      .from('event_sessions')
      .select('id, enrollment_id, start_time')
      .is('end_time', null)
      .in('enrollment_id', enrollmentIds);

    if (!openSessions || openSessions.length === 0) return 0;

    const now = new Date();
    const nowISO = now.toISOString();

    // 3. Cerrar todas las sesiones abiertas
    const sessionIds = openSessions.map(s => s.id);
    await supabaseAdmin
      .from('event_sessions')
      .update({ end_time: nowISO })
      .in('id', sessionIds);

    // 4. Calcular y acumular active_seconds por cada enrollment
    // Agrupar sesiones por enrollment_id y sumar duraciones
    const secondsByEnrollment = {};
    for (const session of openSessions) {
      const startTime = new Date(session.start_time);
      const durationSeconds = Math.max(0, Math.round((now.getTime() - startTime.getTime()) / 1000));
      if (durationSeconds > 0) {
        if (!secondsByEnrollment[session.enrollment_id]) {
          secondsByEnrollment[session.enrollment_id] = 0;
        }
        secondsByEnrollment[session.enrollment_id] += durationSeconds;
      }
    }

    // 5. Actualizar active_seconds para cada enrollment afectado
    for (const [enrollmentId, seconds] of Object.entries(secondsByEnrollment)) {
      // Obtener valor actual
      const { data: current } = await supabaseAdmin
        .from('enrollments')
        .select('active_seconds')
        .eq('id', enrollmentId)
        .single();

      const currentSeconds = current?.active_seconds || 0;

      await supabaseAdmin
        .from('enrollments')
        .update({ active_seconds: currentSeconds + seconds })
        .eq('id', enrollmentId);
    }

    return openSessions.length;
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
