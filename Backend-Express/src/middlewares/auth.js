const AuthService = require('../services/AuthService');

/**
 * Middleware de autenticación
 * Verifica que el token JWT sea válido
 */
const authMiddleware = {
  /**
   * Middleware para proteger rutas
   * Requiere header Authorization: Bearer <token>
   */
  async authenticate(req, res, next) {
    try {
      // Obtener token del header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          error: 'No autorizado',
          message: 'Token de autenticación requerido'
        });
      }

      // Extraer token (formato: "Bearer <token>")
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          error: 'No autorizado',
          message: 'Formato de token inválido. Use: Bearer <token>'
        });
      }

      // Verificar token
      const decoded = AuthService.verifyToken(token);
      
      // Adjuntar información del usuario al request
      req.user = decoded;
      
      next();
    } catch (error) {
      if (error.code === 'INVALID_TOKEN') {
        return res.status(401).json({
          error: 'No autorizado',
          message: error.message
        });
      }
      
      next(error);
    }
  },

  /**
   * Middleware para verificar rol específico
   * @param  {...string} roles - Roles permitidos
   */
  requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'No autorizado',
          message: 'Autenticación requerida'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Prohibido',
          message: `Se requiere rol: ${roles.join(' o ')}`
        });
      }

      next();
    };
  }
};

module.exports = authMiddleware;
