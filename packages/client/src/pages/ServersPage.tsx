import React from 'react';
import { useQuery } from 'react-query';
import { MapPin, Activity, Users, Wifi } from 'lucide-react';
import { api } from '../lib/api';
import type { Server } from '@gaming-proxy/shared';

export default function ServersPage() {
  const { data: servers, isLoading, error } = useQuery('servers', async () => {
    const response = await api.get<{ data: Server[] }>('/servers');
    return response.data.data;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-success-400 bg-success-100';
      case 'offline':
        return 'text-danger-400 bg-danger-100';
      case 'maintenance':
        return 'text-warning-400 bg-warning-100';
      default:
        return 'text-gray-400 bg-gray-100';
    }
  };

  const getPingColor = (ping: number) => {
    if (ping < 50) return 'ping-excellent';
    if (ping < 100) return 'ping-good';
    return 'ping-poor';
  };

  const getLoadColor = (load: number) => {
    if (load < 50) return 'text-success-400';
    if (load < 80) return 'text-warning-400';
    return 'text-danger-400';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-gaming font-bold text-white">Servidores</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-gaming font-bold text-white">Servidores</h1>
        <div className="card text-center">
          <p className="text-red-400">Erro ao carregar servidores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-gaming font-bold text-white">Servidores</h1>
          <p className="text-gray-400 mt-2">
            {servers?.filter(s => s.status === 'online').length} de {servers?.length} servidores online
          </p>
        </div>
        <button className="btn btn-outline">
          <Activity className="w-4 h-4 mr-2" />
          Teste de Velocidade
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Online</p>
              <p className="text-xl font-bold text-white">
                {servers?.filter(s => s.status === 'online').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Manutenção</p>
              <p className="text-xl font-bold text-white">
                {servers?.filter(s => s.status === 'maintenance').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Capacidade Total</p>
              <p className="text-xl font-bold text-white">
                {servers?.reduce((sum, s) => sum + s.capacity, 0) || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Regiões</p>
              <p className="text-xl font-bold text-white">
                {new Set(servers?.map(s => s.region)).size || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers?.map((server) => (
          <div key={server.id} className="card hover:border-primary-500 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{server.region}</h3>
                  <p className="text-sm text-gray-400">{server.ip}</p>
                </div>
              </div>
              <span className={`status-indicator ${getStatusColor(server.status)}`}>
                {server.status === 'online' && 'Online'}
                {server.status === 'offline' && 'Offline'}
                {server.status === 'maintenance' && 'Manutenção'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Ping Estimado</p>
                <p className={`text-lg font-bold ${getPingColor(server.pingEstimate || 0)}`}>
                  {server.pingEstimate || '--'}ms
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Carga</p>
                <p className={`text-lg font-bold ${getLoadColor(server.load || 0)}`}>
                  {server.load || 0}%
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Capacidade</span>
                <span className="text-white">{server.capacity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Peso</span>
                <span className="text-white">{server.weight}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <button className="btn btn-outline w-full text-sm">
                Conectar a este Servidor
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {(!servers || servers.length === 0) && (
        <div className="card text-center py-12">
          <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Nenhum servidor encontrado
          </h3>
          <p className="text-gray-400">
            Não há servidores disponíveis no momento.
          </p>
        </div>
      )}
    </div>
  );
}