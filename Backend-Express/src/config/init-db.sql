-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student', -- 'admin', 'student', 'staff'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de eventos
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  capacity INTEGER NOT NULL,
  modality VARCHAR(50) NOT NULL, -- 'presencial', 'virtual', 'hibrido'
  min_attendance_percentage INTEGER NOT NULL DEFAULT 70,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de inscripciones
CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  qr_code VARCHAR(255) UNIQUE NOT NULL,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  attendance_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'attended', 'completed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_id)
);

-- Crear tabla de asistencia para trazabilidad (registro de tiempo en eventos virtuales)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP,
  active_time_seconds INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Insertar usuario administrador por defecto
-- Password: admin123 (hash generado con bcrypt)
INSERT INTO users (name, email, password, role) 
VALUES ('Administrador', 'admin@sgeh.edu', '$2a$10$rQZV8XqJpJhJzV8XqJpJhJzV8XqJpJhJzV8XqJpJhJzV8XqJpJhJ', 'admin')
ON CONFLICT (email) DO NOTHING;
