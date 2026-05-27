# 🎓 SGEH - Sistema de Gestión de Eventos y Asistencias

[![Status](https://img.shields.io/badge/status-production%20ready-green)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

SGEH es una plataforma full-stack profesional diseñada para gestionar **eventos en modalidades presencial, virtual e híbrida**. El sistema automatiza el control de inscripciones, el registro preciso de asistencias y la emisión de certificados.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Accesos del Sistema](#-accesos-del-sistema)
- [Arquitectura General](#-arquitectura-general)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Sistema de Asistencia Híbrida](#-sistema-de-asistencia-híbrida)
- [Roles del Sistema](#-roles-del-sistema)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Inicio Rápido](#-inicio-rápido)

---

## ✨ Características

- ✅ **Modalidades Híbridas:** Soporte integral para eventos presenciales y virtuales.
- ✅ **Asistencia Virtual Precisa:** Cálculo exacto de tiempo de conexión mediante `active_seconds`.
- ✅ **Escáner QR Integrado:** Control de acceso rápido en eventos presenciales para el personal.
- ✅ **Automatización Inteligente:** Cierre automático de eventos y cálculo de tiempos.
- ✅ **Certificación Autónoma:** Emisión de PDFs dinámicos basada en reglas de validación de asistencia.

---

## 🌐 Accesos del Sistema

### Acceso Producción

| Servicio            | URL                                                         |
| ------------------- | ----------------------------------------------------------- |
| Frontend Producción | https://sistema-de-gestion-de-eventos-y-asi-one.vercel.app/ |
| Backend Producción  | https://sistema-de-gestion-de-eventos-y-x11t.onrender.com   |

### Entorno Local

| Servicio       | URL                   |
| -------------- | --------------------- |
| Frontend Local | http://localhost:3000 |
| Backend Local  | http://localhost:3001 |

*(Nota: En despliegues locales con Docker, el frontend puede estar expuesto en el puerto 80).*

---

## 🏗️ Arquitectura General

El proyecto sigue una arquitectura **Cliente-Servidor (SPA + REST API)** apoyada por un BaaS (Backend-as-a-Service).

*   **Frontend (Cliente):** Aplicación de una sola página (SPA) desarrollada con **React y TypeScript**. Se compila con Vite y se despliega globalmente en la CDN de **Vercel**.
*   **Backend (Servidor):** API RESTful desarrollada con **Node.js y Express.js**. Desplegado como Web Service en **Render**.
*   **Base de Datos:** Instancia relacional de **PostgreSQL** alojada y gestionada en **Supabase**, aprovechando Row Level Security (RLS) y funciones RPC nativas.

---

## 🛠️ Tecnologías Utilizadas

**Frontend:**
- React (v18)
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query (React Query)
- html5-qrcode

**Backend & Datos:**
- Node.js
- Express.js
- PostgreSQL
- Supabase (PostgREST / SDK)
- JWT (JSON Web Tokens)
- bcrypt
- PDFKit

**DevOps & Cloud:**
- Docker & Docker Compose
- Vercel (Hosting Frontend)
- Render (Hosting Backend)

---

## 🔄 Sistema de Asistencia Híbrida

SGEH resuelve la complejidad de la asistencia en eventos mixtos combinando dos aproximaciones en un solo modelo de datos:

1. **Asistencia Presencial (Vía QR):**
   - El estudiante inscrito genera un código QR personal.
   - El rol `Staff` utiliza el escáner de la plataforma en la entrada física del evento para registrar la asistencia.
2. **Asistencia Virtual (Vía Sesiones):**
   - El estudiante accede a la "Sala Virtual" desde su panel.
   - El sistema registra de manera invisible la entrada y salida, creando "sesiones virtuales".
   - Al salir o cerrar la pestaña, se calcula el tiempo y se acumula en la variable **`active_seconds`**.
3. **Validación Automática para Certificados:**
   - Una vez que la duración del evento expira, el sistema cierra automáticamente el evento y todas las sesiones abiertas. Evalúa el tiempo total presencial o virtual y genera los certificados de los usuarios elegibles.

---

## 👥 Roles del Sistema

El acceso y las funcionalidades están controlados estrictamente mediante 3 roles:

### 1. `admin` (Administrador)
Gestor principal de la plataforma.
- Crea, edita y finaliza eventos.
- Monitoriza estadísticas de asistencia e inscripciones.
- Inicia sesiones de sala virtual.

### 2. `student` (Estudiante / Asistente)
Usuario consumidor de los eventos.
- Explora el catálogo de eventos disponibles.
- Gestiona sus inscripciones.
- Ingresa a salas virtuales o presenta su código QR.
- Descarga sus certificados de asistencia.

### 3. `staff` (Personal de Apoyo)
Rol especializado para la logística en eventos presenciales.
- Accede a un panel limpio de Escaneo QR.
- Su única y principal función es validar entradas presenciales rápidamente a través de la cámara de su dispositivo.

---

## 📁 Estructura del Proyecto

El repositorio sigue una organización modular de dos componentes principales:

```
Sistema-de-Gestion-de-Eventos-y-Asistencias/
│
├── Backend-Express/       # API REST (Node.js/Express)
│   ├── src/
│   │   ├── controllers/   # Lógica de las rutas
│   │   ├── middlewares/   # Auth, Roles, Errores
│   │   ├── models/        # Integración con DB Supabase
│   │   ├── routes/        # Definición de endpoints
│   │   └── services/      # Lógica de negocio (Ej: PDF Certificates)
│   ├── Dockerfile         # Receta Docker para Node
│   └── supabase_*.sql     # Scripts y triggers de Base de Datos
│
├── Frontend-React/        # Cliente SPA (React/Vite)
│   ├── src/
│   │   ├── api/           # Llamadas HTTP con Axios
│   │   ├── components/    # Componentes UI (Layout, Buttons, QR)
│   │   ├── context/       # Estado global (AuthContext)
│   │   ├── guards/        # Protección de rutas por Rol
│   │   ├── hooks/         # React Query custom hooks
│   │   └── pages/         # Vistas completas por módulo
│   ├── Dockerfile         # Receta Docker Multi-stage con Nginx
│   └── vercel.json        # Configuración de despliegue en Vercel
│
├── deploy.sh              # Script unificado para levantar Docker
└── docker-compose.yml     # Orquestación de contenedores locales
```

---

## 🚀 Inicio Rápido (Local)

### Prerrequisitos
- Node.js 20+
- Credenciales de Supabase (URL y KEY)

### 💻 Entorno de Desarrollo Manual

**1. Levantar el Backend:**
```bash
cd Backend-Express
copy .env.example .env
# Edita las variables de entorno (Asegúrate de configurar el PORT y credenciales DB)
npm install
npm run dev
# Disponible en: http://localhost:3001 (o el configurado)
```

**2. Levantar el Frontend:**
```bash
cd Frontend-React
copy .env.example .env
# Verifica que VITE_API_URL=http://localhost:3001/api (O apunte a tu backend)
npm install
npm run dev
# Disponible en: http://localhost:3000
```

*(Para despliegues productivos o contenerizados, revisa nuestra guía especializada en [DEPLOY.md](./DEPLOY.md)).*
