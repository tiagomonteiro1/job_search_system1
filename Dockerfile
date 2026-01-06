# Dockerfile para CarreiraIA - Sistema de Busca de Emprego com IA
FROM node:22-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY . .

# Expor porta da aplicação
EXPOSE 3000

# Comando para desenvolvimento (com hot reload)
CMD ["pnpm", "dev"]
