import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  Play,
  Square,
  Wifi,
  WifiOff,
  Activity,
  Clock,
  TrendingUp,
  Server as ServerIcon
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import type { Server, Game, SessionMetrics } from '@gaming-proxy/shared';

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected';
  server?: Server;
  game?: Game;
  sessionId?: string;
  startTime?: Date;
}

export default function DashboardPage() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected'
  });

  // Fetch servers
  const { data: serversData } = useQuery('servers', async () => {
    const response = await api.get<{ data: Server[] }>('/servers');
    return response.data.data;
  });

  // Fetch games
  const { data: gamesData } = useQuery('games', async () => {
    const response = await api.get<{ data: Game[] }>('/games');
    return response.data.data;
  });

  // Fetch active session
  const { data: activeSession } = useQuery('active-session', async () => {
    const response = await api.get('/session/active');
    return response.data.data;
  });

  // Mock ping data for demo
  const pingData = Array.from({ length: 20 }, (_, i) => ({
    time: `${i}s`,
    ping: Math.floor(Math.random() * 30) + 25,
    jitter: Math.floor(Math.random() * 10) + 1,
  }));

  const handleOptimize = async () => {
    if (connectionState.status === 'connected') {
      // Stop session
      try {
        setConnectionState(prev => ({ ...prev, status: 'connecting' }));
        await api.post('/session/stop', { sessionId: connectionState.sessionId });
        setConnectionState({ status: 'disconnected' });
      } catch (error) {
        console.error('Failed to stop session:', error);
        setConnectionState(prev => ({ ...prev, status: 'connected' }));
      }
    } else {
      // Start session
      try {
        setConnectionState(prev => ({ ...prev, status: 'connecting' }));

        // Get recommended server
        const serverResponse = await api.get<{ data: Server }>('/servers/recommended');
        const server = serverResponse.data.data;

        // Start session with Valorant as default
        const sessionResponse = await api.post('/session/start', {
          gameId: 'valorant',
          mode: 'auto'
        });

        const sessionData = sessionResponse.data.data;

        setConnectionState({
          status: 'connected',
          server,
          game: gamesData?.find(g => g.gameId === 'valorant'),
          sessionId: sessionData.sessionId,
          startTime: new Date()
        });
      } catch (error) {
        console.error('Failed to start session:', error);
        setConnectionState({ status: 'disconnected' });
      }
    }
  };

  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-gaming font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-2">Monitore e otimize sua conexão</p>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Connection Card */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                {connectionState.status === 'connected' ? (
                  <Wifi className="w-8 h-8 text-success-400" />
                ) : (
                  <WifiOff className="w-8 h-8 text-gray-400" />
                )}
                <div>
                  <h2 className="text-xl font-semibold text-white">Status da Conexão</h2>
                  <p className={`text-sm font-medium connection-status ${connectionState.status}`}>
                    {connectionState.status === 'connected' && 'Conectado e Otimizado'}
                    {connectionState.status === 'connecting' && 'Conectando...'}
                    {connectionState.status === 'disconnected' && 'Desconectado'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleOptimize}
                disabled={connectionState.status === 'connecting'}
                className={`
                  btn flex items-center space-x-2 px-6 py-3
                  ${connectionState.status === 'connected'
                    ? 'btn-danger'
                    : 'btn-success'
                  }
                `}
              >
                {connectionState.status === 'connected' ? (
                  <>
                    <Square className="w-5 h-5" />
                    <span>Parar Otimização</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Otimizar Conexão</span>
                  </>
                )}
              </button>
            </div>

            {connectionState.status === 'connected' && connectionState.server && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-success-400">42ms</p>
                  <p className="text-sm text-gray-400">Ping Atual</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-400">{connectionState.server.region}</p>
                  <p className="text-sm text-gray-400">Servidor</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning-400">2.3ms</p>
                  <p className="text-sm text-gray-400">Jitter</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-300">
                    {connectionState.startTime && formatDuration(connectionState.startTime)}
                  </p>
                  <p className="text-sm text-gray-400">Duração</p>
                </div>
              </div>
            )}

            {connectionState.status === 'disconnected' && (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">
                  Clique em "Otimizar Conexão" para começar
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-success-400" />
                    <span className="text-gray-300">Redução de Ping</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-primary-400" />
                    <span className="text-gray-300">Estabilidade</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ServerIcon className="w-4 h-4 text-warning-400" />
                    <span className="text-gray-300">Multi-Rota</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Servidores Online</p>
                <p className="text-xl font-bold text-white">
                  {serversData?.filter(s => s.status === 'online').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Tempo Total</p>
                <p className="text-xl font-bold text-white">24h 32m</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Melhoria Média</p>
                <p className="text-xl font-bold text-white">-28ms</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ping Chart */}
      {connectionState.status === 'connected' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Latência em Tempo Real</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ping"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Games */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Jogos Recentes</h3>
        <div className="space-y-3">
          {gamesData?.slice(0, 5).map((game) => (
            <div key={game.gameId} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {game.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-white">{game.name}</p>
                  <p className="text-sm text-gray-400">Última sessão: Ontem</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-success-400">-15ms</p>
                <p className="text-xs text-gray-400">Melhoria</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}