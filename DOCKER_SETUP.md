# 🐳 Instalação Local com Docker - CarreiraIA

Este guia explica como instalar e executar o **CarreiraIA** em seu ambiente local usando Docker e Docker Compose.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Docker** (versão 20.10 ou superior)
  - [Instalar Docker no Windows](https://docs.docker.com/desktop/install/windows-install/)
  - [Instalar Docker no macOS](https://docs.docker.com/desktop/install/mac-install/)
  - [Instalar Docker no Linux](https://docs.docker.com/engine/install/)

- **Docker Compose** (versão 2.0 ou superior)
  - Geralmente incluído no Docker Desktop
  - [Instalar Docker Compose standalone](https://docs.docker.com/compose/install/)

## 🚀 Instalação Rápida

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd job_search_system
```

### 2. Configure as credenciais

Edite o arquivo `.env` criado automaticamente e adicione suas credenciais:

```bash
# Adzuna API (obtenha em https://developer.adzuna.com)
ADZUNA_APP_ID=seu-app-id-aqui
ADZUNA_APP_KEY=sua-app-key-aqui

# Stripe (obtenha em https://stripe.com)
STRIPE_SECRET_KEY=sk_test_sua_chave_secreta
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_publica

# Resend Email API (obtenha em https://resend.com)
RESEND_API_KEY=re_sua_api_key
```

### 3. Execute o script de instalação

```bash
cd docker
./install.sh
```

O script irá:
- ✅ Verificar se Docker e Docker Compose estão instalados
- ✅ Criar arquivo `.env` se não existir
- ✅ Construir as imagens Docker
- ✅ Iniciar os containers (MySQL + Aplicação)
- ✅ Executar migrations do banco de dados
- ✅ Exibir status e logs

### 4. Acesse a aplicação

Após a instalação, a aplicação estará disponível em:

- **Frontend**: http://localhost:3000
- **MySQL**: localhost:3306

## 📦 Estrutura do Projeto Docker

```
job_search_system/
├── Dockerfile                    # Imagem da aplicação Node.js
├── docker-compose.yml            # Orquestração dos serviços
├── docker/
│   ├── mysql/
│   │   └── init.sql             # Script de inicialização do banco
│   ├── install.sh               # Script de instalação completa
│   ├── start.sh                 # Script para iniciar aplicação
│   ├── stop.sh                  # Script para parar aplicação
│   └── clean.sh                 # Script para limpar ambiente
└── .env                         # Variáveis de ambiente (credenciais)
```

## 🛠️ Comandos Úteis

### Gerenciamento da Aplicação

```bash
# Iniciar aplicação
./docker/start.sh

# Parar aplicação (mantém dados)
./docker/stop.sh

# Reiniciar aplicação
docker-compose restart

# Limpar ambiente completamente (REMOVE DADOS!)
./docker/clean.sh
```

### Visualizar Logs

```bash
# Ver logs em tempo real
docker-compose logs -f

# Ver logs apenas da aplicação
docker-compose logs -f app

# Ver logs apenas do MySQL
docker-compose logs -f mysql

# Ver últimas 50 linhas
docker-compose logs --tail=50
```

### Acessar Containers

```bash
# Acessar shell da aplicação
docker exec -it carreiraai-app sh

# Acessar MySQL
docker exec -it carreiraai-mysql mysql -u jobsearch -p
# Senha: jobsearch123
```

### Gerenciar Banco de Dados

```bash
# Executar migrations
docker exec -it carreiraai-app pnpm db:push

# Acessar MySQL CLI
docker exec -it carreiraai-mysql mysql -u jobsearch -pjobsearch123 job_search_db

# Backup do banco
docker exec carreiraai-mysql mysqldump -u jobsearch -pjobsearch123 job_search_db > backup.sql

# Restaurar backup
docker exec -i carreiraai-mysql mysql -u jobsearch -pjobsearch123 job_search_db < backup.sql
```

## 🔧 Configuração Avançada

### Portas Customizadas

Para alterar as portas padrão, edite o arquivo `docker-compose.yml`:

```yaml
services:
  app:
    ports:
      - "8080:3000"  # Mude 8080 para sua porta desejada
  
  mysql:
    ports:
      - "3307:3306"  # Mude 3307 para sua porta desejada
```

### Variáveis de Ambiente Adicionais

Adicione novas variáveis no arquivo `.env`:

```bash
# Exemplo: configurar timezone
TZ=America/Sao_Paulo

# Exemplo: modo de desenvolvimento
NODE_ENV=development
```

### Hot Reload (Desenvolvimento)

O hot reload está habilitado por padrão. Alterações no código são refletidas automaticamente sem reiniciar o container.

## 🐛 Troubleshooting

### Problema: Porta 3000 já está em uso

**Solução**: Pare o processo que está usando a porta ou altere a porta no `docker-compose.yml`

```bash
# Descobrir qual processo está usando a porta
lsof -i :3000  # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Matar o processo (Linux/Mac)
kill -9 <PID>
```

### Problema: MySQL não inicia

**Solução**: Remova o volume e recrie

```bash
docker-compose down -v
./docker/install.sh
```

### Problema: Erro de permissão nos scripts

**Solução**: Dê permissão de execução

```bash
chmod +x docker/*.sh
```

### Problema: Containers não param

**Solução**: Force a parada

```bash
docker-compose down --remove-orphans
docker system prune -a  # Remove tudo (cuidado!)
```

## 📊 Monitoramento

### Ver status dos containers

```bash
docker-compose ps
```

### Ver uso de recursos

```bash
docker stats
```

### Ver redes Docker

```bash
docker network ls
docker network inspect job_search_system_carreiraai-network
```

## 🔐 Segurança

### Credenciais Padrão (DESENVOLVIMENTO APENAS!)

- **MySQL Root**: rootpassword
- **MySQL User**: jobsearch
- **MySQL Password**: jobsearch123
- **Database**: job_search_db

⚠️ **IMPORTANTE**: Altere essas credenciais em produção!

### Arquivo .env

O arquivo `.env` contém informações sensíveis. **NUNCA** faça commit dele no Git!

```bash
# Adicione ao .gitignore
echo ".env" >> .gitignore
```

## 📚 Recursos Adicionais

- [Documentação do Docker](https://docs.docker.com/)
- [Documentação do Docker Compose](https://docs.docker.com/compose/)
- [Best Practices Docker](https://docs.docker.com/develop/dev-best-practices/)

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Verifique o status: `docker-compose ps`
3. Tente reiniciar: `docker-compose restart`
4. Limpe e reinstale: `./docker/clean.sh && ./docker/install.sh`

## 📝 Notas

- Os dados do banco são persistidos em volumes Docker
- O código fonte é montado como volume para hot reload
- As dependências npm são instaladas dentro do container
- O primeiro build pode demorar alguns minutos

---

**Desenvolvido com ❤️ para facilitar seu desenvolvimento local!**
