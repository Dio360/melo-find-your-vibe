'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Disc3, Play } from 'lucide-react';
import { AppShell, useAuthPrompt } from '@/components/AppShell';
import { TrackList } from '@/components/TrackList';
import type { TrackData } from '@/components/TrackCard';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';
import { bestCover, coverFor, fmtDuration, glowFor } from '@/lib/vibes';

interface AlbumDetail {
  id: string;
  title: string;
  cover: string | null;
  releaseDate: string | null;
  artist: { id: string; name: string };
  tracks: { id: string; title: string; duration: number; explicit: boolean; genre: string | null }[];
}

export default function AlbumPage() {
  return (
    <AppShell>
      <AlbumContent />
    </AppShell>
  );
}

function AlbumContent() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const playQueue = useMeloPlayer((s) => s.playQueue);
  const openAuth = useAuthPrompt();

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    api.albumDetail(id).then(setAlbum).catch((e) => setError(e instanceof Error ? e.message : 'Album not found'));
  }, [id]);

  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      return;
    }
    api.likedTracks().then((likes) => setLikedIds(new Set(likes.map((l) => l.track.id)))).catch(() => undefined);
  }, [user]);

  const tracks: TrackData[] = (album?.tracks ?? []).map((t, i) => ({
    id: t.id,
    title: t.title,
    artist: album?.artist.name ?? '',
    album: album?.title ?? '',
    coverUrl: bestCover(album?.title ?? '', album?.artist.name ?? '?', glowFor(i)),
    vibe: t.genre ?? '',
    region: '',
    duration: fmtDuration(t.duration),
    borderColor: glowFor(i),
    artistId: album?.artist.id,
    albumId: album?.id,
  }));

  const totalSeconds = (album?.tracks ?? []).reduce((sum, t) => sum + (t.duration || 0), 0);

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

  if (error) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-zinc-400">{error}</p>
        <Link href="/" className="text-sm text-[#1DB95D] hover:underline">← Back to Home</Link>
      </div>
    );
  }

  if (!album) return <p className="py-16 text-center text-sm text-zinc-500">Loading album…</p>;

  const year = album.releaseDate ? new Date(album.releaseDate).getFullYear() : null;

  return (
    <div className="space-y-8 pb-8">
      {/* Hero */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-4">
        <img
          src={album.cover ?? bestCover(album.title, album.artist.name, glowFor(0))}
          alt={album.title}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.startsWith('data:')) img.src = coverFor(album.id, album.artist.name, glowFor(0));
          }}
          className="w-48 h-48 md:w-56 md:h-56 rounded-xl object-cover border-2 border-white/10 shadow-2xl"
        />
        <div className="text-center md:text-left space-y-2">
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-semibold flex items-center gap-1.5 justify-center md:justify-start">
            <Disc3 className="w-3.5 h-3.5" /> Album
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">{album.title}</h1>
          <p className="text-sm text-zinc-300">
            <Link href={`/artists/${album.artist.id}`} className="font-semibold text-white hover:text-[#1DB95D] hover:underline">
              {album.artist.name}
            </Link>
            {year ? ` · ${year}` : ''}
            {album.tracks.length > 0 ? ` · ${album.tracks.length} songs` : ''}
            {totalSeconds > 0 ? ` · ${fmtDuration(totalSeconds)}` : ''}
          </p>
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
        <TrackList tracks={tracks} likedIds={likedIds} onLike={toggleLike} hideArtist />
      </section>
    </div>
  );
}
