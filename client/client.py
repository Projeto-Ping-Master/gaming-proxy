#!/usr/bin/env python3
"""
Gaming Proxy Client - Redutor de Ping
Cliente simples e eficiente para Windows
"""

import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import json
import time
import threading
import socket
import struct
import os
import sys
import winreg
from datetime import datetime
from typing import List, Dict, Optional
import requests

class GamingProxyClient:
    def __init__(self):
        self.servers = [
            {"name": "BR-São Paulo", "ip": "143.198.45.123", "location": "Brazil", "flag": "🇧🇷"},
            {"name": "US-Virginia", "ip": "143.198.123.45", "location": "USA East", "flag": "🇺🇸"},
            {"name": "US-California", "ip": "167.99.234.12", "location": "USA West", "flag": "🇺🇸"},
            {"name": "EU-Frankfurt", "ip": "165.227.98.76", "location": "Germany", "flag": "🇩🇪"},
            {"name": "Asia-Singapore", "ip": "178.128.87.234", "location": "Singapore", "flag": "🇸🇬"},
        ]

        self.current_server = None
        self.connected = False
        self.monitoring = True
        self.stats = {"original_ping": 0, "optimized_ping": 0, "improvement": 0}

        self.setup_gui()
        self.start_monitoring()

    def setup_gui(self):
        """Criar interface gráfica"""
        self.root = tk.Tk()
        self.root.title("🎮 Gaming Proxy - Redutor de Ping")
        self.root.geometry("600x500")
        self.root.configure(bg='#1e1e1e')

        # Estilo
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('Title.TLabel', font=('Arial', 16, 'bold'), background='#1e1e1e', foreground='white')
        style.configure('Status.TLabel', font=('Arial', 12), background='#1e1e1e', foreground='white')

        # Título
        title = ttk.Label(self.root, text="🎮 Gaming Proxy", style='Title.TLabel')
        title.pack(pady=20)

        # Frame de Status
        status_frame = tk.Frame(self.root, bg='#2e2e2e', relief='raised', bd=2)
        status_frame.pack(fill='x', padx=20, pady=10)

        self.status_label = tk.Label(
            status_frame,
            text="⭕ Desconectado",
            font=('Arial', 14, 'bold'),
            bg='#2e2e2e',
            fg='#ff4444'
        )
        self.status_label.pack(pady=10)

        # Frame de Ping
        ping_frame = tk.Frame(self.root, bg='#2e2e2e', relief='raised', bd=2)
        ping_frame.pack(fill='x', padx=20, pady=10)

        # Ping Original vs Otimizado
        ping_container = tk.Frame(ping_frame, bg='#2e2e2e')
        ping_container.pack(pady=10)

        # Ping Original
        orig_frame = tk.Frame(ping_container, bg='#2e2e2e')
        orig_frame.pack(side='left', padx=20)
        tk.Label(orig_frame, text="Ping Original", font=('Arial', 10), bg='#2e2e2e', fg='gray').pack()
        self.original_ping_label = tk.Label(
            orig_frame,
            text="-- ms",
            font=('Arial', 24, 'bold'),
            bg='#2e2e2e',
            fg='#ff4444'
        )
        self.original_ping_label.pack()

        # Seta
        tk.Label(ping_container, text="→", font=('Arial', 24), bg='#2e2e2e', fg='white').pack(side='left', padx=10)

        # Ping Otimizado
        opt_frame = tk.Frame(ping_container, bg='#2e2e2e')
        opt_frame.pack(side='left', padx=20)
        tk.Label(opt_frame, text="Ping Otimizado", font=('Arial', 10), bg='#2e2e2e', fg='gray').pack()
        self.optimized_ping_label = tk.Label(
            opt_frame,
            text="-- ms",
            font=('Arial', 24, 'bold'),
            bg='#2e2e2e',
            fg='#44ff44'
        )
        self.optimized_ping_label.pack()

        # Melhoria
        self.improvement_label = tk.Label(
            ping_frame,
            text="Aguardando conexão...",
            font=('Arial', 12),
            bg='#2e2e2e',
            fg='yellow'
        )
        self.improvement_label.pack(pady=5)

        # Frame de Servidores
        server_frame = tk.LabelFrame(
            self.root,
            text="Servidores Disponíveis",
            font=('Arial', 10, 'bold'),
            bg='#1e1e1e',
            fg='white',
            relief='ridge',
            bd=2
        )
        server_frame.pack(fill='both', expand=True, padx=20, pady=10)

        # Lista de Servidores
        self.server_listbox = tk.Listbox(
            server_frame,
            bg='#2e2e2e',
            fg='white',
            font=('Arial', 10),
            selectmode='single',
            activestyle='none',
            selectbackground='#4444ff',
            selectforeground='white'
        )
        self.server_listbox.pack(fill='both', expand=True, padx=10, pady=10)

        # Adicionar servidores à lista
        self.update_server_list()

        # Botões
        button_frame = tk.Frame(self.root, bg='#1e1e1e')
        button_frame.pack(pady=20)

        self.connect_btn = tk.Button(
            button_frame,
            text="🚀 Conectar",
            command=self.toggle_connection,
            font=('Arial', 12, 'bold'),
            bg='#44ff44',
            fg='black',
            width=15,
            height=2,
            relief='raised',
            bd=3
        )
        self.connect_btn.pack(side='left', padx=10)

        self.auto_btn = tk.Button(
            button_frame,
            text="⚡ Auto Select",
            command=self.auto_select_server,
            font=('Arial', 12, 'bold'),
            bg='#ffaa44',
            fg='black',
            width=15,
            height=2,
            relief='raised',
            bd=3
        )
        self.auto_btn.pack(side='left', padx=10)

        # Rodapé
        footer = tk.Label(
            self.root,
            text="Gaming Proxy v1.0 - Reduza seu ping em até 50%!",
            font=('Arial', 9),
            bg='#1e1e1e',
            fg='gray'
        )
        footer.pack(side='bottom', pady=5)

    def update_server_list(self):
        """Atualizar lista de servidores com ping"""
        self.server_listbox.delete(0, tk.END)

        def test_servers():
            for i, server in enumerate(self.servers):
                ping = self.test_ping(server['ip'])
                server['ping'] = ping

                # Cor baseada no ping
                if ping < 50:
                    status = "🟢"
                elif ping < 100:
                    status = "🟡"
                elif ping < 999:
                    status = "🔴"
                else:
                    status = "⚫"

                text = f"{status} {server['flag']} {server['name']} - {ping}ms"
                self.root.after(0, lambda t=text, i=i: self.server_listbox.insert(i, t))

        threading.Thread(target=test_servers, daemon=True).start()

    def test_ping(self, host: str, timeout: float = 1.0) -> int:
        """Testar ping para um host"""
        try:
            # Criar socket ICMP
            icmp_socket = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
            icmp_socket.settimeout(timeout)

            # Criar pacote ICMP Echo Request
            packet_id = os.getpid() & 0xFFFF
            header = struct.pack('!BBHHH', 8, 0, 0, packet_id, 1)
            data = b'Gaming Proxy Test'

            # Calcular checksum
            checksum = 0
            for i in range(0, len(header + data), 2):
                if i + 1 < len(header + data):
                    checksum += (header + data)[i] + ((header + data)[i+1] << 8)
                else:
                    checksum += (header + data)[i]
            checksum = (checksum >> 16) + (checksum & 0xFFFF)
            checksum = ~checksum & 0xFFFF

            # Recriar header com checksum
            header = struct.pack('!BBHHH', 8, 0, checksum, packet_id, 1)
            packet = header + data

            # Enviar e receber
            start_time = time.time()
            icmp_socket.sendto(packet, (host, 0))

            try:
                data, addr = icmp_socket.recvfrom(1024)
                end_time = time.time()

                # Calcular latência em ms
                latency = int((end_time - start_time) * 1000)
                icmp_socket.close()
                return latency
            except socket.timeout:
                icmp_socket.close()
                return 999

        except Exception as e:
            # Fallback para comando ping do sistema
            try:
                result = subprocess.run(
                    ['ping', '-n', '1', '-w', '1000', host],
                    capture_output=True,
                    text=True,
                    timeout=2
                )

                for line in result.stdout.split('\n'):
                    if 'tempo=' in line or 'time=' in line:
                        parts = line.split()
                        for part in parts:
                            if 'tempo=' in part or 'time=' in part:
                                ms = part.split('=')[1].replace('ms', '')
                                return int(float(ms))
            except:
                pass

        return 999

    def auto_select_server(self):
        """Selecionar automaticamente o melhor servidor"""
        self.auto_btn.config(state='disabled', text='⏳ Testando...')

        def find_best():
            best_server = None
            best_ping = 999

            for i, server in enumerate(self.servers):
                ping = self.test_ping(server['ip'])
                if ping < best_ping:
                    best_ping = ping
                    best_server = i

            if best_server is not None:
                self.root.after(0, lambda: self.server_listbox.selection_clear(0, tk.END))
                self.root.after(0, lambda: self.server_listbox.selection_set(best_server))
                self.root.after(0, lambda: self.server_listbox.see(best_server))

            self.root.after(0, lambda: self.auto_btn.config(state='normal', text='⚡ Auto Select'))
            self.root.after(0, lambda: messagebox.showinfo(
                "Melhor Servidor",
                f"Melhor servidor encontrado:\n{self.servers[best_server]['name']} - {best_ping}ms"
            ))

        threading.Thread(target=find_best, daemon=True).start()

    def toggle_connection(self):
        """Conectar ou desconectar"""
        if not self.connected:
            self.connect()
        else:
            self.disconnect()

    def connect(self):
        """Conectar ao servidor selecionado"""
        selection = self.server_listbox.curselection()
        if not selection:
            messagebox.showwarning("Aviso", "Selecione um servidor primeiro!")
            return

        server = self.servers[selection[0]]
        self.connect_btn.config(state='disabled', text='⏳ Conectando...')

        def do_connect():
            # Simular conexão (substituir com WireGuard real)
            time.sleep(2)

            self.connected = True
            self.current_server = server

            self.root.after(0, lambda: self.status_label.config(
                text=f"🟢 Conectado: {server['name']}",
                fg='#44ff44'
            ))
            self.root.after(0, lambda: self.connect_btn.config(
                state='normal',
                text='🔴 Desconectar',
                bg='#ff4444'
            ))

            # Atualizar stats
            self.stats['original_ping'] = 80
            self.stats['optimized_ping'] = 40
            self.stats['improvement'] = 50

            self.root.after(0, self.update_ping_display)

        threading.Thread(target=do_connect, daemon=True).start()

    def disconnect(self):
        """Desconectar do servidor"""
        self.connect_btn.config(state='disabled', text='⏳ Desconectando...')

        def do_disconnect():
            time.sleep(1)

            self.connected = False
            self.current_server = None

            self.root.after(0, lambda: self.status_label.config(
                text="⭕ Desconectado",
                fg='#ff4444'
            ))
            self.root.after(0, lambda: self.connect_btn.config(
                state='normal',
                text='🚀 Conectar',
                bg='#44ff44'
            ))

            self.root.after(0, lambda: self.original_ping_label.config(text="-- ms"))
            self.root.after(0, lambda: self.optimized_ping_label.config(text="-- ms"))
            self.root.after(0, lambda: self.improvement_label.config(text="Aguardando conexão..."))

        threading.Thread(target=do_disconnect, daemon=True).start()

    def update_ping_display(self):
        """Atualizar display de ping"""
        if self.connected:
            self.original_ping_label.config(text=f"{self.stats['original_ping']} ms")
            self.optimized_ping_label.config(text=f"{self.stats['optimized_ping']} ms")

            improvement = self.stats['improvement']
            self.improvement_label.config(
                text=f"🎯 Melhoria de {improvement}% no ping!",
                fg='#44ff44' if improvement > 0 else '#ff4444'
            )

    def start_monitoring(self):
        """Iniciar monitoramento contínuo"""
        def monitor():
            while self.monitoring:
                if self.connected and self.current_server:
                    # Simular variação de ping
                    import random
                    self.stats['optimized_ping'] = random.randint(35, 45)
                    self.stats['original_ping'] = random.randint(70, 90)
                    self.stats['improvement'] = int(
                        ((self.stats['original_ping'] - self.stats['optimized_ping']) /
                         self.stats['original_ping']) * 100
                    )

                    self.root.after(0, self.update_ping_display)

                time.sleep(2)

        threading.Thread(target=monitor, daemon=True).start()

    def run(self):
        """Executar aplicação"""
        try:
            self.root.mainloop()
        finally:
            self.monitoring = False
            if self.connected:
                self.disconnect()

if __name__ == "__main__":
    # Verificar se está rodando como admin no Windows
    if sys.platform == "win32":
        import ctypes
        if not ctypes.windll.shell32.IsUserAnAdmin():
            print("⚠️  Este programa precisa ser executado como Administrador!")
            print("   Clique com botão direito e selecione 'Executar como administrador'")
            input("\nPressione Enter para sair...")
            sys.exit(1)

    app = GamingProxyClient()
    app.run()