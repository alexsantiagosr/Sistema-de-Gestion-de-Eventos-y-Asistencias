const { createClient } = require('@supabase/supabase-js');

// Validar variables de entorno
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase. Verifica tu archivo .env');
}

/**
 * Cliente de Supabase para operaciones normales (rol: anon)
 * Usa la clave pública (anon key) - sujeto a RLS
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Cliente de Supabase con privilegios de servicio (rol: service_role)
 * Bypassea RLS - usar solo para operaciones administrativas
 */
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabaseAdmin) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY no configurada. Algunas operaciones pueden fallar.');
}

module.exports = {
  supabase,
  supabaseAdmin
};
