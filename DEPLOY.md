# 🐳 SGEH - Guía de Deploy con Docker

## 📋 Prerrequisitos

- Docker Desktop instalado
- Docker Compose instalado
- Cuenta en Supabase (base de datos ya configurada)

---

## 🚀 Deploy Local con Docker

### 1. Clonar el repositorio

```bash
cd c:\Users\alexsantiagosr\GestionTecnologia-SGEH
```

### 2. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
copy .env.example .env

# Editar .env con tus credenciales de Supabase
notepad .env
```

### 3. Construir y levantar contenedores

```bash
# Construir imágenes
docker-compose build

# Levantar servicios
docker-compose up -d
```

### 4. Verificar servicios

```bash
# Ver logs
docker-compose logs -f

# Ver estado de contenedores
docker-compose ps
```

### 5. Acceder a la aplicación

- **Frontend:** http://localhost
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

### 6. Detener servicios

```bash
docker-compose down
```

---

## ☁️ Deploy a Producción

### Opción A: Railway.app

1. **Backend:**
   ```bash
   # Conectar Railway CLI
   railway login
   
   # Inicializar proyecto
   railway init
   
   # Deploy
   railway up
   ```

2. **Variables de entorno en Railway Dashboard:**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`

3. **Frontend (Vercel):**
   ```bash
   # Instalar Vercel CLI
   npm i -g vercel
   
   # Deploy
   cd frontend
   vercel --prod
   ```

4. **Variables en Vercel:**
   - `VITE_API_URL=https://tu-backend.railway.app/api`

---

### Opción B: Render.com

1. **Backend:**
   - Crear Web Service en Render
   - Conectar repositorio
   - Build Command: `npm install`
   - Start Command: `node src/server.js`
   - Agregar variables de entorno

2. **Frontend:**
   - Crear Static Site en Render
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

---

### Opción C: AWS (EC2 + ECS)

1. **EC2 Instance:**
   ```bash
   # Instalar Docker
   sudo yum update -y
   sudo yum install -y docker
   sudo service docker start
   sudo usermod -a -G docker ec2-user
   
   # Instalar Docker Compose
   sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Copiar archivos:**
   ```bash
   scp -r . ec2-user@your-ec2-ip:/home/ec2-user/sgeh
   ```

3. **Deploy:**
   ```bash
   ssh ec2-user@your-ec2-ip
   cd sgeh
   docker-compose up -d
   ```

---

## 🔧 Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar servicios
docker-compose restart

# Reconstruir desde cero
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Acceder a la shell del contenedor
docker-compose exec backend sh
docker-compose exec frontend sh

# Ver uso de recursos
docker stats

# Limpiar recursos no usados
docker system prune -a
```

---

## 📊 Monitoreo

### Health Checks

- **Backend:** http://localhost:5000/api/health
- **Frontend:** http://localhost/

### Logs

```bash
# Backend
docker-compose logs backend

# Frontend
docker-compose logs frontend
```

---

## 🔒 Seguridad

### Variables Sensibles

NUNCA subas el archivo `.env` a Git. El proyecto incluye `.gitignore` configurado.

### Producción

1. Cambia `JWT_SECRET` a un valor único y seguro
2. Usa HTTPS con certificado SSL (Let's Encrypt)
3. Configura firewall para permitir solo puertos 80/443
4. Rota las claves de Supabase periódicamente

---

## 🆘 Troubleshooting

### Error: "Cannot find module"

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Error: "Connection refused"

Verifica que las variables de Supabase sean correctas en `.env`

### Error: "Port already in use"

```bash
# Cambia los puertos en docker-compose.yml
ports:
  - "5001:5000"  # Backend
  - "8080:80"    # Frontend
```

---

## 📞 Soporte

Para issues relacionados con Docker:
```bash
docker-compose ps
docker-compose logs
docker stats
```

Para issues de la aplicación:
```bash
docker-compose logs backend
docker-compose logs frontend
```
