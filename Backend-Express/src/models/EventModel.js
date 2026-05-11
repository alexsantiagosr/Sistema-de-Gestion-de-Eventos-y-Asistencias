const { supabaseAdmin } = require('../config/database');

/**
 * Modelo de Evento
 * Maneja operaciones CRUD sobre la tabla 'events'
 */
const EventModel = {
  /**
   * Obtener todos los eventos
   * @param {Object} options - Opciones de consulta
   * @param {string} options.status - Filtrar por estado
   * @param {string} options.modality - Filtrar por modalidad
   * @param {number} options.limit - Límite de registros
   * @param {number} options.offset - Desplazamiento
   * @returns {Promise<Array>} Lista de eventos
   */
  async findAll({ status, modality, limit = 100, offset = 0 } = {}) {
    let query = supabaseAdmin
      .from('events')
      .select(`
        *,
        created_by (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (modality) {
      query = query.eq('modality', modality);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener evento por ID
   * @param {string} id - UUID del evento
   * @returns {Promise<Object|null>} Evento o null
   */
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        created_by (
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST110') throw error;
    return data || null;
  },

  /**
   * Crear un nuevo evento
   * @param {Object} eventData - Datos del evento
   * @param {string} eventData.title - Título del evento
   * @param {string} eventData.description - Descripción
   * @param {Date} eventData.date - Fecha del evento
   * @param {string} eventData.modality - Modalidad (presencial|virtual|híbrido)
   * @param {number} eventData.capacity - Capacidad máxima
   * @param {number} eventData.duration - Duración en minutos
   * @param {number} eventData.min_attendance_percentage - Porcentaje mínimo de asistencia
   * @param {string} eventData.location - Ubicación (opcional)
   * @param {string} eventData.created_by - UUID del creador (admin)
   * @returns {Promise<Object>} Evento creado
   */
  async create({
    title,
    description,
    date,
    modality,
    capacity,
    duration,
    min_attendance_percentage,
    location,
    organized_by,
    created_by
  }) {
    const { data, error } = await supabaseAdmin
      .from('events')
      .insert([{
        title,
        description,
        date,
        modality,
        capacity,
        duration,
        min_attendance_percentage,
        location,
        organized_by,
        created_by
      }])
      .select(`
        *,
        created_by (
          id,
          name,
          email
        )
      `)
      .limit(1);

    if (error) throw error;
    return data[0];
  },

  /**
   * Actualizar evento
   * @param {string} id - UUID del evento
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<Object>} Evento actualizado
   */
  async update(id, updates) {
    const { data, error } = await supabaseAdmin
      .from('events')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        created_by (
          id,
          name,
          email
        )
      `)
      .limit(1);

    if (error) throw error;
    return data[0];
  },

  /**
   * Eliminar evento
   * @param {string} id - UUID del evento
   * @returns {Promise<void>}
   */
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Obtener eventos activos con cupos disponibles
   * @returns {Promise<Array>} Lista de eventos disponibles
   */
  async getAvailableEvents() {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        created_by (
          id,
          name,
          email
        )
      `)
      .eq('status', 'active')
      .gt('available_slots', 0)
      .gte('date', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async autoFinishEvents() {
    // 1. Obtener eventos activos
    const { data: activeEvents, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('id, date, duration, is_live')
      .eq('status', 'active');

    if (fetchError) throw fetchError;
    if (!activeEvents || activeEvents.length === 0) return 0;

    const now = new Date().getTime();
    
    // 2. Identificar cuáles deben finalizar (date + duration <= NOW)
    const eventsToFinish = activeEvents.filter(event => {
       const eventEndTime = new Date(event.date).getTime() + (event.duration * 60 * 1000);
       return eventEndTime <= now;
    });

    if (eventsToFinish.length === 0) return 0;

    const newlyFinishedIds = eventsToFinish.map(e => e.id);

    // 3. CERRAR SESIONES ABIERTAS y acumular active_seconds (FIX CRÍTICO)
    // Esto asegura que estudiantes presenciales que nunca recibieron un segundo
    // escaneo QR tengan su tiempo correctamente acumulado antes de evaluar certificación
    const EventSessionModel = require('./EventSessionModel');
    for (const eventId of newlyFinishedIds) {
      await EventSessionModel.closeAllEventSessions(eventId);
    }

    // 4. SOLO para esos eventos:
    const { data: enrollmentsData } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .in('event_id', newlyFinishedIds);

    if (enrollmentsData && enrollmentsData.length > 0) {
      const enrollmentIds = enrollmentsData.map(e => e.id);

      // Actualizar check_out = NOW() si está null
      await supabaseAdmin
        .from('enrollments')
        .update({ check_out: new Date().toISOString() })
        .is('check_out', null)
        .in('id', enrollmentIds);

      // Actualizar status = 'completed' si active_seconds > 0
      await supabaseAdmin
        .from('enrollments')
        .update({ status: 'completed' })
        .gt('active_seconds', 0)
        .in('id', enrollmentIds);
    }

    // Actualizar status de los eventos a 'finished'
    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({ status: 'finished' })
      .in('id', newlyFinishedIds);

    if (updateError) throw updateError;

    return newlyFinishedIds.length;
  }
};

module.exports = EventModel;
