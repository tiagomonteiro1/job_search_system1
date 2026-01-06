#!/bin/bash

# Script para iniciar a aplicação CarreiraIA com Docker

set -e

echo "🚀 Iniciando CarreiraIA..."
echo ""

# Iniciar containers
docker-compose up -d

echo ""
echo "✅ Aplicação iniciada!"
echo "🌐 Acesse: http://localhost:3000"
echo ""
echo "📋 Para ver os logs em tempo real, execute:"
echo "   docker-compose logs -f"
echo ""
