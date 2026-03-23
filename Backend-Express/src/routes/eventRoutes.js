const express = require('express');
const router = express.Router();
const { getAllEvents, getAvailableEvents, getEventById, createEvent, updateEvent, deleteEvent, getEnrollmentsByEvent, isAdmin, getAvailableEventsWithSpots } = require('../controllers/eventController');
const authenticateToken = require('../middleware/auth');

router.get('/', getAllEvents);
router.get('/available', authenticateToken, getAvailableEvents);
router.get('/available-spots', authenticateToken, getAvailableEventsWithSpots);
router.get('/:id', authenticateToken, getEventById);
router.post('/', authenticateToken, isAdmin, createEvent);
router.put('/:id', authenticateToken, isAdmin, updateEvent);
router.delete('/:id', authenticateToken, isAdmin, deleteEvent);
router.get('/:id/enrollments', authenticateToken, isAdmin, getEnrollmentsByEvent);

module.exports = router;
