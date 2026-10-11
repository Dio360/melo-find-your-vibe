'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ListMusic, Play } from 'lucide-react';
import { AppShell, useAuthPrompt } from '@/components/AppShell';
import { TrackList } from '@/components/TrackList';
import type { TrackData } from '@/components/TrackCard';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';
import { bestCover, fmtDuration, glowFor } from '@/lib/vibes';

interface PlaylistDetail {
  id: string;
  name: string;
  description: string | null;
  tracks: { track: { id: string; title: string; duration?: number; artist: { id: string; name: string } } }[];
}

export default function PlaylistPage() {
  return (
    <AppShell>
      <PlaylistContent />
    </AppShell>
  );
}

function PlaylistContent() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const authReady = useAuth((s) => s.ready);
  const playQueue = useMeloPlayer((s) => s.playQueue);
  const openAuth = useAuthPrompt();

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setPlaylist(await api.playlistDetail(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Playlist not found');
    }
  }, [id]);

  useEffect(() => {
    // Playlist detail is JWT-guarded; wait for auth to settle before fetching.
    if (!authReady) return;
    if (!user) {
      setError('Log in to view this playlist.');
      return;
    }
    void load();
  }, [authReady, user, load]);

  useEffect(() => {
    if (!user) return;
    api.likedTracks().then((likes) => setLikedIds(new Set(likes.map((l) => l.track.id)))).catch(() => undefined);
  }, [user]);

  const tracks: TrackData[] = (playlist?.tracks ?? []).map((pt, i) => ({
    id: pt.track.id,
    title: pt.track.title,
    artist: pt.track.artist.name,
    album: '',
    coverUrl: bestCover(pt.track.title, pt.track.artist.name, glowFor(i)),
    vibe: '',
    region: '',
    duration: fmtDuration(pt.track.duration ?? 0),
    borderColor: glowFor(i),
    artistId: pt.track.artist.id,
  }));

  const playAll = () => {
    if (!user) return openAuth();
    if (tracks.length > 0) void playQueue(tracks, 0);
  };

  const toggleLike = (track: TrackData) => {
    if (!user) return openAuth();
    const liked = likedIds.has(track.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(track.id);
      else next.add(track.id);
      return next;
    });
    void (liked ? api.unlikeTrack(track.id) : api.likeTrack(track.id));
  };

  if (!authReady) return <p className="py-16 text-center text-sm text-zinc-500">Loading…</p>;

  if (!user) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm text-zinc-300">{error ?? 'Log in to view this playlist.'}</p>
        <button
          onClick={openAuth}
          className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform"
        >
          Log in
        </button>
      </div>
    );
  }

  if (error && !playlist) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-zinc-400">{error}</p>
        <Link href="/library" className="text-sm text-[#1DB95D] hover:underline">← Back to Library</Link>
      </div>
    );
  }

  if (!playlist) return <p className="py-16 text-center text-sm text-zinc-500">Loading playlist…</p>;

  return (
    <div className="space-y-8 pb-8">
      {/* Hero */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-4">
        <div
          className="w-48 h-48 md:w-56 md:h-56 rounded-xl border-2 border-white/10 shadow-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${glowFor(0)}55, #141414)` }}
        >
          <ListMusic className="w-16 h-16 text-white/80" />
        </div>
        <div className="text-center md:text-left space-y-2">
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Playlist</p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">{playlist.name}</h1>
          {playlist.description && <p className="text-sm text-zinc-300 max-w-xl">{playlist.description}</p>}
          <p className="text-sm text-zinc-400">{tracks.length} songs</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={playAll}
          disabled={tracks.length === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1DB95D] text-black font-bold hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100"
        >
          <Play className="w-5 h-5 fill-black" />
          Play
        </button>
      </div>

      {/* Track list */}
      <section className="space-y-3">
        <TrackList tracks={tracks} likedIds={likedIds} onLike={toggleLike} />
      </section>
    </div>
  );
}
