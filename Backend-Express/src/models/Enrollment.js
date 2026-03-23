const pool = require('../config/database');
const crypto = require('crypto');

class Enrollment {
  static async create({ userId, eventId }) {
    const uniqueCode = crypto.randomBytes(16).toString('hex');
    const query = `
      INSERT INTO enrollments (user_id, event_id, qr_code) 
      VALUES ($1, $2, $3) 
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, eventId, uniqueCode]);
    return result.rows[0];
  }

  static async findByUserAndEvent(userId, eventId) {
    const query = 'SELECT * FROM enrollments WHERE user_id = $1 AND event_id = $2;';
    const result = await pool.query(query, [userId, eventId]);
    return result.rows[0];
  }

  static async findByUser(userId) {
    const query = `
      SELECT e.*, ev.title, ev.date, ev.modality 
      FROM enrollments e
      JOIN events ev ON e.event_id = ev.id
      WHERE e.user_id = $1;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByEvent(eventId) {
    const query = `
      SELECT e.*, u.name, u.email 
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.event_id = $1;
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows;
  }

  static async updateAttendanceStatus(enrollmentId, checkInTime, checkOutTime = null) {
    const query = `
      UPDATE enrollments 
      SET check_in = COALESCE($1, check_in), check_out = COALESCE($2, check_out)
      WHERE id = $3 
      RETURNING *;
    `;
    const result = await pool.query(query, [checkInTime, checkOutTime, enrollmentId]);
    return result.rows[0];
  }

  static async getWithQRCode(qrCode) {
    const query = `
      SELECT e.*, u.name, u.email, ev.title as event_title
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN events ev ON e.event_id = ev.id
      WHERE e.qr_code = $1;
    `;
    const result = await pool.query(query, [qrCode]);
    return result.rows[0];
  }

  static async cancelEnrollment(id) {
    const query = `
      UPDATE enrollments
      SET attendance_status = 'cancelled', cancelled_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM enrollments WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Enrollment;
