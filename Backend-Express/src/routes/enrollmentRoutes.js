const express = require('express');
const router = express.Router();
const { enrollToEvent, getMyEnrollments, getEnrollmentByQR, updateAttendance, cancelEnrollment, deleteEnrollment } = require('../controllers/enrollmentController');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, enrollToEvent);
router.get('/my', authenticateToken, getMyEnrollments);
router.get('/qr/:qrCode', authenticateToken, getEnrollmentByQR);
router.post('/qr/:qrCode/attendance', authenticateToken, updateAttendance);
router.delete('/:id', authenticateToken, deleteEnrollment);
router.delete('/:id/cancel', authenticateToken, cancelEnrollment);

module.exports = router;
