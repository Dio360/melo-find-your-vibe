'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, Mic2, Play } from 'lucide-react';
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
import { VIBE_FILTERS, bestCover, coverFor, fmtDuration, glowFor } from '@/lib/vibes';

// Vibe taxonomy — mirrors GET /api/v1/vibes
const fallbackVibes: VibeItem[] = [
  { id: 'v1', name: 'Naija Chill', category: 'african', colorHex: '#00E5FF' },
  { id: 'v2', name: 'Lagos Night Drive', category: 'context', colorHex: '#FF5722' },
  { id: 'v3', name: 'Afrobeat Energy', category: 'mood', colorHex: '#FFC107' },
  { id: 'v4', name: 'Late Night Study', category: 'activity', colorHex: '#1DB95D' },
];

interface CatalogueTrack {
  id: string;
  title: string;
  duration: number;
  genre?: string | null;
  region?: string | null;
  artist?: { id: string; name: string } | null;
  album?: { id: string; title: string } | null;
}

interface Artist {
  id: string;
  name: string;
  country: string | null;
}

function ArtistArt({ name, tracks, index }: { name: string; tracks: TrackData[]; index: number }) {
  const own = tracks.find((t) => t.artist === name);
  const src = own ? own.coverUrl : bestCover('', name, glowFor(index));
  return (
    <img
      src={src}
      alt={name}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.startsWith('data:')) img.src = coverFor('', name, glowFor(index));
      }}
      className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border border-white/10 group-hover:border-[#1DB95D] group-hover:scale-105 transition-all"
      style={{ boxShadow: `0 0 18px ${glowFor(index)}33` }}
    />
  );
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
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    void authInit();
    const cleanup = initNetwork();
    api
      .tracks('?take=20')
      .then((list) => {
        const mapped = (list as CatalogueTrack[]).map((t, i) => ({
          id: t.id,
          title: t.title,
          artist: t.artist?.name ?? 'Unknown artist',
          album: t.album?.title ?? '',
          coverUrl: bestCover(t.title, t.artist?.name ?? '?', glowFor(i)),
          vibe: t.genre ?? '',
          region: t.region ?? '',
          duration: fmtDuration(t.duration),
          borderColor: glowFor(i),
        }));
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
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/catalogue/artists?take=10`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (Array.isArray(list)) setArtists(list as Artist[]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      return;
    }
    api
      .likedTracks()
      .then((likes) => setLikedIds(new Set(likes.map((l) => l.track.id))))
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (needsAuth) {
      setShowAuth(true);
      clearNeedsAuth();
    }
  }, [needsAuth, clearNeedsAuth]);

  const dataSaverOn = quality === 'data_saver' || autoSaver;

  const handleSelectVibe = (vibe: VibeItem) => {
    setSelectedVibe((s) => (s === vibe.id ? null : vibe.id));
    void api.logEvent({ eventType: 'vibe_select' }).catch(() => undefined);
  };

  const playAiPrompt = async (prompt: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setAiNotice('Melo is building your vibe…');
    try {
      const res = await api.aiPlaylist(prompt, 20);
      const mapped = res.playlist.tracks.map((pt, i) => ({
        id: pt.track.id,
        title: pt.track.title,
        artist: pt.track.artist.name,
        album: '',
        coverUrl: bestCover(pt.track.title, pt.track.artist.name, glowFor(i)),
        vibe: '',
        region: '',
        duration: fmtDuration(pt.track.duration),
        borderColor: glowFor(i),
      })) as TrackData[];
      setAiNotice(`${res.playlist.name} — ${res.explanation}`);
      if (mapped.length > 0) {
        setTracks(mapped);
        setSelectedVibe(null);
        await playQueue(mapped, 0);
      }
    } catch (e) {
      setAiNotice(e instanceof Error ? `Melo AI: ${e.message}` : 'Melo AI failed');
    }
  };

  const handleToggleLike = (track: TrackData) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    const liked = likedIds.has(track.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(track.id);
      else next.add(track.id);
      return next;
    });
    void (liked ? api.unlikeTrack(track.id) : api.likeTrack(track.id));
    void api.logEvent({ trackId: track.id, eventType: liked ? 'unlike' : 'like' });
  };

  const activeVibe = vibes.find((v) => v.id === selectedVibe) ?? null;
  const filter = activeVibe ? (VIBE_FILTERS[activeVibe.name] ?? {}) : {};
  const visible = tracks.filter(
    (t) => (!filter.genre || t.vibe === filter.genre) && (!filter.region || t.region === filter.region),
  );

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
          {/* AI discovery first — Spotify-style top search */}
          <AiPromptBar onSearchAi={(prompt) => void playAiPrompt(prompt)} />

          {aiNotice && (
            <div className="p-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-medium flex items-center justify-between gap-3">
              <span>{aiNotice}</span>
              <button
                onClick={() => setAiNotice(null)}
                className="text-zinc-400 hover:text-white text-xs underline shrink-0"
              >
                Clear
              </button>
            </div>
          )}

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

          {/* Popular Artists */}
          {artists.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Mic2 className="w-4 h-4 text-[#FFC107]" />
                <span>Popular Artists</span>
              </div>
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
                {artists.map((a, i) => (
                  <div key={a.id} className="relative shrink-0 group">
                    <Link
                      href={`/artists/${a.id}`}
                      title={`Open ${a.name}`}
                      className="flex flex-col items-center gap-2"
                    >
                      <ArtistArt name={a.name} tracks={tracks} index={i} />
                      <span className="text-xs font-bold text-white group-hover:text-[#1DB95D] transition-colors">
                        {a.name}
                      </span>
                    </Link>
                    {/* Hover play: builds an AI vibe for this artist (kept from before). */}
                    <button
                      onClick={() => void playAiPrompt(`songs like ${a.name}`)}
                      title={`Play a ${a.name} vibe`}
                      aria-label={`Play a ${a.name} vibe`}
                      className="absolute inset-x-0 top-0 h-24 md:h-28 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="w-10 h-10 rounded-full bg-[#1DB95D] text-black flex items-center justify-center shadow-lg shadow-[#1DB95D]/40">
                        <Play className="w-4 h-4 fill-black translate-x-0.5" />
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Track grid — live catalogue, vibe-filtered */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 pt-2">
            {visible.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isPlaying={playerStatus === 'playing' && playingId === track.id}
                isLiked={likedIds.has(track.id)}
                onPlay={() => void playQueue(visible, visible.findIndex((t) => t.id === track.id))}
                onLike={() => handleToggleLike(track)}
              />
            ))}
          </div>
          {authReady && tracks.length === 0 && (
            <p className="text-xs text-zinc-500">
              {loadError ? `Catalogue error: ${loadError}` : 'Connecting to the Melo catalogue…'}
            </p>
          )}
          {activeVibe && visible.length === 0 && tracks.length > 0 && (
            <p className="text-xs text-zinc-500">
              No tracks for {activeVibe.name} yet — check back as the catalogue grows.
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
