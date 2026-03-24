require('dotenv').config();
const { supabase } = require('./config/database');

async function checkDatabase() {
  console.log('🔍 Verificando estructura de la base de datos...\n');

  // Verificar tabla users
  console.log('📌 Tabla: users');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (usersError) {
    console.log('   ❌ Error:', usersError.message);
    console.log('   💡 La tabla users no existe o no hay permisos');
  } else {
    console.log('   ✅ Tabla existe');
    console.log('   📊 Registros:', users ? 'accesible' : 'vacía');
  }

  console.log('\n---\n');
  process.exit(0);
}

checkDatabase();
