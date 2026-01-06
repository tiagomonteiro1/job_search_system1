#!/bin/bash

# Script de instalação do CarreiraIA em ambiente local com Docker
# Este script configura todo o ambiente de desenvolvimento automaticamente

set -e  # Parar execução em caso de erro

echo "======================================"
echo "  CarreiraIA - Instalação Docker"
echo "======================================"
echo ""

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado!"
    echo "Por favor, instale o Docker primeiro: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose não está instalado!"
    echo "Por favor, instale o Docker Compose primeiro: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker e Docker Compose detectados"
echo ""

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cat > .env << 'EOF'
# Variáveis de ambiente para desenvolvimento local
# IMPORTANTE: Substitua os valores abaixo pelas suas credenciais reais

# Adzuna API (obtenha em https://developer.adzuna.com)
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key

# Stripe (obtenha em https://stripe.com)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Resend Email API (obtenha em https://resend.com)
RESEND_API_KEY=re_your_resend_api_key

# Manus Forge API (opcional - para recursos de IA)
BUILT_IN_FORGE_API_KEY=your-forge-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-key
EOF
    echo "✅ Arquivo .env criado"
    echo "⚠️  IMPORTANTE: Edite o arquivo .env e adicione suas credenciais reais!"
    echo ""
fi

# Parar containers existentes
echo "🛑 Parando containers existentes (se houver)..."
docker-compose down 2>/dev/null || true
echo ""

# Remover volumes antigos (opcional - descomente se quiser limpar dados)
# echo "🗑️  Removendo volumes antigos..."
# docker-compose down -v
# echo ""

# Construir imagens
echo "🔨 Construindo imagens Docker..."
docker-compose build
echo ""

# Iniciar containers
echo "🚀 Iniciando containers..."
docker-compose up -d
echo ""

# Aguardar MySQL estar pronto
echo "⏳ Aguardando MySQL inicializar..."
sleep 10

# Verificar status dos containers
echo "📊 Status dos containers:"
docker-compose ps
echo ""

# Mostrar logs
echo "📋 Últimas linhas dos logs:"
docker-compose logs --tail=20
echo ""

echo "======================================"
echo "  ✅ Instalação Concluída!"
echo "======================================"
echo ""
echo "🌐 Aplicação disponível em: http://localhost:3000"
echo "🗄️  MySQL disponível em: localhost:3306"
echo ""
echo "📝 Comandos úteis:"
echo "  - Ver logs:           docker-compose logs -f"
echo "  - Parar aplicação:    docker-compose stop"
echo "  - Reiniciar:          docker-compose restart"
echo "  - Parar e remover:    docker-compose down"
echo "  - Acessar shell app:  docker exec -it carreiraai-app sh"
echo "  - Acessar MySQL:      docker exec -it carreiraai-mysql mysql -u jobsearch -p"
echo ""
echo "⚠️  Não esqueça de configurar suas credenciais no arquivo .env!"
echo ""
