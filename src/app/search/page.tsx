'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { TrackCard, TrackData } from '@/components/TrackCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AuthModal } from '@/components/AuthModal';
import { UploadCta } from '@/components/UploadCta';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';
import { bestCover, coverFor, glowFor } from '@/lib/vibes';

interface Hit {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  score: number;
  image?: string | null;
}

const TABS = ['all', 'track', 'artist', 'album', 'playlist', 'vibe'];

export default function SearchPage() {
  const user = useAuth((s) => s.user);
  const playQueue = useMeloPlayer((s) => s.playQueue);
  const playingId = useMeloPlayer((s) => s.track?.id);
  const playerStatus = useMeloPlayer((s) => s.status);
  const setQuality = useMeloPlayer((s) => s.setQuality);
  const quality = useMeloPlayer((s) => s.quality);
  const autoSaver = useMeloPlayer((s) => s.autoSaver);
  const dataSaverOn = quality === 'data_saver' || autoSaver;

  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('all');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searched, setSearched] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const needsAuth = useMeloPlayer((s) => s.needsAuth);
  const clearNeedsAuth = useMeloPlayer((s) => s.clearNeedsAuth);

  React.useEffect(() => {
    if (needsAuth) {
      setShowAuth(true);
      clearNeedsAuth();
    }
  }, [needsAuth, clearNeedsAuth]);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    const res = await api.searchAll(q.trim(), entity === 'all' ? undefined : entity);
    setHits(res);
    setSearched(true);
  };

  const trackHits = hits.filter((h) => h.type === 'track');
  const otherHits = hits.filter((h) => h.type !== 'track');

  const toTrackData = (h: Hit, i: number): TrackData => ({
    id: h.id,
    title: h.title,
    artist: h.subtitle ?? 'Unknown artist',
    album: '',
    coverUrl: h.image || bestCover(h.title, h.subtitle ?? '?', glowFor(i)),
    vibe: '',
    region: '',
    duration: '',
    borderColor: glowFor(i),
  });

  const playTrackHit = (h: Hit) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    const list = trackHits.map(toTrackData);
    const idx = list.findIndex((t) => t.id === h.id);
    void playQueue(list, Math.max(idx, 0));
  };

  return (
    <div className="flex min-h-screen bg-[#121212]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-32">
        <Header
          dataSaverEnabled={dataSaverOn}
          onToggleDataSaver={() => setQuality(dataSaverOn ? 'balanced' : 'data_saver')}
        />
        <main className="flex-1 px-6 md:px-10 py-2 space-y-6 max-w-7xl mx-auto w-full">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Search <span className="text-[#1DB95D]">Melo</span>
          </h2>
          <UploadCta compact />

          <form onSubmit={run} className="relative">
            <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tracks, artists, albums, vibes… try 'burna'"
              className="w-full pl-11 pr-4 py-3.5 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB95D] transition-all"
            />
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setEntity(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                  entity === t
                    ? 'bg-[#1DB95D] text-black'
                    : 'bg-white/5 text-zinc-300 border border-white/10 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {trackHits.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {trackHits.map((h, i) => (
                <TrackCard
                  key={h.id}
                  track={toTrackData(h, i)}
                  isPlaying={playerStatus === 'playing' && playingId === h.id}
                  isLiked={false}
                  onPlay={() => playTrackHit(h)}
                  onLike={() => undefined}
                />
              ))}
            </div>
          )}

          {otherHits.length > 0 && (
            <div className="space-y-2">
              {otherHits.map((h) => (
                <div
                  key={`${h.type}-${h.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {h.image ? (
                      <img
                        src={h.image}
                        alt={h.title}
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.src.startsWith('data:')) {
                            img.src = coverFor(h.id, h.subtitle ?? h.title, glowFor(h.title.length));
                          }
                        }}
                        className={`shrink-0 w-12 h-12 object-cover border border-white/10 ${
                          h.type === 'artist' ? 'rounded-full' : 'rounded'
                        }`}
                        loading="lazy"
                      />
                    ) : null}
                    <div className="min-w-0">
                      {h.type === 'artist' || h.type === 'album' || h.type === 'playlist' ? (
                        <Link
                          href={`/${h.type}s/${h.id}`}
                          className="text-sm font-bold text-white truncate hover:text-[#1DB95D] hover:underline block"
                        >
                          {h.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-bold text-white truncate">{h.title}</p>
                      )}
                      <p className="text-xs text-zinc-400 truncate">
                        {h.type} {h.subtitle ? `· ${h.subtitle}` : ''}
                      </p>
                    </div>
                  </div>
                  {h.type === 'artist' || h.type === 'album' || h.type === 'playlist' ? (
                    <Link
                      href={`/${h.type}s/${h.id}`}
                      className="shrink-0 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                    >
                      Open
                    </Link>
                  ) : h.type === 'vibe' ? (
                    <Link
                      href="/vibes"
                      className="shrink-0 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                    >
                      Explore
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {searched && hits.length === 0 && (
            <p className="text-xs text-zinc-500">No results — try another spelling.</p>
          )}
        </main>
      </div>
      <BottomNav />
      <AudioPlayer />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
