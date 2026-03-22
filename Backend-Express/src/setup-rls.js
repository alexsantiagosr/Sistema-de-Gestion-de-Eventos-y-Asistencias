require('dotenv').config();
const { supabaseAdmin } = require('./config/database');

async function setupRLS() {
  console.log('🔧 Configurando RLS (desactivando para desarrollo)...\n');

  if (!supabaseAdmin) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY no configurada. No se puede configurar RLS.');
    console.log('   💡 Agrega SUPABASE_SERVICE_ROLE_KEY a tu archivo .env');
    process.exit(1);
  }

  try {
    // Desactivar RLS en users
    console.log('📌 Tabla: users - Desactivando RLS...');
    const { error: usersError } = await supabaseAdmin.rpc('alter_table', {
      table_name: 'users',
      command: 'DISABLE ROW LEVEL SECURITY'
    });

    if (usersError) {
      console.log('   ⚠️  RPC no disponible:', usersError.message);
      console.log('   💡 Configura RLS manualmente en Supabase Dashboard');
    } else {
      console.log('   ✅ RLS configurado');
    }

    console.log('\n✅ Configuración completada!\n');
  } catch (error) {
    console.log('   Nota: RLS puede requerir configuración manual en Supabase Dashboard');
    console.log('   Error:', error.message);
  }

  process.exit(0);
}

setupRLS();
