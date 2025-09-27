#!/bin/bash
# Setup completo para VPS Ubuntu/Debian
# Uso: bash setup_vps.sh

set -e

echo "🎮 Gaming Proxy - Setup VPS"
echo "=========================="

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt update && apt upgrade -y

# Instalar dependências
echo "🔧 Instalando dependências..."
apt install -y \
    wireguard \
    golang-go \
    python3-pip \
    net-tools \
    iperf3 \
    htop \
    vnstat \
    ufw

# Otimizações de kernel para gaming
echo "⚡ Aplicando otimizações de rede..."
cat >> /etc/sysctl.conf << 'EOF'
# Gaming Proxy Optimizations
net.core.rmem_max = 26214400
net.core.wmem_max = 26214400
net.core.rmem_default = 131072
net.core.wmem_default = 131072
net.ipv4.tcp_rmem = 4096 131072 26214400
net.ipv4.tcp_wmem = 4096 131072 26214400
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq
net.ipv4.tcp_nodelay = 1
net.ipv4.tcp_low_latency = 1
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_mtu_probing = 1
net.core.netdev_max_backlog = 5000
net.ipv4.ip_forward = 1
EOF

sysctl -p

# Configurar WireGuard
echo "🔐 Configurando WireGuard..."
cd /etc/wireguard
umask 077

# Gerar chaves
wg genkey | tee privatekey | wg pubkey > publickey

# Criar configuração
cat > wg0.conf << EOF
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = $(cat privatekey)
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Clients serão adicionados aqui
EOF

# Habilitar WireGuard
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# Configurar firewall
echo "🔥 Configurando firewall..."
ufw allow 51820/udp
ufw allow 8080/tcp
ufw allow 8443/tcp
ufw allow ssh
ufw --force enable

# Criar diretório para proxy
mkdir -p /opt/gaming-proxy
cd /opt/gaming-proxy

# Baixar e compilar proxy server
echo "🚀 Compilando proxy server..."
cat > proxy_server.go << 'EOF'
package main

import (
    "fmt"
    "io"
    "net"
    "log"
    "os"
    "time"
)

func handleConnection(client net.Conn, targetAddr string) {
    defer client.Close()

    target, err := net.Dial("tcp", targetAddr)
    if err != nil {
        log.Printf("Failed to connect to target: %v", err)
        return
    }
    defer target.Close()

    // Set TCP optimizations
    if tcpConn, ok := client.(*net.TCPConn); ok {
        tcpConn.SetNoDelay(true)
        tcpConn.SetKeepAlive(true)
        tcpConn.SetKeepAlivePeriod(30 * time.Second)
    }

    if tcpConn, ok := target.(*net.TCPConn); ok {
        tcpConn.SetNoDelay(true)
        tcpConn.SetKeepAlive(true)
        tcpConn.SetKeepAlivePeriod(30 * time.Second)
    }

    log.Printf("New connection: %s -> %s", client.RemoteAddr(), targetAddr)

    done := make(chan bool, 2)

    go func() {
        io.Copy(target, client)
        done <- true
    }()

    go func() {
        io.Copy(client, target)
        done <- true
    }()

    <-done
    log.Printf("Connection closed: %s", client.RemoteAddr())
}

func startUDPProxy(listenAddr, targetAddr string) {
    laddr, _ := net.ResolveUDPAddr("udp", listenAddr)
    taddr, _ := net.ResolveUDPAddr("udp", targetAddr)

    conn, err := net.ListenUDP("udp", laddr)
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    log.Printf("UDP Proxy listening on %s -> %s", listenAddr, targetAddr)

    clients := make(map[string]*net.UDPAddr)
    buffer := make([]byte, 1500)

    for {
        n, clientAddr, err := conn.ReadFromUDP(buffer)
        if err != nil {
            continue
        }

        clients[clientAddr.String()] = clientAddr

        targetConn, err := net.DialUDP("udp", nil, taddr)
        if err != nil {
            continue
        }

        targetConn.Write(buffer[:n])

        go func(client *net.UDPAddr) {
            respBuffer := make([]byte, 1500)
            for {
                n, err := targetConn.Read(respBuffer)
                if err != nil {
                    break
                }
                conn.WriteToUDP(respBuffer[:n], client)
            }
        }(clientAddr)
    }
}

func main() {
    listenAddr := os.Getenv("LISTEN_ADDR")
    if listenAddr == "" {
        listenAddr = ":8080"
    }

    targetAddr := os.Getenv("TARGET_ADDR")
    if targetAddr == "" {
        targetAddr = "1.1.1.1:53" // Default para teste
    }

    // Start UDP proxy in goroutine
    go startUDPProxy(listenAddr, targetAddr)

    // Start TCP proxy
    listener, err := net.Listen("tcp", listenAddr)
    if err != nil {
        log.Fatal(err)
    }
    defer listener.Close()

    log.Printf("Gaming Proxy started on %s -> %s", listenAddr, targetAddr)

    for {
        client, err := listener.Accept()
        if err != nil {
            continue
        }
        go handleConnection(client, targetAddr)
    }
}
EOF

go build -o proxy_server proxy_server.go

# Criar serviço systemd
echo "📝 Criando serviço systemd..."
cat > /etc/systemd/system/gaming-proxy.service << 'EOF'
[Unit]
Description=Gaming Proxy Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gaming-proxy
Environment="LISTEN_ADDR=:8080"
Environment="TARGET_ADDR=1.1.1.1:53"
ExecStart=/opt/gaming-proxy/proxy_server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gaming-proxy
systemctl start gaming-proxy

# Instalar monitor de performance
echo "📊 Instalando monitor de performance..."
pip3 install fastapi uvicorn psutil

cat > /opt/gaming-proxy/monitor.py << 'EOF'
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import psutil
import subprocess

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    cpu = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory().percent
    network = psutil.net_io_counters()

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Gaming Proxy Monitor</title>
        <meta http-equiv="refresh" content="5">
        <style>
            body {{ font-family: Arial; padding: 20px; background: #1a1a1a; color: white; }}
            .stat {{ background: #2a2a2a; padding: 15px; margin: 10px; border-radius: 5px; }}
            .value {{ font-size: 2em; color: #4CAF50; }}
        </style>
    </head>
    <body>
        <h1>🎮 Gaming Proxy Server Status</h1>
        <div class="stat">
            <div>CPU Usage</div>
            <div class="value">{cpu}%</div>
        </div>
        <div class="stat">
            <div>Memory Usage</div>
            <div class="value">{memory}%</div>
        </div>
        <div class="stat">
            <div>Network TX</div>
            <div class="value">{network.bytes_sent / 1024 / 1024:.2f} MB</div>
        </div>
        <div class="stat">
            <div>Network RX</div>
            <div class="value">{network.bytes_recv / 1024 / 1024:.2f} MB</div>
        </div>
    </body>
    </html>
    """
    return html

@app.get("/api/stats")
async def stats():
    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": psutil.virtual_memory().percent,
        "network": {
            "bytes_sent": psutil.net_io_counters().bytes_sent,
            "bytes_recv": psutil.net_io_counters().bytes_recv
        },
        "connections": len(psutil.net_connections())
    }

@app.get("/api/ping/{target}")
async def ping(target: str):
    try:
        result = subprocess.run(
            ["ping", "-c", "4", target],
            capture_output=True,
            text=True,
            timeout=5
        )
        lines = result.stdout.split('\n')
        for line in lines:
            if 'avg' in line:
                latency = float(line.split('/')[4])
                return {"target": target, "latency": latency, "status": "ok"}
    except:
        pass
    return {"target": target, "latency": 999, "status": "error"}
EOF

# Criar serviço para monitor
cat > /etc/systemd/system/gaming-monitor.service << 'EOF'
[Unit]
Description=Gaming Proxy Monitor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gaming-proxy
ExecStart=/usr/bin/python3 -m uvicorn monitor:app --host 0.0.0.0 --port 8081
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gaming-monitor
systemctl start gaming-monitor

# Mostrar informações finais
echo ""
echo "✅ Setup completo!"
echo "==================="
echo ""
echo "📊 Monitor Web: http://$(curl -s ifconfig.me):8081"
echo "🔐 WireGuard Public Key: $(cat /etc/wireguard/publickey)"
echo "🚀 Proxy Port: 8080"
echo "📡 WireGuard Port: 51820"
echo ""
echo "📝 Para adicionar clientes WireGuard:"
echo "   nano /etc/wireguard/wg0.conf"
echo "   systemctl restart wg-quick@wg0"
echo ""
echo "🎮 Happy Gaming!"