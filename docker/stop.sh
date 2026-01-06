#!/bin/bash

# Script para parar a aplicação CarreiraIA

set -e

echo "🛑 Parando CarreiraIA..."
echo ""

# Parar containers
docker-compose stop

echo ""
echo "✅ Aplicação parada!"
echo ""
echo "💡 Para iniciar novamente, execute:"
echo "   ./docker/start.sh"
echo ""
echo "🗑️  Para parar e remover containers, execute:"
echo "   docker-compose down"
echo ""
