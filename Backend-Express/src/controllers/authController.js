const AuthService = require('../services/AuthService');
const { supabaseAdmin } = require('../config/database');

/**
 * Controlador de Autenticación
 * Maneja las rutas de registro y login
 */
const AuthController = {
  /**
   * POST /api/auth/register
   * Registrar un nuevo usuario
   */
  async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;

      // Validaciones básicas
      if (!name || !email || !password) {
        return res.status(400).json({
          error: 'Datos incompletos',
          message: 'Nombre, email y contraseña son requeridos'
        });
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Email inválido',
          message: 'El email no tiene un formato válido'
        });
      }

      // Validar longitud de contraseña
      if (password.length < 6) {
        return res.status(400).json({
          error: 'Contraseña débil',
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      // Validar rol (solo student por defecto, admin solo por servicio)
      const validRoles = ['student'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Rol inválido',
          message: 'El rol debe ser "student"'
        });
      }

      // Registrar usuario
      const user = await AuthService.register({
        name,
        email,
        password,
        role: role || 'student'
      });

      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        user
      });
    } catch (error) {
      if (error.code === 'DUPLICATE_EMAIL') {
        return res.status(409).json({
          error: 'Conflicto',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   * Iniciar sesión
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validaciones básicas
      if (!email || !password) {
        return res.status(400).json({
          error: 'Datos incompletos',
          message: 'Email y contraseña son requeridos'
        });
      }

      // Login
      const { user, token } = await AuthService.login(email, password);

      res.json({
        message: 'Inicio de sesión exitoso',
        user,
        token
      });
    } catch (error) {
      if (['INVALID_CREDENTIALS', 'INACTIVE_USER'].includes(error.code)) {
        return res.status(401).json({
          error: 'Autenticación fallida',
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   * Obtener datos del usuario autenticado
   */
  async getMe(req, res, next) {
    try {
      const result = await supabaseAdmin
        .from('users')
        .select('id, name, email, role, is_active, created_at, updated_at')
        .eq('id', req.user.id);

      if (result.error) throw result.error;

      const users = result.data;
      const user = users && users.length > 0 ? users[0] : null;

      if (!user) {
        return res.status(404).json({
          error: 'No encontrado',
          message: 'Usuario no encontrado'
        });
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = AuthController;
