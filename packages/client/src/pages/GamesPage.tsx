import React from 'react';
import { useQuery } from 'react-query';
import { Gamepad2, Play, Settings, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import type { Game } from '@gaming-proxy/shared';

export default function GamesPage() {
  const { data: games, isLoading, error } = useQuery('games', async () => {
    const response = await api.get<{ data: Game[] }>('/games');
    return response.data.data;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-gaming font-bold text-white">Jogos</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-16 bg-gray-700 rounded mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-gaming font-bold text-white">Jogos</h1>
        <div className="card text-center">
          <p className="text-red-400">Erro ao carregar jogos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-gaming font-bold text-white">Jogos</h1>
          <p className="text-gray-400 mt-2">
            {games?.length} jogos suportados
          </p>
        </div>
        <button className="btn btn-outline">
          <Settings className="w-4 h-4 mr-2" />
          Configurar Detecção
        </button>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games?.map((game) => (
          <div key={game.gameId} className="card hover:border-primary-500 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{game.name}</h3>
                  <p className="text-sm text-gray-400">{game.gameId}</p>
                </div>
              </div>
              <span className="status-indicator status-online">
                Suportado
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Processos Detectados</p>
                <div className="flex flex-wrap gap-1">
                  {game.processKeywords.slice(0, 2).map((keyword, index) => (
                    <span key={index} className="text-xs bg-gray-700 px-2 py-1 rounded">
                      {keyword}
                    </span>
                  ))}
                  {game.processKeywords.length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{game.processKeywords.length - 2} mais
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Portas Padrão</p>
                <div className="flex flex-wrap gap-1">
                  {game.defaultPorts.slice(0, 3).map((port, index) => (
                    <span key={index} className="text-xs bg-gray-700 px-2 py-1 rounded">
                      {port}
                    </span>
                  ))}
                  {game.defaultPorts.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{game.defaultPorts.length - 3} mais
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-success-400">-25ms</p>
                  <p className="text-xs text-gray-400">Redução Média</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-primary-400">98%</p>
                  <p className="text-xs text-gray-400">Taxa de Sucesso</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button className="btn btn-primary w-full text-sm">
                <Play className="w-4 h-4 mr-2" />
                Otimizar Agora
              </button>
              <button className="btn btn-outline w-full text-sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Ver Estatísticas
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {(!games || games.length === 0) && (
        <div className="card text-center py-12">
          <Gamepad2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Nenhum jogo encontrado
          </h3>
          <p className="text-gray-400">
            Não há jogos suportados disponíveis no momento.
          </p>
        </div>
      )}

      {/* Game Detection Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Como Funciona a Detecção</h3>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
              1
            </div>
            <div>
              <h4 className="font-medium text-white">Detecção Automática</h4>
              <p className="text-sm text-gray-400">
                O sistema monitora processos em execução e detecta automaticamente quando um jogo suportado é iniciado.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
              2
            </div>
            <div>
              <h4 className="font-medium text-white">Configuração de Rede</h4>
              <p className="text-sm text-gray-400">
                Identifica as portas utilizadas pelo jogo e configura o redirecionamento de tráfego automaticamente.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
              3
            </div>
            <div>
              <h4 className="font-medium text-white">Otimização Transparente</h4>
              <p className="text-sm text-gray-400">
                O tráfego é redirecionado através dos nossos servidores otimizados sem interferir no funcionamento do jogo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}