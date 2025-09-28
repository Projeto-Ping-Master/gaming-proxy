# Guia de Instalação - Gaming Proxy

Este guia fornece instruções detalhadas para instalar e configurar o Gaming Proxy.

## ⚡ Instalação Rápida (Recomendada)

### 1. Pré-requisitos

- **Windows 10/11 (x64)** - Sistema operacional suportado
- **Node.js 18+** - [Download aqui](https://nodejs.org/)
- **Docker Desktop** - [Download aqui](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download aqui](https://git-scm.com/)
- **Visual Studio Build Tools** (para compilação C++) - [Download aqui](https://visualstudio.microsoft.com/pt-br/downloads/#build-tools-for-visual-studio-2022)

### 2. Download do Projeto

```bash
git clone https://github.com/Projeto-Ping-Master/gaming-proxy.git
cd gaming-proxy
```

### 3. Instalação das Dependências

```bash
# Instalar dependências do workspace
npm install

# Instalar dependências específicas dos pacotes
npm run bootstrap
```

### 4. Configuração do Ambiente

```bash
# Copiar arquivo de configuração
cp packages/backend/.env.example packages/backend/.env

# Editar configurações (use seu editor preferido)
notepad packages/backend/.env
```

**Configurações mínimas necessárias:**

```env
# JWT (gere chaves seguras em produção)
JWT_SECRET="gaming-proxy-jwt-secret-change-in-production"
JWT_REFRESH_SECRET="gaming-proxy-refresh-secret-change-in-production"

# Email (configure com seu provedor)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-app"
FROM_EMAIL="noreply@gaming-proxy.com"

# Stripe (chaves de teste)
STRIPE_SECRET_KEY="sk_test_sua_chave_secreta"
STRIPE_WEBHOOK_SECRET="whsec_seu_webhook_secret"
```

### 5. Inicialização dos Serviços

```bash
# Iniciar PostgreSQL e Redis
docker-compose up -d

# Aguardar serviços ficarem prontos (cerca de 30 segundos)
```

### 6. Configuração do Banco de Dados

```bash
cd packages/backend

# Gerar cliente Prisma
npm run db:generate

# Executar migrações
npm run db:migrate

# Popular com dados iniciais
npm run db:seed
```

### 7. Compilação do Agent Nativo (Opcional)

> **Nota:** Esta etapa é opcional para desenvolvimento. O PoC pode ser testado sem compilar o agent.

```bash
cd packages/native-agent

# Baixar WinDivert
# 1. Vá para: https://github.com/basil00/Divert/releases
# 2. Baixe a versão mais recente (ex: WinDivert-2.2.2.zip)
# 3. Extraia para: lib/WinDivert/

# Compilar agent (requer Visual Studio Build Tools)
npm run build
```

### 8. Inicialização do Sistema

```bash
# Terminal 1: Backend API
cd packages/backend
npm run dev

# Terminal 2: Cliente Desktop (nova janela)
cd packages/client
npm run dev
```

## 🔧 Configuração Avançada

### Configuração de Email

Para receber emails de verificação:

#### Gmail com Senha de App:
1. Ative a verificação em 2 etapas na sua conta Google
2. Gere uma senha de app em: https://myaccount.google.com/apppasswords
3. Use a senha de app no campo `SMTP_PASS`

#### Outros Provedores:
- **Outlook/Hotmail:** `smtp-mail.outlook.com:587`
- **Yahoo:** `smtp.mail.yahoo.com:587`
- **SendGrid:** Configure via API key

### Configuração do Stripe

Para pagamentos funcionais:

1. **Criar conta no Stripe:**
   - Acesse: https://dashboard.stripe.com/register
   - Complete o cadastro

2. **Obter chaves de teste:**
   - Vá para: Developers > API keys
   - Copie a "Secret key" (sk_test_...)

3. **Configurar webhook:**
   - Vá para: Developers > Webhooks
   - URL: `http://localhost:3000/api/v1/billing/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

4. **Criar produtos (opcional):**
   - Vá para: Products
   - Crie produtos para: Mensal (R$ 19,99), Trimestral (R$ 54,99), Anual (R$ 199,99)

### Configuração de Produção

#### Variáveis de Ambiente Adicionais:

```env
# Produção
NODE_ENV="production"
APP_URL="https://api.gaming-proxy.com"
CLIENT_URL="https://gaming-proxy.com"

# Database (use managed services)
DATABASE_URL="postgresql://user:pass@prod-db:5432/gaming_proxy"
REDIS_URL="redis://prod-redis:6379"

# Security
BCRYPT_ROUNDS=14
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Email production
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="SG.your-sendgrid-api-key"

# Stripe production
STRIPE_SECRET_KEY="sk_live_your_live_key"
STRIPE_WEBHOOK_SECRET="whsec_your_live_webhook_secret"
```

## 🐛 Solução de Problemas

### Erro: "WinDivert não encontrado"

**Solução:**
1. Baixe WinDivert: https://github.com/basil00/Divert/releases
2. Extraia para: `packages/native-agent/lib/WinDivert/`
3. Estrutura esperada:
   ```
   lib/WinDivert/
   ├── include/windivert.h
   ├── x64/WinDivert.lib
   └── x64/WinDivert.dll
   ```

### Erro: "Database connection failed"

**Diagnóstico:**
```bash
# Verificar se Docker está rodando
docker ps

# Verificar logs do PostgreSQL
docker logs gaming-proxy-postgres

# Testar conexão manual
docker exec -it gaming-proxy-postgres psql -U admin -d gaming_proxy
```

**Soluções:**
- Reiniciar Docker: `docker-compose restart`
- Recriar containers: `docker-compose down && docker-compose up -d`
- Verificar porta 5432 não está em uso

### Erro: "Permission denied" (Windows)

**Solução:**
- Execute o terminal como Administrador
- O agent nativo requer privilégios elevados para captura de tráfego

### Erro: "Email not sending"

**Diagnóstico:**
1. Verificar configurações SMTP no `.env`
2. Testar credenciais manualmente
3. Verificar logs do backend: `packages/backend/logs/`

**Soluções comuns:**
- Gmail: Use senha de app, não senha da conta
- Outlook: Ative "Aplicativos menos seguros"
- Verifique firewall/antivírus bloqueando SMTP

### Cliente não conecta ao backend

**Diagnóstico:**
```bash
# Testar API diretamente
curl http://localhost:3000/health

# Verificar logs do backend
tail -f packages/backend/logs/combined.log
```

**Soluções:**
- Verificar se backend está rodando na porta 3000
- Verificar firewall do Windows
- Confirmar `CLIENT_URL` no `.env`

### Performance lenta

**Otimizações:**
1. **Aumentar recursos do Docker:**
   - Docker Desktop > Settings > Resources
   - RAM: Mínimo 4GB
   - CPU: Mínimo 2 cores

2. **Otimizar banco de dados:**
   ```sql
   -- Conectar ao PostgreSQL
   docker exec -it gaming-proxy-postgres psql -U admin -d gaming_proxy

   -- Verificar índices
   \\di

   -- Analisar queries lentas
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

3. **Limpar cache Redis:**
   ```bash
   docker exec -it gaming-proxy-redis redis-cli FLUSHALL
   ```

## 📊 Verificação da Instalação

### 1. Serviços Ativos

```bash
# Verificar containers Docker
docker ps

# Devem estar rodando:
# - gaming-proxy-postgres
# - gaming-proxy-redis
# - gaming-proxy-adminer (opcional)
```

### 2. API Backend

```bash
# Testar health endpoint
curl http://localhost:3000/health

# Resposta esperada:
# {"status":"ok","timestamp":"...","uptime":...}
```

### 3. Banco de Dados

```bash
# Verificar dados seedados
curl http://localhost:3000/api/v1/games

# Deve retornar lista de jogos (Valorant, LoL, etc.)
```

### 4. Cliente Desktop

- O Electron deve abrir automaticamente
- Tela de login deve aparecer
- Criar conta de teste deve funcionar

### 5. Admin Panel

- Acesse: http://localhost:8080 (Adminer)
- Login: admin / admin123
- Database: gaming_proxy

## 🔄 Comandos Úteis

```bash
# Reiniciar tudo
docker-compose restart
npm run dev

# Limpar dados de desenvolvimento
npm run clean
docker-compose down -v

# Atualizar dependências
npm update
npm run bootstrap

# Ver logs em tempo real
docker-compose logs -f postgres
docker-compose logs -f redis
tail -f packages/backend/logs/combined.log

# Backup do banco
docker exec gaming-proxy-postgres pg_dump -U admin gaming_proxy > backup.sql

# Restaurar backup
cat backup.sql | docker exec -i gaming-proxy-postgres psql -U admin -d gaming_proxy
```

## 🚀 Próximos Passos

Após a instalação bem-sucedida:

1. **Teste básico:** Criar conta, fazer login, visualizar dashboard
2. **Configurar um jogo:** Instalar Valorant/LoL para teste
3. **Testar otimização:** Ativar boost e verificar métricas
4. **Explorar admin:** Acessar funcionalidades administrativas
5. **Configurar produção:** Seguir guias de deploy

## 💬 Suporte

Se encontrar problemas:

1. **Documentação:** Consulte o README.md principal
2. **Issues:** https://github.com/Projeto-Ping-Master/gaming-proxy/issues
3. **Discord:** [Link do servidor da comunidade]
4. **Email:** suporte@gaming-proxy.com

---

✅ **Instalação concluída!** O Gaming Proxy está pronto para uso.