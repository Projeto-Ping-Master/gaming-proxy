# Gaming Proxy

Sistema completo de redução de latência e otimização de conexão para jogos online, replicando funcionalidades de soluções como NoPing e ExitLag.

## 🎮 Características

- **Redução de Ping**: Otimização automática de rotas para reduzir latência
- **Multi-Conexão**: Suporte a múltiplas rotas simultâneas
- **Detecção Automática**: Identificação automática de jogos em execução
- **Interface Moderna**: Cliente desktop com Electron + React
- **Analytics**: Métricas em tempo real e histórico
- **Segurança**: Criptografia TLS e conformidade com anti-cheat

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cliente       │    │   Backend API   │    │   Node Servers  │
│   (Electron)    │◄──►│   (Node.js)     │◄──►│   (Relay)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Native Agent   │    │   PostgreSQL    │    │   Game Servers  │
│  (C++ WinDivert)│    │   Redis Cache   │    │   (Destino)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Instalação Rápida

### Pré-requisitos

- Windows 10/11 (x64)
- Node.js 18+
- Docker Desktop
- Visual Studio Build Tools (para compilação C++)
- Git

### 1. Clone o Repositório

```bash
git clone https://github.com/Projeto-Ping-Master/gaming-proxy.git
cd gaming-proxy
```

### 2. Instale as Dependências

```bash
# Instalar dependências do workspace
npm install

# Instalar dependências específicas
cd packages/backend && npm install
cd ../client && npm install
cd ../shared && npm install
```

### 3. Configure o Ambiente

```bash
# Copie o arquivo de configuração
cp packages/backend/.env.example packages/backend/.env

# Edite as variáveis de ambiente necessárias
# - JWT_SECRET: Chave para tokens JWT
# - SMTP_*: Configurações de email
# - STRIPE_*: Chaves do Stripe
```

### 4. Inicie os Serviços

```bash
# Iniciar PostgreSQL e Redis com Docker
docker-compose up -d

# Aguardar serviços ficarem prontos
# PostgreSQL: localhost:5432
# Redis: localhost:6379
# Adminer: http://localhost:8080
```

### 5. Configure o Banco de Dados

```bash
cd packages/backend

# Gerar cliente Prisma
npm run db:generate

# Executar migrações
npm run db:migrate

# Popular com dados de teste
npm run db:seed
```

### 6. Compile o Agent Nativo (Opcional)

```bash
cd packages/native-agent

# Baixar WinDivert (necessário para captura de tráfego)
# Baixe de: https://github.com/basil00/Divert/releases
# Extraia em: lib/WinDivert/

# Compilar agent
npm run build
```

### 7. Inicie o Sistema

```bash
# Terminal 1: Backend API
cd packages/backend
npm run dev

# Terminal 2: Cliente Desktop
cd packages/client
npm run dev

# O cliente abrirá automaticamente em http://localhost:3001
```

## 🎯 Uso

### 1. Criar Conta

1. Abra o cliente desktop
2. Clique em \"Criar Conta\"
3. Insira email e senha
4. Verifique o email recebido

### 2. Fazer Login

1. Use suas credenciais para entrar
2. O dashboard será exibido

### 3. Otimizar Conexão

1. Abra seu jogo favorito
2. No dashboard, clique \"Otimizar Conexão\"
3. O sistema detectará automaticamente o jogo
4. A otimização será aplicada transparentemente

### 4. Monitorar Métricas

- Acompanhe ping, jitter e packet loss em tempo real
- Visualize gráficos de performance
- Consulte histórico de sessões

## 📊 Jogos Suportados

- **Valorant** - Portas 7000-7009
- **League of Legends** - Portas 5000-5009
- **Counter-Strike 2** - Portas 27015-27019
- **Fortnite** - Portas 9000-9004
- **Apex Legends** - Portas 37015-37017
- **Call of Duty: Warzone** - Portas 3074, 53, 88
- **EA FC 24** - Portas 3659, 9565, 9570
- **PUBG** - Portas 7000-7002

## 🔧 Configuração Avançada

### Variáveis de Ambiente

```bash
# Backend (.env)
DATABASE_URL="postgresql://admin:admin123@localhost:5432/gaming_proxy"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="a781f79d3622180f79695c46c685d8d75c64c9aedf7a5d6986fa1637"
SMTP_HOST="smtp.gmail.com"
SMTP_USER="seu-email@gmail.com"
STRIPE_SECRET_KEY="sk_test_..."
```

### Configuração de Email

Para funcionalidade completa de verificação de email:

1. Use Gmail com senha de app, ou
2. Configure outro provedor SMTP
3. Atualize variáveis SMTP_* no .env

### Configuração do Stripe

Para pagamentos em modo de teste:

1. Crie conta no Stripe Dashboard
2. Obtenha chaves de teste
3. Configure webhooks para `/api/v1/stripe/webhook`

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
gaming-proxy/
├── packages/
│   ├── backend/          # API REST/GraphQL
│   ├── client/           # Cliente Electron + React
│   ├── shared/           # Types e utilitários
│   ├── native-agent/     # Agent C++ para captura
│   └── node-server/      # Servidor de relay
├── docker-compose.yml    # PostgreSQL + Redis
└── package.json         # Workspace root
```

### Scripts Úteis

```bash
# Desenvolvimento
npm run dev                 # Todos os serviços
npm run dev:backend        # Apenas backend
npm run dev:client         # Apenas cliente

# Build
npm run build              # Build completo
npm run build:backend      # Build backend
npm run build:client      # Build cliente

# Testes
npm run test               # Todos os testes
npm run typecheck         # Verificação TypeScript
npm run lint              # Linting
```

### Debuging

#### Backend API
- Logs: `packages/backend/logs/`
- Health: http://localhost:3000/health
- Database: http://localhost:8080 (Adminer)

#### Cliente Desktop
- DevTools: F12 no cliente
- Logs: Console do Electron

#### Native Agent
- Requer privilégios de administrador
- Logs: Console do terminal

## 🔒 Segurança

### Anti-Cheat Compliance

O sistema foi projetado para ser compatível com sistemas anti-cheat:

- **Não injeta código** no processo do jogo
- **Opera apenas em nível de rede** (redirecionamento de tráfego)
- **Usa WinDivert user-mode** para captura transparente
- **Não modifica memória** ou arquivos do jogo

### Segurança de Dados

- **Autenticação JWT** com refresh tokens
- **Senhas criptografadas** com bcrypt
- **TLS obrigatório** em produção
- **Rate limiting** em todos os endpoints
- **Logs anonimizados** por padrão

## 📈 Performance

### Benchmarks Esperados

- **Redução de ping**: 15-40ms em média
- **Redução de jitter**: 30-60%
- **Melhoria de estabilidade**: 85%+
- **Overhead**: <2ms adicional

### Monitoramento

- Métricas em tempo real via WebSocket
- Alertas automáticos para degradação
- Dashboard administrativo
- Integração Prometheus/Grafana

## 🚀 Deploy em Produção

### Infraestrutura Recomendada

```bash
# AWS/Azure/GCP
- Load Balancer (HTTPS)
- EC2/VMs para backend (Auto Scaling)
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis (Cluster)
- S3/Storage para logs e assets
- CDN para distribuição de arquivos
```

### Node Servers

Deploy de servidores relay em múltiplas regiões:

```bash
# Principais regiões
- São Paulo (BR)
- Virginia (US-East)
- California (US-West)
- Londres (EU-West)
- Singapura (APAC)
```

### CI/CD

```yaml
# .github/workflows/deploy.yml
- Build automatizado
- Testes de integração
- Deploy gradual (blue-green)
- Monitoramento pós-deploy
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Guias de Contribuição

- Siga os padrões de código TypeScript/ESLint
- Adicione testes para novas funcionalidades
- Documente APIs e mudanças importantes
- Use commits semânticos

## 📝 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

### Issues Conhecidos

1. **WinDivert não encontrado**: Baixe de https://github.com/basil00/Divert/releases
2. **Erro de permissão**: Execute como Administrador
3. **Banco não conecta**: Verifique se Docker está rodando

### Contato

- **Issues**: https://github.com/Projeto-Ping-Master/gaming-proxy/issues
- **Discord**: [Servidor da Comunidade]
- **Email**: suporte@gaming-proxy.com

### FAQ

**P: É seguro usar com jogos online?**
R: Sim, o sistema não modifica arquivos do jogo e opera apenas redirecionando tráfego de rede.

**P: Funciona com todos os jogos?**
R: Funciona com a maioria dos jogos online. Lista de jogos testados na seção \"Jogos Suportados\".

**P: Precisa ficar sempre ligado?**
R: Sim, o sistema precisa estar ativo durante as sessões de jogo para otimizar a conexão.

**P: Quanto de internet usa?**
R: O overhead é mínimo, tipicamente <5% do tráfego original devido ao encapsulamento.

---

⭐ **Se este projeto foi útil, considere dar uma estrela no GitHub!**