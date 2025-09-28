import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Gamepad2,
  Settings,
  LogOut,
  Minimize2,
  Maximize2,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Servidores', href: '/servers', icon: Server },
  { name: 'Jogos', href: '/games', icon: Gamepad2 },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleWindowControls = async (action: 'minimize' | 'maximize' | 'close') => {
    try {
      switch (action) {
        case 'minimize':
          await window.electronAPI.window.minimize();
          break;
        case 'maximize':
          await window.electronAPI.window.maximize();
          break;
        case 'close':
          await window.electronAPI.window.close();
          break;
      }
    } catch (error) {
      console.error('Window control error:', error);
    }
  };

  return (
    <div className="h-screen flex bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-lg font-gaming font-bold text-white">GP</span>
            </div>
            <div>
              <h1 className="text-lg font-gaming font-bold text-white">Gaming Proxy</h1>
              <p className="text-xs text-gray-400">v1.0.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-400">Usuário Ativo</p>
            </div>
            <button
              onClick={logout}
              className="ml-3 p-2 text-gray-400 hover:text-white transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Title bar (Windows) */}
        <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center justify-end px-2 drag-region">
          <div className="flex space-x-1">
            <button
              onClick={() => handleWindowControls('minimize')}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded transition-colors"
            >
              <Minimize2 className="w-3 h-3 text-gray-400" />
            </button>
            <button
              onClick={() => handleWindowControls('maximize')}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded transition-colors"
            >
              <Maximize2 className="w-3 h-3 text-gray-400" />
            </button>
            <button
              onClick={() => handleWindowControls('close')}
              className="w-6 h-6 flex items-center justify-center hover:bg-red-600 rounded transition-colors"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}