'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'melo-install-dismissed';

/**
 * Progressive Web App support:
 *  - Registers the service worker (production only — dev caching fights HMR).
 *  - Shows an install chip when the browser fires `beforeinstallprompt`
 *    (Android/Chrome/Edge), with the iOS Share → Add to Home Screen hint
 *    on Safari, per the Next.js PWA guide. Hidden once installed or
 *    dismissed; never blocks the UI.
 */
export function PwaRegistrar() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !('MSStream' in window) &&
        !window.matchMedia('(display-mode: standalone)').matches,
    );
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {
          /* offline support is a progressive enhancement — never break the app */
        });
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallEvent(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  if (installed || dismissed || (!installEvent && !isIOS)) return null;

  return (
    <div className="fixed right-4 bottom-28 md:bottom-28 z-50 max-w-[16rem] rounded-2xl border border-white/10 bg-[#1E1E1E] p-3 shadow-2xl">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white">Install MELO</p>
          <p className="mt-0.5 text-[0.7rem] leading-snug text-zinc-400">
            {installEvent
              ? 'Add MELO to your home screen for an app-like experience.'
              : 'Tap Share, then “Add to Home Screen”.'}
          </p>
          {installEvent && (
            <button
              onClick={install}
              className="mt-2 flex items-center gap-1.5 rounded-full bg-[#1DB95D] px-3 py-1.5 text-[0.7rem] font-bold text-black transition-transform hover:scale-105"
            >
              <Download className="w-3 h-3" />
              Install
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-full p-1 text-zinc-500 transition-colors hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
