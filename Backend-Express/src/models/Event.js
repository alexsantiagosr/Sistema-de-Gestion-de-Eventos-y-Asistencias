const pool = require('../config/database');

class Event {
  static async create({ title, description, date, capacity, modality, minAttendancePercentage, location }) {
    const query = `
      INSERT INTO events (title, description, date, capacity, modality, min_attendance_percentage, location) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *;
    `;
    const values = [title, description, date, capacity, modality, minAttendancePercentage, location];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findAll() {
    const query = 'SELECT * FROM events ORDER BY date DESC;';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM events WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, { title, description, date, capacity, modality, minAttendancePercentage, location }) {
    const query = `
      UPDATE events 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          date = COALESCE($3, date),
          capacity = COALESCE($4, capacity),
          modality = COALESCE($5, modality),
          min_attendance_percentage = COALESCE($6, min_attendance_percentage),
          location = COALESCE($7, location)
      WHERE id = $8 
      RETURNING *;
    `;
    const values = [title, description, date, capacity, modality, minAttendancePercentage, location, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM events WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getAvailableEvents() {
    const query = `
      SELECT * FROM events 
      WHERE date > NOW() 
      ORDER BY date ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async countEnrollments(eventId) {
    const query = 'SELECT COUNT(*) FROM enrollments WHERE event_id = $1 AND attendance_status != $2';
    const result = await pool.query(query, [eventId, 'cancelled']);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Event;
