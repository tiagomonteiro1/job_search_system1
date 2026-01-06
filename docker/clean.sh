#!/bin/bash

# Script para limpar completamente o ambiente Docker
# ATENÇÃO: Este script remove todos os dados do banco de dados!

set -e

echo "⚠️  ATENÇÃO: Este script irá remover TODOS os dados!"
echo ""
read -p "Tem certeza que deseja continuar? (digite 'sim' para confirmar): " confirm

if [ "$confirm" != "sim" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

echo ""
echo "🗑️  Parando e removendo containers..."
docker-compose down

echo ""
echo "🗑️  Removendo volumes (dados do banco)..."
docker-compose down -v

echo ""
echo "🗑️  Removendo imagens..."
docker-compose down --rmi local 2>/dev/null || true

echo ""
echo "✅ Ambiente limpo!"
echo ""
echo "💡 Para reinstalar, execute:"
echo "   ./docker/install.sh"
echo ""
