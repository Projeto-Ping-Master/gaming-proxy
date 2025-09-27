#!/bin/bash
# Deploy automático para múltiplas VPS
# Uso: bash deploy.sh

# Configuração dos servidores
SERVERS=(
    "root@vps-brasil.com"
    "root@vps-usa-east.com"
    "root@vps-usa-west.com"
    "root@vps-europe.com"
    "root@vps-asia.com"
)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Gaming Proxy - Deploy Automático"
echo "===================================="
echo ""

# Verificar se setup_vps.sh existe
if [ ! -f "setup_vps.sh" ]; then
    echo -e "${RED}❌ Erro: setup_vps.sh não encontrado!${NC}"
    exit 1
fi

# Deploy em paralelo
deploy_server() {
    local server=$1
    echo -e "${YELLOW}📦 Deploying to $server...${NC}"

    # Copiar script de setup
    scp -o StrictHostKeyChecking=no setup_vps.sh $server:/tmp/ 2>/dev/null

    # Executar setup
    ssh -o StrictHostKeyChecking=no $server "bash /tmp/setup_vps.sh" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $server - Deploy completo!${NC}"

        # Pegar informações do servidor
        PUBLIC_IP=$(ssh -o StrictHostKeyChecking=no $server "curl -s ifconfig.me" 2>/dev/null)
        WG_KEY=$(ssh -o StrictHostKeyChecking=no $server "cat /etc/wireguard/publickey" 2>/dev/null)

        echo "   📍 IP: $PUBLIC_IP"
        echo "   🔐 WireGuard Key: $WG_KEY"
        echo ""
    else
        echo -e "${RED}❌ $server - Deploy falhou!${NC}"
    fi
}

# Deploy paralelo com limite de 3 conexões simultâneas
export -f deploy_server
export RED GREEN YELLOW NC

echo "$SERVERS" | tr ' ' '\n' | xargs -P 3 -I {} bash -c 'deploy_server "$@"' _ {}

echo ""
echo "🎯 Deploy completo!"
echo ""
echo "📊 Próximos passos:"
echo "   1. Acesse o monitor: http://<ip-vps>:8081"
echo "   2. Configure os IPs no cliente"
echo "   3. Teste a conexão"
echo ""