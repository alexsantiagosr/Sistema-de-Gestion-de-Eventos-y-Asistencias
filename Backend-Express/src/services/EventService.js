const EventModel = require('../models/EventModel');

/**
 * Servicio de Eventos
 * Maneja la lógica de negocio para eventos
 */
const EventService = {
  /**
   * Obtener todos los eventos con filtros
   */
  async getEvents(filters) {
    return await EventModel.findAll(filters);
  },

  /**
   * Obtener evento por ID
   */
  async getEventById(id) {
    const event = await EventModel.findById(id);
    if (!event) {
      const error = new Error('Evento no encontrado');
      error.code = 'NOT_FOUND';
      throw error;
    }
    return event;
  },

  /**
   * Obtener eventos disponibles para inscripción
   */
  async getAvailableEvents() {
    return await EventModel.getAvailableEvents();
  },

  /**
   * Crear un nuevo evento
   * @param {Object} eventData - Datos del evento
   * @param {string} adminId - ID del admin que crea el evento
   */
  async createEvent(eventData, adminId) {
    // Validar datos requeridos
    const requiredFields = ['title', 'date', 'modality', 'capacity', 'duration', 'min_attendance_percentage'];
    const missingFields = requiredFields.filter(field => !eventData[field]);

    if (missingFields.length > 0) {
      const error = new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Validar fecha futura
    const eventDate = new Date(eventData.date);
    if (eventDate <= new Date()) {
      const error = new Error('La fecha del evento debe ser futura');
      error.code = 'INVALID_DATE';
      throw error;
    }

    // Validar modalidad
    const validModalities = ['presencial', 'virtual', 'híbrido'];
    if (!validModalities.includes(eventData.modality)) {
      const error = new Error(`Modalidad inválida. Debe ser: ${validModalities.join(', ')}`);
      error.code = 'INVALID_MODALITY';
      throw error;
    }

    // Validar capacidad
    if (eventData.capacity <= 0) {
      const error = new Error('La capacidad debe ser mayor a 0');
      error.code = 'INVALID_CAPACITY';
      throw error;
    }

    // Validar duración
    if (eventData.duration <= 0) {
      const error = new Error('La duración debe ser mayor a 0');
      error.code = 'INVALID_DURATION';
      throw error;
    }

    // Validar porcentaje de asistencia
    if (eventData.min_attendance_percentage < 1 || eventData.min_attendance_percentage > 100) {
      const error = new Error('El porcentaje mínimo de asistencia debe estar entre 1 y 100');
      error.code = 'INVALID_ATTENDANCE';
      throw error;
    }

    // Crear evento
    return await EventModel.create({
      ...eventData,
      created_by: adminId
    });
  },

  /**
   * Actualizar evento
   * @param {string} id - UUID del evento
   * @param {Object} updates - Campos a actualizar
   */
  async updateEvent(id, updates) {
    // Verificar que existe
    const existing = await this.getEventById(id);

    // Si actualiza fecha, validar que sea futura
    if (updates.date) {
      const eventDate = new Date(updates.date);
      if (eventDate <= new Date()) {
        const error = new Error('La fecha del evento debe ser futura');
        error.code = 'INVALID_DATE';
        throw error;
      }
    }

    // Si actualiza modalidad, validar
    if (updates.modality) {
      const validModalities = ['presencial', 'virtual', 'híbrido'];
      if (!validModalities.includes(updates.modality)) {
        const error = new Error(`Modalidad inválida. Debe ser: ${validModalities.join(', ')}`);
        error.code = 'INVALID_MODALITY';
        throw error;
      }
    }

    // Si actualiza capacidad
    if (updates.capacity !== undefined && updates.capacity <= 0) {
      const error = new Error('La capacidad debe ser mayor a 0');
      error.code = 'INVALID_CAPACITY';
      throw error;
    }

    return await EventModel.update(id, updates);
  },

  /**
   * Eliminar evento (lógico - cambia status a cancelled)
   * @param {string} id - UUID del evento
   */
  async deleteEvent(id) {
    // Verificar que existe
    await this.getEventById(id);

    // Cancelar evento (no se elimina físicamente para mantener integridad)
    return await EventModel.update(id, { status: 'cancelled' });
  },

  /**
   * Cambiar estado del evento
   * @param {string} id - UUID del evento
   * @param {string} status - Nuevo estado (active|completed|cancelled)
   */
  async updateEventStatus(id, status) {
    const validStatus = ['active', 'completed', 'cancelled'];
    if (!validStatus.includes(status)) {
      const error = new Error(`Estado inválido. Debe ser: ${validStatus.join(', ')}`);
      error.code = 'INVALID_STATUS';
      throw error;
    }

    return await EventModel.update(id, { status });
  }
};

module.exports = EventService;
