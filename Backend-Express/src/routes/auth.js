const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/auth');

/**
 * Rutas de autenticación
 * Base: /api/auth
 */

// Registro de usuario
router.post('/register', AuthController.register);

// Login
router.post('/login', AuthController.login);

// Obtener usuario actual (requiere autenticación)
router.get('/me', authMiddleware.authenticate, AuthController.getMe);

module.exports = router;
