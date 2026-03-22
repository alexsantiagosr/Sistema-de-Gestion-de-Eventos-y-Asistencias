require('dotenv').config();
const { supabaseAdmin } = require('./config/database');

async function updateAttendance() {
  console.log('🔧 Actualizando asistencia para prueba de certificado...\n');

  // Simular check-in y check-out con 150 minutos de diferencia (83% de 180 minutos)
  const checkIn = new Date('2026-04-15T10:00:00Z');
  const checkOut = new Date('2026-04-15T12:30:00Z'); // 150 minutos después

  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .update({
      check_in: checkIn.toISOString(),
      check_out: checkOut.toISOString(),
      status: 'used'
    })
    .eq('id', '55bb1867-7586-4aec-9563-535404afeb23')
    .select()
    .limit(1);

  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('✅ Asistencia actualizada!');
    console.log('Check-in:', checkIn.toISOString());
    console.log('Check-out:', checkOut.toISOString());
    console.log('Duración: 150 minutos (83% de 180 minutos)');
  }

  process.exit(0);
}

updateAttendance();
