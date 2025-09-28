# Gaming Proxy - Configuração para Claude Code

Este arquivo contém comandos e configurações específicas para desenvolvimento com Claude Code.

## 🚀 Comandos de Desenvolvimento

### Inicialização Rápida
```bash
# Iniciar todos os serviços de desenvolvimento
npm run dev

# Iniciar apenas backend
npm run dev:backend

# Iniciar apenas cliente
npm run dev:client

# Iniciar node server
npm run dev:node-server
```

### Build e Deploy
```bash
# Build completo
npm run build

# Build específico
npm run build:backend
npm run build:client
npm run build:node-server
```

### Testes
```bash
# Executar todos os testes
npm test

# Testes do backend
npm run test:backend

# Testes do cliente
npm run test:client

# Verificação de tipos
npm run typecheck

# Linting
npm run lint
```

### Banco de Dados
```bash
# Gerar cliente Prisma
cd packages/backend && npm run db:generate

# Executar migrações
cd packages/backend && npm run db:migrate

# Popular dados de teste
cd packages/backend && npm run db:seed

# Reset completo do banco
cd packages/backend && npm run db:reset
```

### Docker
```bash
# Iniciar serviços (PostgreSQL + Redis)
docker-compose up -d

# Parar serviços
docker-compose down

# Ver logs
docker-compose logs -f

# Reset completo (remove volumes)
docker-compose down -v && docker-compose up -d
```

### Native Agent
```bash
# Compilar agent C++
cd packages/native-agent && npm run build

# Compilar em modo debug
cd packages/native-agent && npm run build:debug

# Limpar build
cd packages/native-agent && npm run clean
```

## 🔧 Configurações de Ambiente

### Desenvolvimento Local
Arquivo: `packages/backend/.env`
```env
NODE_ENV="development"
PORT=3000
DATABASE_URL="postgresql://admin:admin123@localhost:5432/gaming_proxy"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="development-jwt-secret"
JWT_REFRESH_SECRET="development-refresh-secret"
CLIENT_URL="http://localhost:3001"
```

### Variáveis Críticas para Configurar
1. **JWT_SECRET** - Chave para tokens de autenticação
2. **SMTP_*** - Configurações de email para verificação de conta
3. **STRIPE_*** - Chaves do Stripe para pagamentos
4. **DATABASE_URL** - String de conexão PostgreSQL
5. **REDIS_URL** - String de conexão Redis

## 📁 Estrutura do Projeto

```
gaming-proxy/
├── packages/
│   ├── backend/          # API REST (Node.js + TypeScript)
│   │   ├── src/
│   │   │   ├── routes/   # Endpoints da API
│   │   │   ├── services/ # Lógica de negócio
│   │   │   ├── db/       # Prisma + configurações
│   │   │   └── utils/    # Utilitários
│   │   └── prisma/       # Schema e migrações
│   ├── client/           # Aplicação Electron + React
│   │   ├── src/
│   │   │   ├── pages/    # Páginas React
│   │   │   ├── components/ # Componentes
│   │   │   └── contexts/ # Context API
│   │   └── electron/     # Processo principal Electron
│   ├── shared/           # Types e utilitários compartilhados
│   ├── native-agent/     # Agent C++ para captura de tráfego
│   │   ├── src/          # Código C++
│   │   ├── include/      # Headers
│   │   └── lib/          # WinDivert (baixar separadamente)
│   └── node-server/      # Servidor de relay para túneis
├── scripts/              # Scripts de automação
├── docker-compose.yml    # PostgreSQL + Redis
└── README.md            # Documentação principal
```

## 🐛 Debugging

### Backend API
- **Logs:** `packages/backend/logs/`
- **Health Check:** http://localhost:3000/health
- **Database Admin:** http://localhost:8080 (Adminer)
  - Servidor: gaming-proxy-postgres
  - Usuário: admin
  - Senha: admin123
  - Base: gaming_proxy

### Cliente Electron
- **DevTools:** F12 na aplicação
- **Logs:** Console do Electron
- **Store:** Dados salvos em: `%APPDATA%/gaming-proxy/`

### Native Agent
- **Requer Admin:** Execute terminal como Administrador
- **WinDivert:** Baixe de https://github.com/basil00/Divert/releases
- **Logs:** Console do terminal

## 🔄 Workflow de Desenvolvimento

### 1. Primeira Configuração
```bash
# Clone e configure
git clone <repo>
cd gaming-proxy
npm install

# Configure ambiente
cp packages/backend/.env.example packages/backend/.env
# Edite .env com suas configurações

# Inicie serviços
docker-compose up -d

# Configure banco
cd packages/backend
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 2. Desenvolvimento Diário
```bash
# Terminal 1: Backend
cd packages/backend
npm run dev

# Terminal 2: Cliente
cd packages/client
npm run dev

# Terminal 3: Logs Docker (opcional)
docker-compose logs -f
```

### 3. Antes de Commit
```bash
# Verificações obrigatórias
npm run typecheck
npm run lint
npm test

# Fix automático (se possível)
npm run lint:fix
```

## 📊 Endpoints Principais

### Autenticação
- `POST /api/v1/auth/signup` - Criar conta
- `POST /api/v1/auth/login` - Fazer login
- `GET /api/v1/auth/me` - Dados do usuário

### Servidores
- `GET /api/v1/servers` - Listar servidores
- `GET /api/v1/servers/recommended` - Servidor recomendado

### Sessões
- `POST /api/v1/session/start` - Iniciar otimização
- `POST /api/v1/session/stop` - Parar otimização
- `GET /api/v1/session/active` - Sessão ativa

### Jogos
- `GET /api/v1/games` - Listar jogos suportados

### Métricas
- `GET /api/v1/metrics/dashboard` - Métricas do dashboard
- `GET /api/v1/metrics/realtime/:sessionId` - Métricas em tempo real

### Pagamentos
- `GET /api/v1/billing/plans` - Planos disponíveis
- `POST /api/v1/billing/create-checkout-session` - Criar pagamento

## 🚨 Problemas Comuns

### 1. "Database connection failed"
```bash
# Verificar Docker
docker ps
docker-compose restart

# Verificar logs
docker logs gaming-proxy-postgres
```

### 2. "Port 3000 already in use"
```bash
# Encontrar processo usando a porta
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 3. "WinDivert not found"
1. Baixe: https://github.com/basil00/Divert/releases
2. Extraia em: `packages/native-agent/lib/WinDivert/`
3. Estrutura: `lib/WinDivert/include/`, `lib/WinDivert/x64/`

### 4. "Permission denied" (Native Agent)
- Execute PowerShell/CMD como Administrador
- O agent precisa de privilégios elevados

### 5. Cliente não abre
```bash
# Verificar Node.js e dependências
node --version
npm --version

# Reinstalar dependências
cd packages/client
rm -rf node_modules
npm install
```

## 🎯 Testes Essenciais

### 1. Funcionalidade Básica
- [ ] Criar conta
- [ ] Fazer login
- [ ] Visualizar dashboard
- [ ] Listar servidores
- [ ] Listar jogos

### 2. Otimização
- [ ] Iniciar sessão de otimização
- [ ] Ver métricas em tempo real
- [ ] Parar sessão

### 3. Pagamentos (com Stripe test)
- [ ] Visualizar planos
- [ ] Processo de checkout
- [ ] Webhooks funcionando

### 4. Admin
- [ ] Estatísticas gerais
- [ ] Sessões ativas
- [ ] Métricas de nodes

## 💡 Dicas de Produtividade

1. **Use o setup automático:** `.\scripts\setup.ps1`
2. **Monitor contínuo:** `npm run dev` (ambos serviços)
3. **Logs centralizados:** `docker-compose logs -f`
4. **Hot reload:** Backend e frontend têm reload automático
5. **Database admin:** Adminer em http://localhost:8080

## 🔐 Segurança

- Nunca commite arquivos `.env`
- Use chaves de teste do Stripe em desenvolvimento
- JWT secrets devem ser únicos por ambiente
- WinDivert requer privilégios de administrador por design

---

**📝 Última atualização:** Este arquivo deve ser atualizado conforme o projeto evolui.