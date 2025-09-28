# Gaming Proxy - Setup Script para Windows
# Este script automatiza a instalação inicial do Gaming Proxy

param(
    [switch]$SkipDocker,
    [switch]$SkipNative,
    [switch]$Production
)

Write-Host "🎮 Gaming Proxy - Setup Automático" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Verificar se está executando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Este script requer privilégios de Administrador" -ForegroundColor Yellow
    Write-Host "   Execute o PowerShell como Administrador e tente novamente" -ForegroundColor Yellow
    exit 1
}

# Função para verificar se um comando existe
function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Verificar pré-requisitos
Write-Host "🔍 Verificando pré-requisitos..." -ForegroundColor Cyan

# Node.js
if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
    Write-Host "   Baixe em: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

$nodeVersion = node --version
Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green

# npm
if (-not (Test-Command "npm")) {
    Write-Host "❌ npm não encontrado" -ForegroundColor Red
    exit 1
}

# Git
if (-not (Test-Command "git")) {
    Write-Host "❌ Git não encontrado" -ForegroundColor Red
    Write-Host "   Baixe em: https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Git encontrado" -ForegroundColor Green

# Docker (opcional)
if (-not $SkipDocker) {
    if (-not (Test-Command "docker")) {
        Write-Host "⚠️  Docker não encontrado" -ForegroundColor Yellow
        Write-Host "   Baixe em: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        Write-Host "   Ou use -SkipDocker para pular verificação" -ForegroundColor Yellow
        $SkipDocker = $true
    } else {
        Write-Host "✅ Docker encontrado" -ForegroundColor Green
    }
}

# Instalar dependências
Write-Host "`n📦 Instalando dependências..." -ForegroundColor Cyan

try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install falhou" }
    Write-Host "✅ Dependências instaladas" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao instalar dependências: $_" -ForegroundColor Red
    exit 1
}

# Configurar ambiente
Write-Host "`n⚙️  Configurando ambiente..." -ForegroundColor Cyan

$envFile = "packages\backend\.env"
$envExample = "packages\backend\.env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Host "✅ Arquivo .env criado" -ForegroundColor Green
        Write-Host "   📝 Edite $envFile com suas configurações" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Arquivo .env.example não encontrado" -ForegroundColor Red
    }
} else {
    Write-Host "✅ Arquivo .env já existe" -ForegroundColor Green
}

# Configurar Docker
if (-not $SkipDocker) {
    Write-Host "`n🐳 Configurando Docker..." -ForegroundColor Cyan

    try {
        docker-compose up -d
        if ($LASTEXITCODE -ne 0) { throw "docker-compose falhou" }

        Write-Host "✅ Containers Docker iniciados" -ForegroundColor Green
        Write-Host "   ⏳ Aguardando serviços ficarem prontos..." -ForegroundColor Yellow

        # Aguardar PostgreSQL ficar pronto
        $timeout = 60
        $elapsed = 0

        while ($elapsed -lt $timeout) {
            try {
                docker exec gaming-proxy-postgres pg_isready -U admin -d gaming_proxy -q
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ PostgreSQL pronto" -ForegroundColor Green
                    break
                }
            } catch {
                # Ignorar erro e continuar tentando
            }

            Start-Sleep 5
            $elapsed += 5
        }

        if ($elapsed -ge $timeout) {
            Write-Host "⚠️  Timeout aguardando PostgreSQL" -ForegroundColor Yellow
        }

    } catch {
        Write-Host "❌ Erro ao configurar Docker: $_" -ForegroundColor Red
        Write-Host "   Execute 'docker-compose up -d' manualmente" -ForegroundColor Yellow
    }
}

# Configurar banco de dados
if (-not $SkipDocker) {
    Write-Host "`n🗄️  Configurando banco de dados..." -ForegroundColor Cyan

    try {
        Set-Location "packages\backend"

        # Gerar cliente Prisma
        npm run db:generate
        if ($LASTEXITCODE -ne 0) { throw "db:generate falhou" }
        Write-Host "✅ Cliente Prisma gerado" -ForegroundColor Green

        # Executar migrações
        npm run db:migrate
        if ($LASTEXITCODE -ne 0) { throw "db:migrate falhou" }
        Write-Host "✅ Migrações executadas" -ForegroundColor Green

        # Popular dados
        npm run db:seed
        if ($LASTEXITCODE -ne 0) { throw "db:seed falhou" }
        Write-Host "✅ Dados iniciais inseridos" -ForegroundColor Green

        Set-Location "..\..\"

    } catch {
        Write-Host "❌ Erro ao configurar banco: $_" -ForegroundColor Red
        Set-Location "..\..\"
    }
}

# Compilar agent nativo (opcional)
if (-not $SkipNative) {
    Write-Host "`n🔧 Configurando agent nativo..." -ForegroundColor Cyan

    $winDivertPath = "packages\native-agent\lib\WinDivert"

    if (-not (Test-Path $winDivertPath)) {
        Write-Host "⚠️  WinDivert não encontrado em $winDivertPath" -ForegroundColor Yellow
        Write-Host "   1. Baixe de: https://github.com/basil00/Divert/releases" -ForegroundColor Yellow
        Write-Host "   2. Extraia para: $winDivertPath" -ForegroundColor Yellow
        Write-Host "   3. Execute este script novamente" -ForegroundColor Yellow
    } else {
        try {
            Set-Location "packages\native-agent"
            npm run build
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Agent nativo compilado" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Falha na compilação do agent (não crítico)" -ForegroundColor Yellow
            }
            Set-Location "..\..\"
        } catch {
            Write-Host "⚠️  Erro ao compilar agent: $_" -ForegroundColor Yellow
            Set-Location "..\..\"
        }
    }
}

# Verificar instalação
Write-Host "`n🔍 Verificando instalação..." -ForegroundColor Cyan

# Testar backend (se Docker estiver rodando)
if (-not $SkipDocker) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 10
        if ($response.status -eq "ok") {
            Write-Host "✅ Backend API funcionando" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Backend API não está respondendo" -ForegroundColor Yellow
        Write-Host "   Execute 'npm run dev' em packages/backend" -ForegroundColor Yellow
    }
}

# Resumo final
Write-Host "`n🎉 Setup concluído!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green

Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Configure o arquivo .env em packages/backend" -ForegroundColor White
Write-Host "   - JWT_SECRET e JWT_REFRESH_SECRET" -ForegroundColor Gray
Write-Host "   - Configurações SMTP para email" -ForegroundColor Gray
Write-Host "   - Chaves do Stripe para pagamentos" -ForegroundColor Gray

Write-Host "`n2. Inicie os serviços:" -ForegroundColor White
Write-Host "   # Terminal 1 - Backend" -ForegroundColor Gray
Write-Host "   cd packages\backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "" -ForegroundColor Gray
Write-Host "   # Terminal 2 - Cliente" -ForegroundColor Gray
Write-Host "   cd packages\client" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray

if (-not $SkipDocker) {
    Write-Host "`n3. Acesse os serviços:" -ForegroundColor White
    Write-Host "   - Cliente Desktop: Abrirá automaticamente" -ForegroundColor Gray
    Write-Host "   - API Health: http://localhost:3000/health" -ForegroundColor Gray
    Write-Host "   - Adminer DB: http://localhost:8080" -ForegroundColor Gray
    Write-Host "     Usuário: admin, Senha: admin123" -ForegroundColor Gray
}

Write-Host "`n📚 Documentação completa: README.md e INSTALL.md" -ForegroundColor Cyan
Write-Host "🐛 Problemas? https://github.com/Projeto-Ping-Master/gaming-proxy/issues" -ForegroundColor Cyan

Write-Host "`n✨ Gaming Proxy está pronto para uso!" -ForegroundColor Green