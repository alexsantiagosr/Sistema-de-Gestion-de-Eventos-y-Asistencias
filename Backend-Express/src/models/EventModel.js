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
      .order('date', { ascending: true });

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
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  }
};

module.exports = EventModel;
