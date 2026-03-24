-- ============================================================
-- SGEH - Políticas RLS para desarrollo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- ========================
-- USERS
-- ========================

-- Permitir INSERT público (registro)
CREATE POLICY "Allow public registration" ON users
FOR INSERT TO public
WITH CHECK (true);

-- Permitir SELECT para autenticados
CREATE POLICY "Allow authenticated users to read users" ON users
FOR SELECT TO authenticated
USING (true);

-- Permitir UPDATE solo al propio usuario
CREATE POLICY "Allow users to update own profile" ON users
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin puede todo en users
CREATE POLICY "Allow admin full access to users" ON users
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ========================
-- EVENTS
-- ========================

-- Todos pueden ver eventos
CREATE POLICY "Allow public to view events" ON events
FOR SELECT TO public
USING (true);

-- Admin puede crear/editar/eliminar eventos
CREATE POLICY "Allow admin full access to events" ON events
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ========================
-- ENROLLMENTS
-- ========================

-- Usuarios pueden ver sus propias inscripciones
CREATE POLICY "Allow users to view own enrollments" ON enrollments
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Usuarios pueden inscribirse
CREATE POLICY "Allow users to enroll" ON enrollments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Usuarios pueden cancelar sus inscripciones
CREATE POLICY "Allow users to cancel enrollments" ON enrollments
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admin puede todo en enrollments
CREATE POLICY "Allow admin full access to enrollments" ON enrollments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);
