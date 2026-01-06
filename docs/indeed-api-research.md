# Pesquisa sobre Indeed API

## Descobertas Principais

### 1. Indeed Partner APIs
O Indeed oferece várias APIs para parceiros:

#### Job Sync API (GraphQL)
- **Funcionalidade**: Criar, atualizar, expirar e listar vagas no Indeed
- **Tipo**: GraphQL API
- **Uso**: Para sistemas ATS (Applicant Tracking System) gerenciarem vagas

#### Indeed Apply
- **Funcionalidade**: Permitir que candidatos se candidatem a vagas
- **Integração**: Via Job Sync API
- **Benefício**: Candidaturas rápidas e fáceis para candidatos

#### Disposition Sync API
- **Funcionalidade**: Enviar dados de status de candidaturas para o Indeed
- **Uso**: Atualizar status (visualizado, rejeitado, aprovado, etc.)

#### Candidate Sync APIs
- **Funcionalidade**: Obter informações de candidatos do Indeed
- **Uso**: Sincronizar dados de candidatos

### 2. Autenticação
- **Método**: OAuth 2.0
- **Tipos**:
  - Authorization Code Grant (3-legged OAuth) - Para agir em nome de usuários
  - Client Credentials Grant (2-legged OAuth) - Para operações do aplicativo

### 3. Requisitos para Integração
1. Tornar-se parceiro do Indeed
2. Registrar aplicação no Partner Console
3. Obter credenciais OAuth (Client ID e Client Secret)
4. Implementar fluxo OAuth 2.0

### 4. Limitações Identificadas
- **Acesso Restrito**: APIs são apenas para parceiros aprovados
- **Não há API pública de busca**: Indeed não oferece API pública para buscar vagas
- **Foco em Empregadores**: APIs focam em permitir que empregadores postem vagas, não em buscar vagas

## Alternativas para Busca de Vagas

### Opção 1: Indeed Publisher Program
- Programa para publishers que querem exibir vagas do Indeed
- Requer aprovação e Publisher ID
- Permite buscar vagas via XML feed

### Opção 2: Web Scraping (com cuidado)
- Usar bibliotecas como Puppeteer ou Playwright
- Respeitar robots.txt e termos de serviço
- Implementar rate limiting
- **Risco**: Pode violar termos de serviço

### Opção 3: APIs de Terceiros
- **RapidAPI**: Oferece APIs não oficiais para Indeed
- **HasData**: API de scraping de Indeed
- **SerpAPI**: API para buscar resultados do Indeed

## Recomendação para o Sistema CarreiraIA

### Abordagem Híbrida:

1. **Para Busca de Vagas**:
   - Usar APIs de terceiros confiáveis (RapidAPI, SerpAPI)
   - Implementar cache para reduzir custos
   - Adicionar múltiplas fontes (LinkedIn, Catho, InfoJobs)

2. **Para Candidaturas**:
   - **Automação com Puppeteer/Playwright**:
     - Simular preenchimento de formulários
     - Fazer login com credenciais do usuário
     - Enviar currículo automaticamente
   - **Integração Indeed Apply** (se aprovado como parceiro):
     - Usar Job Sync API
     - Implementar OAuth 2.0
     - Enviar via Disposition Sync API

3. **Histórico e Tracking**:
   - Armazenar todos os envios no banco de dados
   - Registrar payload das requisições
   - Monitorar status de sucesso/falha

## Próximos Passos

1. ✅ Implementar filtros avançados de busca
2. ✅ Integrar API de terceiros para busca de vagas (RapidAPI ou similar)
3. ✅ Implementar automação de candidaturas com Puppeteer
4. ✅ Adicionar sistema de credenciais para login automático
5. ✅ Criar histórico detalhado de envios
6. ⏳ Considerar aplicar para Indeed Partner Program (longo prazo)
