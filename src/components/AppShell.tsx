'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AuthModal } from '@/components/AuthModal';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';
import { useAuth } from '@/hooks/useAuth';

// Lets any page inside the shell pop the login modal (e.g. like-while-logged-out)
// without each page re-implementing the auth modal + needsAuth plumbing.
const AuthPromptContext = createContext<() => void>(() => undefined);
export const useAuthPrompt = () => useContext(AuthPromptContext);

/**
 * Shared app chrome (Phase 9). Wraps the sidebar, header (with the data-saver
 * toggle wired to the player), bottom nav, audio player, and the auth modal.
 * Detail pages render inside this instead of re-declaring the shell.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const quality = useMeloPlayer((s) => s.quality);
  const autoSaver = useMeloPlayer((s) => s.autoSaver);
  const setQuality = useMeloPlayer((s) => s.setQuality);
  const needsAuth = useMeloPlayer((s) => s.needsAuth);
  const clearNeedsAuth = useMeloPlayer((s) => s.clearNeedsAuth);
  const authInit = useAuth((s) => s.init);
  const [showAuth, setShowAuth] = useState(false);

  // Resolve the stored session once so pages gated on authReady aren't stuck.
  useEffect(() => {
    void authInit();
  }, [authInit]);

  // The player raises needsAuth when a play is attempted while logged out.
  useEffect(() => {
    if (needsAuth) {
      setShowAuth(true);
      clearNeedsAuth();
    }
  }, [needsAuth, clearNeedsAuth]);

  const openAuth = useCallback(() => setShowAuth(true), []);
  const dataSaverOn = quality === 'data_saver' || autoSaver;

  return (
    <AuthPromptContext.Provider value={openAuth}>
      <div className="flex min-h-screen bg-[#121212]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-32">
          <Header
            dataSaverEnabled={dataSaverOn}
            onToggleDataSaver={() => setQuality(dataSaverOn ? 'balanced' : 'data_saver')}
          />
          <main className="flex-1 px-6 md:px-10 py-2 max-w-7xl mx-auto w-full">{children}</main>
        </div>
        <BottomNav />
        <AudioPlayer />
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    </AuthPromptContext.Provider>
  );
}
