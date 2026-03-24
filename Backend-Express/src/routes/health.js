const express = require('express');
const { supabase } = require('../config/database');

const router = express.Router();

/**
 * GET /api/health
 * Endpoint para verificar que la API está funcionando
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API funcionando',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/health/db-test
 * Endpoint para verificar la conexión a la base de datos
 */
router.get('/db-test', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      status: 'ok',
      message: 'DB conectada correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
