# 🎓 SGEA - Sistema de Gestión de Eventos y Asistencias

[![Status](https://img.shields.io/badge/status-production%20ready-green)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

Sistema full-stack para gestionar eventos y control de asistencias mediante códigos QR.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Arquitectura](#-arquitectura)
- [Inicio Rápido](#-inicio-rápido)
- [Documentación](#-documentación)
- [Deploy](#-deploy)

---

## ✨ Características

### 👨‍🎓 Para Estudiantes

- ✅ Explorar eventos disponibles
- ✅ Inscripción con un click
- ✅ Código QR único por inscripción
- ✅ Control de asistencia (check-in/check-out)
- ✅ Certificados PDF automáticos
- ✅ Dashboard personalizado

### 👨‍💼 Para Administradores

- ✅ Gestión completa de eventos (CRUD)
- ✅ Control de cupos en tiempo real
- ✅ Escáner de QR para asistencias
- ✅ Reportes y estadísticas
- ✅ Exportación a CSV
- ✅ Dashboard con métricas

### 🔒 Seguridad

- ✅ Autenticación JWT
- ✅ Contraseñas encriptadas (bcrypt)
- ✅ Roles de usuario (admin/student)
- ✅ Validación de datos con Zod

---

## 🛠️ Tecnologías

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 20.x | Runtime |
| Express | 4.x | Framework web |
| PostgreSQL | - | Base de datos |
| Supabase | - | Cloud PostgreSQL |
| JWT | - | Autenticación |
| bcrypt | - | Encriptación |

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.x | UI Library |
| TypeScript | 5.x | Tipado estático |
| Tailwind CSS | 3.x | Estilos |
| React Router | 6.x | Navegación |
| TanStack Query | 5.x | Estado del servidor |
| React Hook Form | 7.x | Formularios |
| Zod | 3.x | Validaciones |

### DevOps

| Tecnología | Propósito |
|------------|-----------|
| Docker | Contenedores |
| Docker Compose | Orquestación |
| Nginx | Web server (prod) |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTE                          │
│              (React + TypeScript)                   │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Admin   │  │ Student  │  │   Auth (JWT)     │ │
│  │ Dashboard│  │ Dashboard│  │                  │ │
│  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────┐
│                   BACKEND API                       │
│                (Node.js + Express)                  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │   Auth   │  │  Events  │  │  Enrollments     │ │
│  │  Module  │  │  Module  │  │     Module       │ │
│  └──────────┘  └──────────┘  └──────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │    QR    │  │Certificates│ │    Reports      │ │
│  │  Module  │  │  Module   │ │    Module        │ │
│  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         │ PostgreSQL Protocol
                         ▼
┌─────────────────────────────────────────────────────┐
│                  BASE DE DATOS                      │
│              (Supabase - PostgreSQL)                │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  users   │  │  events  │  │   enrollments    │ │
│  │  table   │  │  table   │  │     table        │ │
│  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Cuenta en Supabase

### 1. Clonar repositorio

```bash
cd c:\Users\alexsantiagosr\GestionTecnologia-SGEH
```

### 2. Configurar Backend

```bash
cd Backend-Express
copy .env.example .env
# Editar .env con credenciales de Supabase
npm install
npm start
```

### 3. Configurar Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

### 4. Acceder

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5000

---

## 📚 Documentación

- [API Endpoints](./API.md)
- [Modelo de Datos](./DATABASE.md)
- [Guía de Deploy](./DEPLOY.md)

---

## 🐳 Deploy con Docker

### Local

```bash
# Configurar variables
copy .env.example .env
# Editar .env

# Construir y levantar
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### Producción

Ver [DEPLOY.md](./DEPLOY.md) para instrucciones detalladas.

---

## 👥 Usuarios por Defecto

### Admin

- **Email:** admin@sgeh.com
- **Password:** admin123

### Estudiante

- **Email:** maria@sgeh.com
- **Password:** 123456

---

## 📊 Endpoints Principales

### Auth

```
POST /api/auth/register    - Registro
POST /api/auth/login       - Login
GET  /api/auth/me          - Perfil actual
```

### Eventos

```
GET    /api/events          - Listar eventos
POST   /api/events          - Crear evento (admin)
PUT    /api/events/:id      - Actualizar (admin)
DELETE /api/events/:id      - Eliminar (admin)
```

### Inscripciones

```
POST   /api/enrollments/:eventId  - Inscribirse
GET    /api/enrollments/my-enrollments - Mis inscripciones
DELETE /api/enrollments/:id       - Cancelar
```

### QR

```
GET  /api/qr/:enrollmentId        - Obtener QR
GET  /api/qr/:enrollmentId/download - Descargar QR
GET  /api/qr/validate/:qrToken    - Validar QR
```

### Certificados

```
GET  /api/certificates/my-certificates  - Mis certificados
GET  /api/certificates/:eventId         - Descargar PDF
```

---

## 📝 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

---

## 🆘 Soporte

Para issues o preguntas, crea un issue en el repositorio.

---

**Desarrollado con ❤️ para la gestión eficiente de eventos académicos**
