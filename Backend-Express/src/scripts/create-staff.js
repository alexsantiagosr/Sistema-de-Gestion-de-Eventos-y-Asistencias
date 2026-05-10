/**
 * Script para crear el usuario Staff (ejecutar DESPUÉS de actualizar el constraint en Supabase)
 * node src/scripts/create-staff.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createStaff() {
  const email = 'staff@unimayor.edu.co';
  const password = '2600$Antiago';
  const name = 'Personal de Apoyo';
  const role = 'staff';

  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', email)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log('⚠️  El usuario staff ya existe:');
    console.log(`   ID:    ${existing[0].id}`);
    console.log(`   Email: ${existing[0].email}`);
    console.log(`   Role:  ${existing[0].role}`);
    process.exit(0);
  }

  // Hashear password y crear usuario
  console.log('👤 Creando usuario Staff...');
  const hashedPassword = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert([{ name, email, password: hashedPassword, role }])
    .select('id, name, email, role, is_active')
    .single();

  if (error) {
    console.error('❌ Error creando staff:', error.message);
    console.error('   Asegúrate de haber ejecutado el SQL del constraint en Supabase primero.');
    process.exit(1);
  }

  console.log('✅ Usuario Staff creado exitosamente:');
  console.log(`   ID:    ${data.id}`);
  console.log(`   Email: ${data.email}`);
  console.log(`   Role:  ${data.role}`);
  console.log(`   Name:  ${data.name}`);
  process.exit(0);
}

createStaff();
