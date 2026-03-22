const { supabase } = require('../config/database');

/**
 * Modelo de Usuario
 * Maneja operaciones CRUD sobre la tabla 'users'
 */
const UserModel = {
  /**
   * Obtener todos los usuarios
   * @param {Object} options - Opciones de consulta
   * @param {number} options.limit - Límite de registros
   * @param {number} options.offset - Desplazamiento
   * @returns {Promise<Array>} Lista de usuarios
   */
  async findAll({ limit = 100, offset = 0 } = {}) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, created_at, updated_at')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener usuario por ID
   * @param {string} id - UUID del usuario
   * @returns {Promise<Object|null>} Usuario o null
   */
  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST110') throw error;
    return data || null;
  },

  /**
   * Obtener usuario por email (para login/registro)
   * @param {string} email - Email del usuario
   * @returns {Promise<Object|null>} Usuario completo (incluye password)
   */
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Crear un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @param {string} userData.name - Nombre completo
   * @param {string} userData.email - Email único
   * @param {string} userData.password - Password encriptado
   * @param {string} userData.role - Rol (admin|student)
   * @returns {Promise<Object>} Usuario creado
   */
  async create({ name, email, password, role = 'student' }) {
    // Insertar sin select (evita problemas con RLS)
    const { error } = await supabase
      .from('users')
      .insert([{ name, email, password, role }]);

    if (error) throw error;

    // Buscar el usuario creado
    return await this.findByEmail(email);
  },

  /**
   * Actualizar usuario
   * @param {string} id - UUID del usuario
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<Object>} Usuario actualizado
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Eliminar usuario (lógico - desactiva is_active)
   * @param {string} id - UUID del usuario
   * @returns {Promise<Object>} Usuario actualizado
   */
  async delete(id) {
    return this.update(id, { is_active: false });
  }
};

module.exports = UserModel;
