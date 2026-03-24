const bcrypt = require('bcrypt');
const { supabaseAdmin } = require('../config/database');

/**
 * Servicio de Autenticación
 * Maneja operaciones de registro, login y validación de tokens
 */
const AuthService = {
  /**
   * Obtener cliente de Supabase (admin para auth)
   */
  getSupabase() {
    if (!supabaseAdmin) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');
    }
    return supabaseAdmin;
  },

  /**
   * Registrar un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @param {string} userData.name - Nombre completo
   * @param {string} userData.email - Email único
   * @param {string} userData.password - Password en texto plano
   * @param {string} userData.role - Rol (admin|student)
   * @returns {Promise<Object>} Usuario creado (sin password)
   */
  async register({ name, email, password, role = 'student' }) {
    const supabase = this.getSupabase();

    // Verificar si el email ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      const error = new Error('El email ya está registrado');
      error.code = 'DUPLICATE_EMAIL';
      throw error;
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar sin select
    const { error } = await supabase
      .from('users')
      .insert([{ name, email, password: hashedPassword, role }]);

    if (error) throw error;

    // Buscar el usuario creado
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, created_at, updated_at')
      .eq('email', email)
      .limit(1);

    if (fetchError) throw fetchError;
    return users[0];
  },

  /**
   * Iniciar sesión
   * @param {string} email - Email del usuario
   * @param {string} password - Password en texto plano
   * @returns {Promise<Object>} { user, token }
   */
  async login(email, password) {
    const supabase = this.getSupabase();

    // Buscar usuario por email
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error) throw error;

    const user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      const error = new Error('Email o contraseña incorrectos');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Verificar si está activo
    if (!user.is_active) {
      const error = new Error('Usuario inactivo. Contacte al administrador');
      error.code = 'INACTIVE_USER';
      throw error;
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const error = new Error('Email o contraseña incorrectos');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Generar token JWT
    const token = this.generateToken(user);

    // Retornar datos sin password
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token
    };
  },

  /**
   * Generar token JWT
   * @param {Object} user - Usuario completo
   * @returns {string} Token JWT
   */
  generateToken(user) {
    const jwt = require('jsonwebtoken');

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  },

  /**
   * Verificar token JWT
   * @param {string} token - Token JWT
   * @returns {Object} Payload del token
   */
  verifyToken(token) {
    const jwt = require('jsonwebtoken');

    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      const err = new Error('Token inválido o expirado');
      err.code = 'INVALID_TOKEN';
      throw err;
    }
  }
};

module.exports = AuthService;
