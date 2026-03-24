const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ name, email, password, role }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (name, email, password, role) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, email, role, created_at;
    `;
    const values = [name, email, hashedPassword, role];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1;';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, name, email, role, created_at FROM users WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async update(id, { name, email }) {
    const query = `
      UPDATE users 
      SET name = COALESCE($1, name), email = COALESCE($2, email)
      WHERE id = $3 
      RETURNING id, name, email, role, created_at;
    `;
    const result = await pool.query(query, [name, email, id]);
    return result.rows[0];
  }

  static async toggleStatus(id, isActive) {
    const query = `
      UPDATE users 
      SET is_active = COALESCE($1, is_active)
      WHERE id = $2 
      RETURNING id, name, email, role, is_active, created_at;
    `;
    const result = await pool.query(query, [isActive, id]);
    return result.rows[0];
  }

  static async findAll() {
    const query = 'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC;';
    const result = await pool.query(query);
    return result.rows;
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = User;
