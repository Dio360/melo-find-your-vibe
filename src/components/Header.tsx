'use client';

import React, { useState } from 'react';
import { Bell, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from './AuthModal';

interface HeaderProps {
  onToggleDataSaver: () => void;
  dataSaverEnabled: boolean;
}

export function Header({ onToggleDataSaver, dataSaverEnabled }: HeaderProps) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-end gap-3 py-4 px-6 md:px-10 sticky top-0 z-20 bg-[#121212]/80 backdrop-blur-md">
      {/* Data Saver toggle pill */}
      <button
        onClick={onToggleDataSaver}
        title="Data Saver mode optimizes audio bitrate for weak connections"
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
          dataSaverEnabled
            ? 'bg-[#1DB95D] text-black shadow-lg shadow-[#1DB95D]/30'
            : 'bg-white/10 text-zinc-300 hover:text-white'
        }`}
      >
        <Zap className={`w-3.5 h-3.5 ${dataSaverEnabled ? 'fill-black' : ''}`} />
        <span>Data Saver: {dataSaverEnabled ? 'ON' : 'OFF'}</span>
      </button>

      {/* Notifications */}
      <button
        className="p-2.5 rounded-full bg-white/5 text-zinc-300 hover:text-white transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
      </button>

      {/* User Profile / Sign in */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
        {!user ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAuth(true)}
              className="hidden sm:inline px-4 py-2 rounded-full text-sm font-bold text-zinc-300 hover:text-white transition-all"
            >
              Sign up
            </button>
            <button
              onClick={() => setShowAuth(true)}
              className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform"
            >
              Log in
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title="Account"
              className="flex items-center gap-2.5"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF5722] to-[#FFC107] flex items-center justify-center shadow-md">
                <span className="text-black font-extrabold text-sm">
                  {(user.name ?? user.email ?? user.phone ?? 'M').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium text-white">
                {user.name ?? 'Listener'}
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-[#1E1E1E] border border-white/10 shadow-2xl p-1.5 z-50">
                <div className="px-3 py-2 text-xs text-zinc-400 truncate border-b border-white/10 mb-1">
                  {user.email ?? user.phone ?? 'Melo listener'}
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-white hover:bg-white/10 transition-all"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </header>
  );
}
