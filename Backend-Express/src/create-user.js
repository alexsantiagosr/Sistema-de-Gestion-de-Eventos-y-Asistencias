require('dotenv').config();
const { supabaseAdmin } = require('./config/database');
const bcrypt = require('bcrypt');

async function createUser() {
  console.log('🔧 Creando usuario en Supabase...\n');

  const email = 'santiagosrvr@gmail.com';
  const password = '2600..66';
  const name = 'Santiago SR';
  const role = 'student';

  // Verificar si ya existe
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log('⚠️  El usuario ya existe');
    console.log('Email:', email);
    process.exit(0);
  }

  // Encriptar contraseña
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('🔐 Contraseña encriptada');

  // Crear usuario
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{
      name: name,
      email: email,
      password: hashedPassword,
      role: role
    }])
    .select('id, name, email, role, is_active')
    .limit(1);

  if (error) {
    console.log('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Usuario creado exitosamente!\n');
  console.log('📧 Email:', data[0].email);
  console.log('🔑 Password: 2600..66');
  console.log('👤 Nombre:', data[0].name);
  console.log('🎭 Rol:', data[0].role);
  console.log('\n⚠️  Usa estas credenciales para iniciar sesión en el frontend!\n');
}

createUser();
