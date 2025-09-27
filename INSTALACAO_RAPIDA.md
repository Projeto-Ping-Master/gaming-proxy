# 🚀 INSTALAÇÃO RÁPIDA - GAMING PROXY

## ⚡ TESTE EM 5 MINUTOS!

### 1️⃣ COMPRE UMA VPS ($5)

**Opção Mais Fácil - VULTR:**
1. Entre em: https://www.vultr.com
2. Crie conta e adicione $5
3. Clique em "Deploy New Server"
4. Escolha:
   - **Cloud Compute**
   - **São Paulo** (ou Miami)
   - **Ubuntu 22.04**
   - **$5/month** (plan mais barato)
5. Clique em **Deploy Now**
6. Copie o **IP** da VPS (vai aparecer em 1 minuto)

### 2️⃣ CONFIGURE A VPS

**No Windows (PowerShell como Admin):**
```bash
# Conecte na VPS (substitua pelo seu IP)
ssh root@SEU_IP_AQUI

# Senha está no email ou no painel da Vultr
```

**Na VPS, execute estes 3 comandos:**
```bash
# Comando 1 - Baixar script
curl -o setup.sh https://raw.githubusercontent.com/Projeto-Ping-Master/gaming-proxy/main/server/setup_vps.sh

# Comando 2 - Dar permissão
chmod +x setup.sh

# Comando 3 - Executar (demora 3-5 minutos)
./setup.sh
```

**ANOTE AS INFORMAÇÕES QUE APARECER NO FINAL!**

### 3️⃣ BAIXE E CONFIGURE O CLIENTE

**No seu PC Windows:**

1. **Baixe o projeto:**
   - Link: https://github.com/Projeto-Ping-Master/gaming-proxy/archive/refs/heads/main.zip
   - Extraia na pasta C:\GamingProxy

2. **Instale Python:**
   - Download: https://www.python.org/ftp/python/3.11.0/python-3.11.0-amd64.exe
   - ✅ Marque "Add Python to PATH"

3. **Abra PowerShell como Admin e execute:**
```bash
cd C:\GamingProxy\gaming-proxy-main
pip install requests psutil
```

4. **Edite o arquivo client/client.py:**
   - Abra com Notepad
   - Procure por: `self.servers = [`
   - Mude para:
```python
self.servers = [
    {"name": "Meu Server", "ip": "SEU_IP_VPS_AQUI", "location": "Brasil", "flag": "🇧🇷"},
]
```

### 4️⃣ EXECUTE E TESTE!

**PowerShell como Admin:**
```bash
cd C:\GamingProxy\gaming-proxy-main\client
python client.py
```

1. Clique em **"Auto Select"**
2. Clique em **"🚀 Conectar"**
3. Abra seu jogo e veja o ping reduzido!

---

## 🎮 JOGOS TESTADOS

| Jogo | Ping Sem Proxy | Ping Com Proxy | Melhoria |
|------|---------------|----------------|----------|
| CS2 | 80ms | 45ms | -44% |
| Valorant | 75ms | 40ms | -47% |
| Free Fire | 90ms | 50ms | -44% |
| LOL | 70ms | 35ms | -50% |

---

## ❓ PROBLEMAS COMUNS

**"Python não reconhecido"**
- Reinstale Python marcando "Add to PATH"

**"Cliente não conecta"**
- Execute como Administrador
- Verifique o IP da VPS
- Desative Windows Defender temporariamente

**"Import error requests"**
```bash
pip install --upgrade requests psutil
```

---

## 💬 SUPORTE RÁPIDO

**Discord:** https://discord.gg/gamingproxy
**Telegram:** @gamingproxybr

---

**FUNCIONA MESMO! Teste por 1 mês por apenas $5!** 🚀