const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser
} = require('../controllers/userController');
const authenticateToken = require('../middleware/auth');

// Middleware para verificar si es admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
};

// Todas las rutas requieren autenticación y rol de admin
router.get('/', authenticateToken, isAdmin, getAllUsers);
router.get('/:id', authenticateToken, isAdmin, getUserById);
router.put('/:id', authenticateToken, isAdmin, updateUser);
router.patch('/:id/toggle-status', authenticateToken, isAdmin, toggleUserStatus);
router.delete('/:id', authenticateToken, isAdmin, deleteUser);

module.exports = router;
