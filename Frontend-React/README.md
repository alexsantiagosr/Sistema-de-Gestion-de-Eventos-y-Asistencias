# SGEA Frontend

Sistema de Gestión de Eventos y Asistencias - Frontend

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- Backend corriendo en http://localhost:5000

### Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El frontend estará disponible en http://localhost:3000

## 📁 Estructura del Proyecto

```
src/
├── api/                    # Funciones de API por módulo
│   ├── axios.ts           # Configuración de Axios
│   ├── auth.api.ts
│   ├── events.api.ts
│   ├── enrollments.api.ts
│   ├── qr.api.ts
│   └── certificates.api.ts
├── components/
│   ├── ui/                # Componentes base reutilizables
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Spinner.tsx
│   │   └── Table.tsx
│   ├── layout/            # Componentes de layout
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   └── Layout.tsx
│   └── features/          # Componentes específicos del dominio
├── pages/
│   ├── auth/              # Páginas de autenticación
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── student/           # Páginas de estudiante
│   │   ├── DashboardPage.tsx
│   │   ├── EventsPage.tsx
│   │   ├── MyEnrollmentsPage.tsx
│   │   └── CertificatesPage.tsx
│   └── admin/             # Páginas de administrador
│       ├── AdminDashboardPage.tsx
│       └── ManageEventsPage.tsx
├── hooks/                 # Custom hooks
│   ├── useEvents.ts
│   ├── useEnrollments.ts
│   └── useCertificates.ts
├── context/
│   └── AuthContext.tsx    # Contexto de autenticación
├── guards/
│   ├── PrivateRoute.tsx   # Ruta protegida (requiere auth)
│   └── AdminRoute.tsx     # Ruta solo admin
├── types/
│   └── index.ts           # Tipos TypeScript
├── utils/                 # Utilidades
└── lib/
    └── utils.ts           # Utilidades de Tailwind
```

## 🎨 Stack Tecnológico

- **React 18** - UI library
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **React Router v6** - Navegación
- **TanStack Query** - Gestión de estado del servidor
- **React Hook Form + Zod** - Formularios y validaciones
- **Lucide React** - Iconos
- **Sonner** - Notificaciones toast
- **Axios** - Cliente HTTP
- **date-fns** - Utilidades de fecha

## 🔐 Autenticación

El sistema usa JWT para autenticación:

1. El token se guarda en `localStorage`
2. Axios interceptor agrega automáticamente el header `Authorization: Bearer <token>`
3. Si el token expira (401), se limpia localStorage y redirige a `/login`

## 📱 Roles

### Student
- `/dashboard` - Dashboard principal
- `/events` - Explorar eventos
- `/my-enrollments` - Mis inscripciones
- `/certificates` - Certificados

### Admin
- `/admin` - Dashboard admin
- `/admin/events` - Gestión de eventos
- `/admin/attendances` - Control de asistencias

## 🔧 Variables de Entorno

```env
VITE_API_URL=http://localhost:5000/api
```

## 📝 Comandos Disponibles

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Preview build
npm run preview

# Lint
npm run lint
```

## 🎯 Próximos Pasos

1. ✅ Configuración del proyecto - COMPLETADO
2. ✅ Auth (Login/Register) - COMPLETADO  
3. ⏳ Páginas de Student (completar funcionalidad)
4. ⏳ Páginas de Admin (completar funcionalidad)
5. ⏳ Componentes de features (EventCard, QRModal, etc.)
6. ⏳ Integración completa con backend
