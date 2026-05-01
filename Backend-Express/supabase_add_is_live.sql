-- Ejecutar este script en el editor SQL de Supabase para agregar is_live

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;
