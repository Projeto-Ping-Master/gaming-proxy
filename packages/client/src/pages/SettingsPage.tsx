import React, { useState } from 'react';
import {
  Settings,
  Wifi,
  Shield,
  Bell,
  Monitor,
  Globe,
  Database,
  Zap,
  Save,
  RotateCcw
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('network');
  const [settings, setSettings] = useState({
    // Network settings
    multiInternet: false,
    customDNS: ['1.1.1.1', '1.0.0.1'],
    ipBlocking: [''],
    autoServerSwitch: true,
    packetLossTolerance: 2,

    // Security settings
    enableFirewall: true,
    blockSuspiciousIPs: true,
    logConnections: false,

    // Notifications
    notifyOnConnection: true,
    notifyOnDisconnection: true,
    notifyOnHighPing: true,
    pingThreshold: 100,

    // Performance
    bufferSize: 64,
    compressionLevel: 3,
    maxConnections: 50,
    enableMetrics: true,
  });

  const tabs = [
    { id: 'network', name: 'Rede', icon: Wifi },
    { id: 'security', name: 'Segurança', icon: Shield },
    { id: 'notifications', name: 'Notificações', icon: Bell },
    { id: 'performance', name: 'Performance', icon: Zap },
    { id: 'advanced', name: 'Avançado', icon: Settings },
  ];

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Save settings logic
    console.log('Saving settings:', settings);
  };

  const handleReset = () => {
    // Reset to defaults
    setSettings({
      multiInternet: false,
      customDNS: ['1.1.1.1', '1.0.0.1'],
      ipBlocking: [''],
      autoServerSwitch: true,
      packetLossTolerance: 2,
      enableFirewall: true,
      blockSuspiciousIPs: true,
      logConnections: false,
      notifyOnConnection: true,
      notifyOnDisconnection: true,
      notifyOnHighPing: true,
      pingThreshold: 100,
      bufferSize: 64,
      compressionLevel: 3,
      maxConnections: 50,
      enableMetrics: true,
    });
  };

  const renderNetworkSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Configurações de Rede</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Multi Internet</h4>
              <p className="text-sm text-gray-400">Usar múltiplas conexões simultaneamente</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.multiInternet}
                onChange={(e) => handleSettingChange('multiInternet', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Troca Automática de Servidor</h4>
              <p className="text-sm text-gray-400">Trocar para melhor servidor automaticamente</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoServerSwitch}
                onChange={(e) => handleSettingChange('autoServerSwitch', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tolerância de Packet Loss (%)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={settings.packetLossTolerance}
              onChange={(e) => handleSettingChange('packetLossTolerance', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span className="text-white font-medium">{settings.packetLossTolerance}%</span>
              <span>10%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              DNS Customizado
            </label>
            <div className="space-y-2">
              {settings.customDNS.map((dns, index) => (
                <input
                  key={index}
                  type="text"
                  value={dns}
                  onChange={(e) => {
                    const newDNS = [...settings.customDNS];
                    newDNS[index] = e.target.value;
                    handleSettingChange('customDNS', newDNS);
                  }}
                  className="input"
                  placeholder="8.8.8.8"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Configurações de Segurança</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Firewall Integrado</h4>
              <p className="text-sm text-gray-400">Proteção adicional contra ameaças</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableFirewall}
                onChange={(e) => handleSettingChange('enableFirewall', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Bloquear IPs Suspeitos</h4>
              <p className="text-sm text-gray-400">Detecção automática de IPs maliciosos</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.blockSuspiciousIPs}
                onChange={(e) => handleSettingChange('blockSuspiciousIPs', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Log de Conexões</h4>
              <p className="text-sm text-gray-400">Registrar todas as conexões para auditoria</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.logConnections}
                onChange={(e) => handleSettingChange('logConnections', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Configurações de Notificações</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Notificar ao Conectar</h4>
              <p className="text-sm text-gray-400">Alerta quando otimização for ativada</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnConnection}
                onChange={(e) => handleSettingChange('notifyOnConnection', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Notificar ao Desconectar</h4>
              <p className="text-sm text-gray-400">Alerta quando otimização for desativada</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnDisconnection}
                onChange={(e) => handleSettingChange('notifyOnDisconnection', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Alerta de Ping Alto</h4>
              <p className="text-sm text-gray-400">Notificar quando ping exceder limite</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnHighPing}
                onChange={(e) => handleSettingChange('notifyOnHighPing', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Limite de Ping para Alerta (ms)
            </label>
            <input
              type="number"
              min="50"
              max="500"
              value={settings.pingThreshold}
              onChange={(e) => handleSettingChange('pingThreshold', parseInt(e.target.value))}
              className="input w-32"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Configurações de Performance</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tamanho do Buffer (KB)
            </label>
            <input
              type="range"
              min="16"
              max="128"
              step="16"
              value={settings.bufferSize}
              onChange={(e) => handleSettingChange('bufferSize', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>16KB</span>
              <span className="text-white font-medium">{settings.bufferSize}KB</span>
              <span>128KB</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nível de Compressão
            </label>
            <input
              type="range"
              min="0"
              max="9"
              step="1"
              value={settings.compressionLevel}
              onChange={(e) => handleSettingChange('compressionLevel', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Nenhuma</span>
              <span className="text-white font-medium">Nível {settings.compressionLevel}</span>
              <span>Máxima</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Máximo de Conexões Simultâneas
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={settings.maxConnections}
              onChange={(e) => handleSettingChange('maxConnections', parseInt(e.target.value))}
              className="input w-32"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Coleta de Métricas</h4>
              <p className="text-sm text-gray-400">Ativar coleta detalhada de performance</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableMetrics}
                onChange={(e) => handleSettingChange('enableMetrics', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Configurações Avançadas</h3>

        <div className="space-y-4">
          <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-300">Atenção</h4>
                <p className="text-sm text-yellow-200">
                  Configurações avançadas podem afetar a performance e estabilidade do sistema.
                  Altere apenas se souber o que está fazendo.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center space-x-3 mb-3">
                <Database className="w-5 h-5 text-primary-400" />
                <h4 className="font-medium text-white">Cache</h4>
              </div>
              <button className="btn btn-outline w-full text-sm mb-2">
                Limpar Cache DNS
              </button>
              <button className="btn btn-outline w-full text-sm">
                Limpar Cache de Rotas
              </button>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3 mb-3">
                <Monitor className="w-5 h-5 text-primary-400" />
                <h4 className="font-medium text-white">Diagnóstico</h4>
              </div>
              <button className="btn btn-outline w-full text-sm mb-2">
                Teste de Conectividade
              </button>
              <button className="btn btn-outline w-full text-sm">
                Gerar Relatório
              </button>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3 mb-3">
                <Globe className="w-5 h-5 text-primary-400" />
                <h4 className="font-medium text-white">Proxy</h4>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Proxy HTTP (opcional)"
                  className="input text-sm"
                />
                <input
                  type="text"
                  placeholder="Porta"
                  className="input text-sm"
                />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3 mb-3">
                <Settings className="w-5 h-5 text-primary-400" />
                <h4 className="font-medium text-white">Debug</h4>
              </div>
              <button className="btn btn-outline w-full text-sm mb-2">
                Ativar Modo Debug
              </button>
              <button className="btn btn-outline w-full text-sm">
                Exportar Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-gaming font-bold text-white">Configurações</h1>
        <p className="text-gray-400 mt-2">Personalize o comportamento do Gaming Proxy</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <div className="card p-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center px-4 py-3 text-left transition-colors
                    ${activeTab === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <tab.icon className="w-5 h-5 mr-3" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card">
            {activeTab === 'network' && renderNetworkSettings()}
            {activeTab === 'security' && renderSecuritySettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'performance' && renderPerformanceSettings()}
            {activeTab === 'advanced' && renderAdvancedSettings()}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-700">
              <button
                onClick={handleReset}
                className="btn btn-outline flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar Padrões
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}