require('dotenv').config();
const { supabaseAdmin } = require('./config/database');

async function updateToAdmin() {
  console.log('🔧 Actualizando usuario a administrador...\n');

  const email = 'santiagosrvr@gmail.com';

  // Actualizar rol a admin
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ role: 'admin' })
    .eq('email', email)
    .select('id, name, email, role')
    .limit(1);

  if (error) {
    console.log('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('✅ Usuario actualizado a ADMINISTRADOR!\n');
  console.log('📧 Email:', data[0].email);
  console.log('🔑 Password: 2600..66');
  console.log('👤 Nombre:', data[0].name);
  console.log('🎭 Rol:', data[0].role.toUpperCase());
  console.log('\n⚠️  Ahora tienes acceso completo al panel de administración!\n');
}

updateToAdmin();
