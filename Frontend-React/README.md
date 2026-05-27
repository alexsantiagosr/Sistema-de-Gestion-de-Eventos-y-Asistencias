# SGEH Frontend - SPA React

Subproyecto que conforma la interfaz de usuario del **Sistema de Gestión de Eventos y Asistencias**. Desarrollado con velocidad y escalabilidad en mente, utiliza Vite como empaquetador y TanStack Query para el almacenamiento en caché del servidor.

## 🚀 Inicio Rápido de Desarrollo

### Prerrequisitos
- Node.js 20+
- Servidor Backend (API Express) ejecutándose en `http://localhost:5000`

### Instalación Local

```bash
# Instalar todas las dependencias
npm install

# Iniciar servidor de desarrollo con Hot Module Replacement (HMR)
npm run dev
```

El frontend estará disponible típicamente en **http://localhost:3000**.

## 📁 Arquitectura del Cliente

```
src/
├── api/                    # Integraciones HTTP con Axios (auth, events, qr, etc.)
├── components/
│   ├── ui/                 # Botones, Modales, Tablas genéricos
│   ├── layout/             # Sidebar, Navbar, Layout estructural
│   └── features/           # Lógica fragmentada del dominio (ej. Scanner QR)
├── context/                # Contextos globales (AuthContext)
├── guards/                 # Middlewares de ruteo en cliente (Private, Admin, Staff)
├── hooks/                  # Hooks personalizados de React Query para mutaciones asíncronas
├── pages/
│   ├── auth/               # Inicio de sesión y registro
│   ├── student/            # Catálogo, inscripciones, y sala virtual para estudiantes
│   ├── admin/              # Panel gerencial y CRUD de eventos
│   └── staff/              # Interfaz dedicada para lectura QR presencial
├── types/                  # Interfaces de datos y tipado estricto
└── utils/                  # Herramientas utilitarias puras
```

## 🎨 Stack Tecnológico y Librerías

- **Core:** React 18, TypeScript, Vite.
- **Routing:** React Router DOM v6.
- **Gestión de Estado Asíncrono:** TanStack Query (React Query) v5.
- **Diseño UI:** Tailwind CSS v3, Lucide React (íconos), Sonner (Toasts de notificación).
- **Control de Formularios:** React Hook Form emparejado con validadores semánticos Zod.
- **Hardware Integrado:** `html5-qrcode` para lectura dinámica en vivo mediante cámara de dispositivos.

## 🔐 Autenticación y Flujo JWT

1. El servidor provee un token JWT al validar credenciales en login.
2. El cliente almacena en memoria/localStorage el token.
3. Un interceptor HTTP global en `src/api/axios.ts` añade la cabecera `Authorization: Bearer <token>` a cada solicitud.
4. Si la sesión caduca y el servidor emite un HTTP 401, el cliente destruye la sesión gráfica y empuja al usuario a la vista de `/login`.

> [!NOTE]
> Para el cierre de "Sala Virtual" (`beforeunload`), el navegador no siempre puede enviar *headers* de autenticación en la limpieza del documento. Para esto, se implementa una inyección del token vía Query Parameters (`?token=`) ejecutada por `navigator.sendBeacon`.

## 📱 Permisos y Roles en React Router

### Estudiante (`student`)
- Explora eventos.
- Se inscribe y genera QR personales.
- Entra en salas virtuales e interactúa con certificados de conclusión.

### Administrador (`admin`)
- Control estadístico en el Dashboard.
- Creador y gestor principal del CRUD de Eventos.

### Personal de Apoyo (`staff`)
- Operador de acceso. Vista simplificada de lectura QR enfocada en marcar entradas al evento presencial (`/staff/scan`).

## 🔧 Variables de Entorno

```env
# URL apuntando a la API Express
VITE_API_URL=http://localhost:5000/api
```

## 📝 Comandos de NPM

```bash
# Levantar servidor de desarrollo
npm run dev

# Construir bundler estático para producción (salida en /dist)
npm run build

# Previsualizar el bundle de producción
npm run preview

# Ejecutar el analizador de sintaxis TypeScript y Linter
npm run lint
```
