import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-2xl font-gaming font-bold text-white">GP</span>
          </div>
        </div>

        <div className="flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>

        <h2 className="text-xl font-gaming text-white mb-2">Gaming Proxy</h2>
        <p className="text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}