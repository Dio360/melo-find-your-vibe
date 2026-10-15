'use client';

import React, { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { VibePill, VibeItem } from '@/components/VibePill';
import { TrackCard, TrackData } from '@/components/TrackCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AuthModal } from '@/components/AuthModal';
import { UploadCta } from '@/components/UploadCta';
import { api } from '@/lib/api';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';
import { VIBE_FILTERS, bestCover, coverFrom, fmtDuration, glowFor } from '@/lib/vibes';

interface CatalogueTrack {
  id: string;
  title: string;
  duration: number;
  genre?: string | null;
  region?: string | null;
  artist?: { id: string; name: string } | null;
  album?: { id: string; title: string; cover?: string | null } | null;
}

export default function VibesPage() {
  const playQueue = useMeloPlayer((s) => s.playQueue);
  const playingId = useMeloPlayer((s) => s.track?.id);
  const playerStatus = useMeloPlayer((s) => s.status);
  const setQuality = useMeloPlayer((s) => s.setQuality);
  const quality = useMeloPlayer((s) => s.quality);
  const autoSaver = useMeloPlayer((s) => s.autoSaver);
  const dataSaverOn = quality === 'data_saver' || autoSaver;
  const needsAuth = useMeloPlayer((s) => s.needsAuth);
  const clearNeedsAuth = useMeloPlayer((s) => s.clearNeedsAuth);

  const [groups, setGroups] = useState<Record<string, VibeItem[]>>({});
  const [selected, setSelected] = useState<VibeItem | null>(null);
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/vibes/groups`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((g) => {
        if (g && typeof g === 'object') setGroups(g as Record<string, VibeItem[]>);
      })
      .catch(() => undefined);
    api
      .tracks('?take=50')
      .then((list) => {
        setTracks(
          (list as CatalogueTrack[]).map((t, i) => ({
            id: t.id,
            title: t.title,
            artist: t.artist?.name ?? 'Unknown artist',
            album: t.album?.title ?? '',
            coverUrl: coverFrom(t.album, t.title, t.artist?.name ?? '?', glowFor(i)),
            vibe: t.genre ?? '',
            region: t.region ?? '',
            duration: fmtDuration(t.duration),
            borderColor: glowFor(i),
          })) as TrackData[],
        );
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (needsAuth) {
      setShowAuth(true);
      clearNeedsAuth();
    }
  }, [needsAuth, clearNeedsAuth]);

  const filter = selected ? (VIBE_FILTERS[selected.name] ?? {}) : {};
  const visible = tracks.filter(
    (t) =>
      (!filter.genre || t.vibe === filter.genre) &&
      (!filter.region || t.region === filter.region),
  );

  return (
    <div className="flex min-h-screen bg-[#121212]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-32">
        <Header
          dataSaverEnabled={dataSaverOn}
          onToggleDataSaver={() => setQuality(dataSaverOn ? 'balanced' : 'data_saver')}
        />
        <main className="flex-1 px-6 md:px-10 py-2 space-y-8 max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Explore <span className="text-[#1DB95D]">Vibes</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-2">
              Pick a vibe to filter the catalogue below.
            </p>
            <div className="mt-3">
              <UploadCta compact />
            </div>
          </div>

          {Object.entries(groups).map(([category, items]) => (
            <section key={category} className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm capitalize">
                <Compass className="w-4 h-4 text-[#1DB95D]" />
                <span>{category}</span>
              </div>
              <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
                {items.map((vibe) => (
                  <VibePill
                    key={vibe.id}
                    vibe={vibe}
                    isSelected={selected?.id === vibe.id}
                    onSelect={(v) => setSelected((s) => (s?.id === v.id ? null : v))}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {visible.map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                isPlaying={playerStatus === 'playing' && playingId === track.id}
                isLiked={false}
                onPlay={() => void playQueue(visible, i)}
                onLike={() => undefined}
              />
            ))}
          </div>
          {selected && visible.length === 0 && (
            <p className="text-xs text-zinc-500">
              No tracks for {selected.name} yet — check back as the catalogue grows.
            </p>
          )}
        </main>
      </div>
      <BottomNav />
      <AudioPlayer />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
