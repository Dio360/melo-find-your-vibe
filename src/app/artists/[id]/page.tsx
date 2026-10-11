'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BadgeCheck, MapPin, Play, UserCheck, UserPlus } from 'lucide-react';
import { AppShell, useAuthPrompt } from '@/components/AppShell';
import { TrackList } from '@/components/TrackList';
import type { TrackData } from '@/components/TrackCard';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';
import { bestCover, coverFor, fmtDuration, glowFor } from '@/lib/vibes';

interface ArtistDetail {
  id: string;
  name: string;
  bio: string | null;
  image: string | null;
  country: string | null;
  region: string | null;
  verified: boolean;
  albums: { id: string; title: string; cover: string | null; releaseDate: string | null }[];
  tracks: { id: string; title: string; duration: number; genre: string | null; albumId: string | null }[];
}

export default function ArtistPage() {
  return (
    <AppShell>
      <ArtistContent />
    </AppShell>
  );
}

function ArtistContent() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const playQueue = useMeloPlayer((s) => s.playQueue);
  const openAuth = useAuthPrompt();

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    api.artistDetail(id).then(setArtist).catch((e) => setError(e instanceof Error ? e.message : 'Artist not found'));
  }, [id]);

  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      return;
    }
    api.likedTracks().then((likes) => setLikedIds(new Set(likes.map((l) => l.track.id)))).catch(() => undefined);
    api.followedArtists().then((f) => setFollowing(f.some((x) => x.artist.id === id))).catch(() => undefined);
  }, [user, id]);

  const albumTitle = (albumId: string | null) =>
    albumId ? (artist?.albums.find((a) => a.id === albumId)?.title ?? '') : '';

  const tracks: TrackData[] = (artist?.tracks ?? []).map((t, i) => ({
    id: t.id,
    title: t.title,
    artist: artist?.name ?? '',
    album: albumTitle(t.albumId),
    coverUrl: bestCover(t.title, artist?.name ?? '?', glowFor(i)),
    vibe: t.genre ?? '',
    region: '',
    duration: fmtDuration(t.duration),
    borderColor: glowFor(i),
    artistId: artist?.id,
    albumId: t.albumId ?? undefined,
  }));

  const playAll = () => {
    if (!user) return openAuth();
    if (tracks.length > 0) void playQueue(tracks, 0);
  };

  const toggleFollow = async () => {
    if (!user) return openAuth();
    setFollowing((f) => !f);
    if (following) await api.unfollowArtist(id);
    else await api.followArtist(id);
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

  if (!artist) return <p className="py-16 text-center text-sm text-zinc-500">Loading artist…</p>;

  return (
    <div className="space-y-8 pb-8">
      {/* Hero */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-4">
        <img
          src={artist.image ?? bestCover('', artist.name, glowFor(artist.name.length))}
          alt={artist.name}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.startsWith('data:')) img.src = coverFor('', artist.name, glowFor(artist.name.length));
          }}
          className="w-40 h-40 md:w-52 md:h-52 rounded-full object-cover border-2 border-white/10 shadow-2xl"
        />
        <div className="text-center md:text-left space-y-2">
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Artist</p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight flex items-center gap-2 justify-center md:justify-start">
            {artist.name}
            {artist.verified && <BadgeCheck className="w-7 h-7 text-[#00E5FF]" aria-label="Verified" />}
          </h1>
          {(artist.country || artist.region) && (
            <p className="text-sm text-zinc-400 flex items-center gap-1.5 justify-center md:justify-start">
              <MapPin className="w-3.5 h-3.5" />
              {[artist.region, artist.country].filter(Boolean).join(' · ')}
            </p>
          )}
          {artist.bio && <p className="text-sm text-zinc-300 max-w-xl">{artist.bio}</p>}
          <div className="flex items-center gap-3 justify-center md:justify-start pt-1">
            <span className="text-xs text-zinc-500">
              {artist.tracks.length} tracks · {artist.albums.length} albums
            </span>
          </div>
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
        <button
          onClick={() => void toggleFollow()}
          className={`flex items-center gap-2 px-5 py-3 rounded-full border text-sm font-bold transition-colors ${
            following
              ? 'border-[#1DB95D] text-[#1DB95D]'
              : 'border-white/20 text-white hover:border-white/50'
          }`}
        >
          {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {following ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Popular tracks */}
      {tracks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-white font-bold text-lg">Popular tracks</h2>
          <TrackList tracks={tracks} likedIds={likedIds} onLike={toggleLike} hideArtist />
        </section>
      )}

      {/* Albums */}
      {artist.albums.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-white font-bold text-lg">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {artist.albums.map((al, i) => (
              <Link key={al.id} href={`/albums/${al.id}`} className="group space-y-2">
                <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                  <img
                    src={al.cover ?? bestCover(al.title, artist.name, glowFor(i))}
                    alt={al.title}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.startsWith('data:')) img.src = coverFor(al.id, artist.name, glowFor(i));
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <p className="text-sm font-semibold text-white truncate group-hover:text-[#1DB95D]">
                  {al.title}
                </p>
                {al.releaseDate && (
                  <p className="text-xs text-zinc-500">{new Date(al.releaseDate).getFullYear()}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
