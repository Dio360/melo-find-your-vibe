'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { AiPromptBar } from '@/components/AiPromptBar';
import { TrackCard, TrackData } from '@/components/TrackCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AuthModal } from '@/components/AuthModal';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';
import { coverFor, fmtDuration, glowFor } from '@/lib/vibes';

export default function AIPage() {
  const user = useAuth((s) => s.user);
  const authReady = useAuth((s) => s.ready);
  const playQueue = useMeloPlayer((s) => s.playQueue);
  const playingId = useMeloPlayer((s) => s.track?.id);
  const playerStatus = useMeloPlayer((s) => s.status);
  const setQuality = useMeloPlayer((s) => s.setQuality);
  const quality = useMeloPlayer((s) => s.quality);
  const autoSaver = useMeloPlayer((s) => s.autoSaver);
  const needsAuth = useMeloPlayer((s) => s.needsAuth);
  const clearNeedsAuth = useMeloPlayer((s) => s.clearNeedsAuth);
  const dataSaverOn = quality === 'data_saver' || autoSaver;

  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  React.useEffect(() => {
    if (needsAuth) {
      setShowAuth(true);
      clearNeedsAuth();
    }
  }, [needsAuth, clearNeedsAuth]);

  const generate = async (prompt: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setBusy(true);
    try {
      const res = await api.aiPlaylist(prompt, 20);
      const mapped = res.playlist.tracks.map((pt, i) => ({
        id: pt.track.id,
        title: pt.track.title,
        artist: pt.track.artist.name,
        album: '',
        coverUrl: coverFor(pt.track.id, pt.track.artist.name, glowFor(i)),
        vibe: '',
        region: '',
        duration: fmtDuration(pt.track.duration),
        borderColor: glowFor(i),
      })) as TrackData[];
      setTitle(res.playlist.name);
      setExplanation(res.explanation);
      setTracks(mapped);
      if (mapped.length > 0) await playQueue(mapped, 0);
    } catch {
      setExplanation('Melo AI is unavailable right now — try again in a bit.');
    } finally {
      setBusy(false);
    }
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
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-[#00E5FF]" />
              AI <span className="text-[#1DB95D]">Discovery</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-2">
              Describe the vibe in plain language — Melo builds a licensed playlist and plays it.
            </p>
          </div>

          {!user && authReady ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center space-y-3">
              <p className="text-sm text-zinc-300">Sign in to generate AI playlists.</p>
              <button
                onClick={() => setShowAuth(true)}
                className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform"
              >
                Log in
              </button>
            </div>
          ) : (
            <AiPromptBar onSearchAi={(p) => void generate(p)} />
          )}

          {busy && <p className="text-xs text-[#00E5FF] animate-pulse">Melo is building your vibe…</p>}

          {title && (
            <section className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                {explanation && <p className="text-xs text-zinc-400 mt-1">{explanation}</p>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {tracks.map((track, i) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isPlaying={playerStatus === 'playing' && playingId === track.id}
                    isLiked={false}
                    onPlay={() => void playQueue(tracks, i)}
                    onLike={() => undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
      <BottomNav />
      <AudioPlayer />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
