require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Probando con service_role key...\n');

const supabase = createClient(supabaseUrl, serviceKey);

async function testInsert() {
  const email = `test_${Date.now()}@sgeh.com`;
  
  console.log('Email:', email);
  
  // Intentar insert
  const { data, error } = await supabase
    .from('users')
    .insert([{ 
      name: 'Test', 
      email: email, 
      password: 'hashed_password', 
      role: 'student' 
    }]);

  if (error) {
    console.log('❌ Error:', error);
  } else {
    console.log('✅ Insert exitoso!');
    console.log('Data:', data);
  }
}

testInsert();
