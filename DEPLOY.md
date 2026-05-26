# 🐳 SGEH - Guía de Despliegue y Operaciones

Esta guía describe detalladamente cómo desplegar SGEH de manera local (usando Docker) y en la nube (Vercel y Render).

---

## 📋 Prerrequisitos Globales

- Cuenta en **Supabase** para tu base de datos PostgreSQL.
- Cuenta en **Vercel** (Hosting del Frontend).
- Cuenta en **Render** (Hosting del Backend).
- **Docker** y **Docker Compose** (Solo si despliegas localmente).

---

## ☁️ Despliegue en Producción (Arquitectura Real)

SGEH está diseñado y configurado para operar con un Frontend en **Vercel** y un Backend en **Render**.

### Fase 1: Base de Datos (Supabase)
1. Crea un nuevo proyecto en Supabase.
2. Ve al editor SQL y ejecuta los scripts proporcionados en la carpeta `Backend-Express/`:
   - `supabase_add_is_live.sql`
   - `supabase_auto_finish_events.sql`
3. Ve a Settings -> API y obtén tu `Project URL` y `anon public key`.

### Fase 2: Backend (Render.com)
1. Crea un nuevo **Web Service**.
2. Conecta este repositorio de GitHub.
3. Especifica los siguientes parámetros de compilación:
   - **Root Directory:** `Backend-Express`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
4. Añade tus **Variables de Entorno** obligatorias:
   - `NODE_ENV=production`
   - `PORT=3001` *(o el puerto por defecto que asigne Render)*
   - `SUPABASE_URL=tu_url_de_supabase`
   - `SUPABASE_ANON_KEY=tu_anon_key_de_supabase`
   - `JWT_SECRET=tu_clave_secreta_jwt`
5. Despliega. Obtendrás una URL como: `https://sistema-de-gestion-de-eventos-y-x11t.onrender.com`.

### Fase 3: Frontend (Vercel.com)
1. Añade un **New Project** y conecta tu repositorio.
2. Vercel detectará que es un proyecto de Vite. Configura el **Root Directory** a `Frontend-React`.
3. Añade la siguiente **Variable de Entorno**:
   - `VITE_API_URL=https://sistema-de-gestion-de-eventos-y-x11t.onrender.com/api` *(O la URL de Render que obtuviste en el paso anterior)*.
4. Despliega. Tu aplicación estará disponible en una URL como: `https://sistema-de-gestion-de-eventos-y-asi-one.vercel.app/`.

---

## 🚀 Despliegue Local con Docker

Para pruebas y despliegues *on-premise*, el proyecto contiene archivos `Dockerfile` optimizados para empaquetar ambas aplicaciones.

### 1. Variables de Entorno

En la raíz del proyecto, copia el archivo base:
```bash
copy .env.example .env
```
Edita `.env` asegurándote de incluir:
```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
JWT_SECRET=...
```

### 2. Construir e Iniciar Contenedores

SGEH incluye un script `.sh` automatizado y un orquestador:

```bash
# Construir e iniciar en segundo plano (Recomendado)
docker-compose up -d --build
```

### 3. Accesos Locales por Defecto (Vía Docker)

- **Frontend (Nginx):** `http://localhost` (Puerto 80)
- **Backend API:** `http://localhost:5000` *(El docker-compose mapea el puerto interno al 5000).*

### 4. Administración de Contenedores

```bash
# Visualizar logs del backend
docker-compose logs -f backend

# Visualizar logs del frontend
docker-compose logs -f frontend

# Reiniciar
docker-compose restart

# Detener todos los servicios
docker-compose down
```

---

## 🔒 Consideraciones de Seguridad
- NUNCA subas archivos `.env` al control de versiones.
- Asegúrate de configurar un `JWT_SECRET` largo e impredecible en tu panel de Render.
- El servidor Node.js en Render tendrá SSL/HTTPS de manera automática.
- En tu código backend, asegúrate de que el CORS permite el tráfico proveniente del dominio de Vercel configurado.
