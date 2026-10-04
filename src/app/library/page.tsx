'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Heart, ListMusic, Mic2, History, Trash2, Play } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { TrackCard, TrackData } from '@/components/TrackCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AuthModal } from '@/components/AuthModal';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';
import { coverFor, fmtDuration, glowFor } from '@/lib/vibes';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  _count: { tracks: number };
}

export default function LibraryPage() {
  const user = useAuth((s) => s.user);
  const authReady = useAuth((s) => s.ready);
  const playQueue = useMeloPlayer((s) => s.playQueue);
  const playingId = useMeloPlayer((s) => s.track?.id);
  const playerStatus = useMeloPlayer((s) => s.status);
  const setQuality = useMeloPlayer((s) => s.setQuality);
  const quality = useMeloPlayer((s) => s.quality);
  const autoSaver = useMeloPlayer((s) => s.autoSaver);
  const dataSaverOn = quality === 'data_saver' || autoSaver;

  const [liked, setLiked] = useState<TrackData[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newName, setNewName] = useState('');
  const [showAuth, setShowAuth] = useState(false);

  const refresh = useCallback(async () => {
    const [likes, mine] = await Promise.all([api.likedTracks(), api.myPlaylists()]);
    setLiked(
      (likes as { track: { id: string; title: string; artist: { name: string } } }[]).map(
        (l, i) => ({
          id: l.track.id,
          title: l.track.title,
          artist: l.track.artist.name,
          album: '',
          coverUrl: coverFor(l.track.id, l.track.artist.name, glowFor(i)),
          vibe: '',
          region: '',
          duration: '',
          borderColor: glowFor(i),
        }),
      ) as TrackData[],
    );
    setPlaylists(mine);
  }, []);

  useEffect(() => {
    if (user) void refresh().catch(() => undefined);
    else {
      setLiked([]);
      setPlaylists([]);
    }
  }, [user, refresh]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim().length < 2) return;
    await api.createPlaylist(newName.trim());
    setNewName('');
    await refresh().catch(() => undefined);
  };

  const removePlaylist = async (id: string) => {
    await api.deletePlaylist(id);
    await refresh().catch(() => undefined);
  };

  const unlike = async (track: TrackData) => {
    await api.unlikeTrack(track.id);
    setLiked((prev) => prev.filter((t) => t.id !== track.id));
  };

  const openPlaylist = async (id: string) => {
    const detail = await api.playlistDetail(id);
    const mapped = detail.tracks.map((pt, i) => ({
      id: pt.track.id,
      title: pt.track.title,
      artist: pt.track.artist.name,
      album: '',
      coverUrl: coverFor(pt.track.id, pt.track.artist.name, glowFor(i)),
      vibe: '',
      region: '',
      duration: '',
      borderColor: glowFor(i),
    })) as TrackData[];
    if (mapped.length > 0) await playQueue(mapped, 0);
  };

  return (
    <div className="flex min-h-screen bg-[#121212]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-32">
        <Header
          dataSaverEnabled={dataSaverOn}
          onToggleDataSaver={() => setQuality(dataSaverOn ? 'balanced' : 'data_saver')}
        />
        <main className="flex-1 px-6 md:px-10 py-2 space-y-8 max-w-7xl mx-auto w-full">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Your <span className="text-[#1DB95D]">Library</span>
          </h2>

          {!user && authReady ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center space-y-3">
              <p className="text-sm text-zinc-300">Sign in to see your liked songs and playlists.</p>
              <button
                onClick={() => setShowAuth(true)}
                className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform"
              >
                Log in
              </button>
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Heart className="w-4 h-4 text-[#FF5722]" />
                  <span>Liked songs</span>
                </div>
                {liked.length === 0 ? (
                  <p className="text-xs text-zinc-500">Tap the heart on any track to save it here.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {liked.map((track, i) => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        isPlaying={playerStatus === 'playing' && playingId === track.id}
                        isLiked
                        onPlay={() => void playQueue(liked, i)}
                        onLike={(t) => void unlike(t)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <ListMusic className="w-4 h-4 text-[#1DB95D]" />
                  <span>Playlists</span>
                </div>
                <form onSubmit={create} className="flex gap-2 max-w-md">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New playlist name…"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB95D]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#1DB95D] text-black text-sm font-bold hover:opacity-90"
                  >
                    Create
                  </button>
                </form>
                <div className="space-y-2">
                  {playlists.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{p.name}</p>
                        <p className="text-xs text-zinc-400">
                          {p._count.tracks} tracks{p.description ? ` · ${p.description}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => void openPlaylist(p.id)}
                          className="p-2 rounded-full bg-[#1DB95D] text-black hover:scale-105 transition-transform"
                          title="Play"
                        >
                          <Play className="w-4 h-4 fill-black" />
                        </button>
                        <button
                          onClick={() => void removePlaylist(p.id)}
                          className="p-2 rounded-full text-zinc-400 hover:text-[#FF5722] hover:bg-white/10"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {playlists.length === 0 && (
                    <p className="text-xs text-zinc-500">No playlists yet — create one above.</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex items-center gap-3 text-xs text-zinc-400">
                <History className="w-4 h-4 text-[#00E5FF] shrink-0" />
                <span className="flex items-center gap-1.5">
                  <Mic2 className="w-3.5 h-3.5" />
                  Follows, saves and history live under Library in the API — artist pages land with the catalogue UI.
                </span>
              </section>
            </>
          )}
        </main>
      </div>
      <BottomNav />
      <AudioPlayer />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
