require('dotenv').config();
const { supabase } = require('./config/database');

async function testConnection() {
  try {
    console.log('Intentando conectar a Supabase...');
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error && error.code !== 'PGRST110') {
      // PGRST110 = tabla no existe, pero la conexión funciona
      throw error;
    }

    console.log('✅ Conexión exitosa a Supabase!');
    console.log('URL:', process.env.SUPABASE_URL);
    if (data) {
      console.log('Datos:', data);
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  }
}

testConnection();
