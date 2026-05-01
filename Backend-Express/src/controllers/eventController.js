const EventService = require('../services/EventService');
const EventModel = require('../models/EventModel');

/**
 * Controlador de Eventos
 * Maneja las rutas CRUD para eventos
 */
const EventController = {
  /**
   * GET /api/events
   * Listar todos los eventos (con filtros opcionales)
   */
  async index(req, res, next) {
    try {
      // Auto-finalizar eventos vencidos (lazy update)
      await EventModel.autoFinishEvents();

      const { status, modality } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (modality) filters.modality = modality;

      const events = await EventService.getEvents(filters);

      res.json({
        count: events.length,
        events
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/events/available
   * Listar eventos disponibles para inscripción
   */
  async available(req, res, next) {
    try {
      // Auto-finalizar eventos vencidos (lazy update)
      await EventModel.autoFinishEvents();

      const events = await EventService.getAvailableEvents();

      res.json({
        count: events.length,
        events
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/events/:id
   * Obtener detalle de un evento
   */
  async show(req, res, next) {
    try {
      const { id } = req.params;
      const event = await EventService.getEventById(id);

      res.json({ event });
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * GET /api/events/:eventId/virtual-access
   * Estudiante inscrito: valida acceso a sala virtual en ventana del evento
   */
  async virtualAccess(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await EventService.checkStudentVirtualAccess(userId, eventId, userRole);

      res.json(result);
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      if (
        [
          'NOT_ENROLLED',
          'ENROLLMENT_NOT_ACTIVE',
          'INVALID_MODALITY_FOR_VIRTUAL',
          'OUTSIDE_EVENT_WINDOW',
          'EVENT_NOT_ACTIVE',
          'ROOM_NOT_LIVE'
        ].includes(error.code)
      ) {
        return res.status(403).json({
          error: 'Acceso denegado',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * POST /api/events
   * Crear un nuevo evento (solo admin)
   */
  async create(req, res, next) {
    try {
      const eventData = req.body;

      const event = await EventService.createEvent(eventData, req.user.id);

      res.status(201).json({
        message: 'Evento creado exitosamente',
        event
      });
    } catch (error) {
      if (['VALIDATION_ERROR', 'INVALID_DATE', 'INVALID_MODALITY', 'INVALID_CAPACITY', 'INVALID_DURATION', 'INVALID_ATTENDANCE'].includes(error.code)) {
        return res.status(400).json({
          error: 'Datos inválidos',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * PUT /api/events/:id
   * Actualizar un evento (solo admin)
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // El usuario no puede modificar created_by
      delete updates.created_by;

      const event = await EventService.updateEvent(id, updates);

      res.json({
        message: 'Evento actualizado exitosamente',
        event
      });
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      if (['INVALID_DATE', 'INVALID_MODALITY', 'INVALID_CAPACITY'].includes(error.code)) {
        return res.status(400).json({
          error: 'Datos inválidos',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * DELETE /api/events/:id
   * Eliminar un evento (solo admin - cancelación lógica)
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      await EventService.deleteEvent(id);

      res.json({
        message: 'Evento eliminado exitosamente'
      });
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * PATCH /api/events/:id/status
   * Cambiar estado de un evento (solo admin)
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          error: 'Datos incompletos',
          message: 'El campo "status" es requerido'
        });
      }

      const event = await EventService.updateEventStatus(id, status);

      res.json({
        message: 'Estado actualizado exitosamente',
        event
      });
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      if (error.code === 'INVALID_STATUS') {
        return res.status(400).json({
          error: 'Datos inválidos',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * POST /api/events/:id/start
   * Iniciar sala virtual (solo admin)
   */
  async startVirtualRoom(req, res, next) {
    try {
      const { id } = req.params;
      const event = await EventService.startVirtualRoom(id);
      res.json({
        message: 'Sala iniciada exitosamente',
        event
      });
    } catch (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'No encontrado',
          message: error.message
        });
      }
      if (error.code === 'EVENT_NOT_ACTIVE') {
        return res.status(400).json({
          error: 'Acción no permitida',
          message: error.message
        });
      }
      next(error);
    }
  }
};

module.exports = EventController;
