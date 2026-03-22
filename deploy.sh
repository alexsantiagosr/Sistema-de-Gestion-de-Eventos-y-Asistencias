#!/bin/bash

# ===========================================
# SGEH - Script de Deploy Automático
# ===========================================

set -e  # Exit on error

echo "🚀 Iniciando deploy de SGEH..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists
if [ ! -f .env ]; then
    log_error "El archivo .env no existe. Copia .env.example a .env y configúralo."
    exit 1
fi

# Stop existing containers
log_info "Deteniendo contenedores existentes..."
docker-compose down

# Build images
log_info "Construyendo imágenes Docker..."
docker-compose build

# Start services
log_info "Iniciando servicios..."
docker-compose up -d

# Wait for services to be ready
log_info "Esperando a que los servicios estén listos..."
sleep 10

# Health check
log_info "Verificando salud de los servicios..."

# Check backend
if curl -s http://localhost:5000/api/health > /dev/null; then
    log_info "✅ Backend está funcionando"
else
    log_error "❌ Backend no responde"
    docker-compose logs backend
    exit 1
fi

# Check frontend
if curl -s http://localhost > /dev/null; then
    log_info "✅ Frontend está funcionando"
else
    log_error "❌ Frontend no responde"
    docker-compose logs frontend
    exit 1
fi

echo ""
log_info "==========================================="
log_info "🎉 ¡Deploy completado exitosamente!"
log_info "==========================================="
echo ""
log_info "Accede a la aplicación:"
echo "  Frontend: http://localhost"
echo "  Backend:  http://localhost:5000"
echo ""
log_info "Para ver logs en tiempo real:"
echo "  docker-compose logs -f"
echo ""
log_info "Para detener los servicios:"
echo "  docker-compose down"
echo ""
