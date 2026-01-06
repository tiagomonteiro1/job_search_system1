-- Script de inicialização do banco de dados MySQL
-- Este script é executado automaticamente quando o container MySQL é criado pela primeira vez

-- Criar banco de dados se não existir
CREATE DATABASE IF NOT EXISTS job_search_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar o banco de dados
USE job_search_db;

-- Garantir que o usuário tem todas as permissões
GRANT ALL PRIVILEGES ON job_search_db.* TO 'jobsearch'@'%';
FLUSH PRIVILEGES;

-- Mensagem de sucesso
SELECT 'Banco de dados job_search_db criado com sucesso!' AS message;
