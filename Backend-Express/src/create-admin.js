require('dotenv').config();
const { supabaseAdmin } = require('./config/database');

async function createAdmin() {
  console.log('🔧 Creando usuario admin...\n');

  const email = 'admin@sgeh.com';
  
  // Verificar si existe
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log('✅ El admin ya existe');
    console.log('Email:', email);
    process.exit(0);
  }

  // Crear admin
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{
      name: 'Administrador SGEH',
      email: email,
      password: hashedPassword,
      role: 'admin'
    }])
    .select('id, name, email, role')
    .limit(1);

  if (error) {
    console.log('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('✅ Admin creado exitosamente!\n');
  console.log('📧 Email:', email);
  console.log('🔑 Password: admin123');
  console.log('\n⚠️  Guarda estas credenciales para pruebas!\n');
}

createAdmin();
