const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const enrollmentsRoutes = require('./routes/enrollments');
const qrRoutes = require('./routes/qr');
const certificatesRoutes = require('./routes/certificates');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
// CORS restringido - usar cuando esté estable en producción

// app.use(cors({
//   origin: [
//     'http://localhost:3000',
//     'http://localhost:5173',
//     'http://localhost:5174',
//     'https://sistema-de-gestion-de-eventos-y-asistencias-dhlo-cv1gnyodb.vercel.app',
//     'https://sistema-de-gestion-de-eventos-y-asi-nu.vercel.app'
//   ],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// CORS abierto - temporal para producción
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas públicas
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/certificates', certificatesRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    name: 'SGEH API',
    description: 'Sistema de Gestión de Eventos y Asistencias',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (requiere autenticación)'
      },
      events: {
        list: 'GET /api/events',
        available: 'GET /api/events/available',
        detail: 'GET /api/events/:id',
        create: 'POST /api/events (requiere admin)',
        update: 'PUT /api/events/:id (requiere admin)',
        delete: 'DELETE /api/events/:id (requiere admin)',
        status: 'PATCH /api/events/:id/status (requiere admin)'
      },
      enrollments: {
        enroll: 'POST /api/enrollments/:eventId (requiere autenticación)',
        myEnrollments: 'GET /api/enrollments/my-enrollments (requiere autenticación)',
        detail: 'GET /api/enrollments/:id (requiere autenticación)',
        cancel: 'DELETE /api/enrollments/:id (requiere autenticación)',
        validateQr: 'GET /api/enrollments/qr/:qrToken (público)',
        checkIn: 'POST /api/enrollments/:id/check-in (requiere admin)',
        checkOut: 'POST /api/enrollments/:id/check-out (requiere admin)',
        markUsed: 'POST /api/enrollments/:id/mark-used (requiere admin)',
        eventEnrollments: 'GET /api/enrollments/event/:eventId (requiere admin)',
        attendance: 'GET /api/enrollments/:eventId/attendance (requiere autenticación)'
      },
      qr: {
        getQR: 'GET /api/qr/:enrollmentId (requiere autenticación)',
        download: 'GET /api/qr/:enrollmentId/download (requiere autenticación)',
        svg: 'GET /api/qr/:enrollmentId/svg (requiere autenticación)',
        validate: 'GET /api/qr/validate/:qrToken (público)'
      },
      certificates: {
        myCertificates: 'GET /api/certificates/my-certificates (requiere autenticación)',
        eligibility: 'GET /api/certificates/:eventId/eligibility (requiere autenticación)',
        preview: 'GET /api/certificates/:eventId/preview (requiere autenticación)',
        download: 'GET /api/certificates/:eventId (requiere autenticación, descarga PDF)'
      }
    }
  });
});

// Manejo de errores 404
app.use((req, res, next) => {
  res.status(404).json({
    error: 'No encontrado',
    message: `La ruta ${req.originalUrl} no existe`
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`SGEH API corriendo en http://localhost:${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
