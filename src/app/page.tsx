'use client';

import React, { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { VibePill, VibeItem } from '@/components/VibePill';
import { AiPromptBar } from '@/components/AiPromptBar';
import { TrackCard, TrackData } from '@/components/TrackCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AuthModal } from '@/components/AuthModal';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';

// Vibe taxonomy — mirrors GET /api/v1/vibes
const fallbackVibes: VibeItem[] = [
  { id: 'v1', name: 'Naija Chill', category: 'african', colorHex: '#00E5FF' },
  { id: 'v2', name: 'Lagos Night Drive', category: 'context', colorHex: '#FF5722' },
  { id: 'v3', name: 'Afrobeat Energy', category: 'mood', colorHex: '#FFC107' },
  { id: 'v4', name: 'Late Night Study', category: 'activity', colorHex: '#1DB95D' },
];

const GLOW = ['#1DB95D', '#FF5722', '#E8DCC8', '#00E5FF', '#FF9800'];

function fmtDuration(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Offline-safe cover art: gradient tile with the artist initial (no external images).
function coverFor(id: string, artist: string, color: string): string {
  const initial = (artist.charAt(0) || 'M').toUpperCase();
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${color}' stop-opacity='0.85'/>` +
    `<stop offset='1' stop-color='#141414'/></linearGradient></defs>` +
    `<rect width='500' height='500' fill='url(#g)'/>` +
    `<text x='50%' y='58%' font-size='200' text-anchor='middle' ` +
    `fill='rgba(255,255,255,0.9)' font-family='sans-serif' font-weight='bold'>${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

interface CatalogueTrack {
  id: string;
  title: string;
  duration: number;
  genre?: string | null;
  region?: string | null;
  artist?: { id: string; name: string } | null;
  album?: { id: string; title: string } | null;
}

export default function HomePage() {
  const user = useAuth((s) => s.user);
  const authReady = useAuth((s) => s.ready);
  const authInit = useAuth((s) => s.init);

  const playQueue = useMeloPlayer((s) => s.playQueue);
  const playingId = useMeloPlayer((s) => s.track?.id);
  const playerStatus = useMeloPlayer((s) => s.status);
  const quality = useMeloPlayer((s) => s.quality);
  const autoSaver = useMeloPlayer((s) => s.autoSaver);
  const setQuality = useMeloPlayer((s) => s.setQuality);
  const initNetwork = useMeloPlayer((s) => s.initNetwork);
  const needsAuth = useMeloPlayer((s) => s.needsAuth);
  const clearNeedsAuth = useMeloPlayer((s) => s.clearNeedsAuth);

  const [vibes, setVibes] = useState<VibeItem[]>(fallbackVibes);
  const [selectedVibe, setSelectedVibe] = useState<string>('v1');
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    void authInit();
    const cleanup = initNetwork();
    api
      .tracks('?take=20')
      .then((list) => {
        const mapped = (list as CatalogueTrack[]).map((t, i) => {
          const color = GLOW[i % GLOW.length]!;
          const artist = t.artist?.name ?? 'Unknown artist';
          return {
            id: t.id,
            title: t.title,
            artist,
            album: t.album?.title ?? '',
            coverUrl: coverFor(t.id, artist, color),
            vibe: t.genre ?? '',
            region: t.region ?? '',
            duration: fmtDuration(t.duration),
            borderColor: color,
          };
        });
        if (mapped.length > 0) setTracks(mapped as TrackData[]);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Catalogue unreachable'));
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/vibes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setVibes(
            list.map((v: { id: string; name: string; category: VibeItem['category']; colorHex: string }) => ({
              id: v.id,
              name: v.name,
              category: v.category,
              colorHex: v.colorHex,
            })),
          );
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (needsAuth) {
      setShowAuth(true);
      clearNeedsAuth();
    }
  }, [needsAuth, clearNeedsAuth]);

  const dataSaverOn = quality === 'data_saver' || autoSaver;

  const handleSelectVibe = (vibe: VibeItem) => {
    setSelectedVibe(vibe.id);
    void api.logEvent({ eventType: 'vibe_select' }).catch(() => undefined);
  };

  const handleAiSearch = (prompt: string) => {
    void api.logEvent({ eventType: 'search' }).catch(() => undefined);
    console.log('AI search prompt:', prompt);
  };

  return (
    <div className="flex min-h-screen bg-[#121212]">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-32">
        <Header
          dataSaverEnabled={dataSaverOn}
          onToggleDataSaver={() => setQuality(dataSaverOn ? 'balanced' : 'data_saver')}
        />

        <main className="flex-1 px-6 md:px-10 py-2 space-y-6 max-w-7xl mx-auto w-full">
          {/* Hero / Greeting Header */}
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Good Evening, <span className="text-[#1DB95D]">{user?.name ?? 'Chioma'}</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-2">
              Discover music by feeling, context, and African culture — affordably and reliably.
            </p>
          </div>

          {/* Vibe Pills Filter Bar */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Compass className="w-4 h-4 text-[#1DB95D]" />
              <span>Choose Your Current Vibe</span>
            </div>
            <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
              {vibes.map((vibe) => (
                <VibePill
                  key={vibe.id}
                  vibe={vibe}
                  isSelected={selectedVibe === vibe.id}
                  onSelect={handleSelectVibe}
                />
              ))}
            </div>
          </section>

          {/* AI prompt bar */}
          <AiPromptBar onSearchAi={handleAiSearch} />

          {/* Track grid — live catalogue */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 pt-2">
            {tracks.map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                isPlaying={playerStatus === 'playing' && playingId === track.id}
                onPlay={() => void playQueue(tracks, i)}
                onLike={() => undefined}
              />
            ))}
          </div>
          {authReady && tracks.length === 0 && (
            <p className="text-xs text-zinc-500">
              {loadError ? `Catalogue error: ${loadError}` : 'Connecting to the Melo catalogue…'}
            </p>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Live player */}
      <AudioPlayer />

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
