'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Heart, Globe, Music4, Play } from 'lucide-react';
import { AppShell, useAuthPrompt } from '@/components/AppShell';
import type { TrackData } from '@/components/TrackCard';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';
import { bestCover, coverFor, fmtDuration, glowFor } from '@/lib/vibes';

interface TrackDetail {
  id: string;
  title: string;
  duration: number;
  genre: string | null;
  language: string | null;
  region: string | null;
  explicit: boolean;
  status: string;
  artist: { id: string; name: string; verified: boolean };
  album: { id: string; title: string; cover: string | null } | null;
  rights: { territory: string; streamingAllowed: boolean; status: string }[];
}

export default function TrackPage() {
  return (
    <AppShell>
      <TrackContent />
    </AppShell>
  );
}

function TrackContent() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const playQueue = useMeloPlayer((s) => s.playQueue);
  const openAuth = useAuthPrompt();

  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.trackDetail(id).then(setTrack).catch((e) => setError(e instanceof Error ? e.message : 'Track not found'));
  }, [id]);

  useEffect(() => {
    if (!user) {
      setLiked(false);
      return;
    }
    api.likedTracks().then((likes) => setLiked(likes.some((l) => l.track.id === id))).catch(() => undefined);
  }, [user, id]);

  const toTrackData = (t: TrackDetail): TrackData => ({
    id: t.id,
    title: t.title,
    artist: t.artist.name,
    album: t.album?.title ?? '',
    coverUrl: bestCover(t.title, t.artist.name, glowFor(0)),
    vibe: t.genre ?? '',
    region: t.region ?? '',
    duration: fmtDuration(t.duration),
    borderColor: glowFor(0),
    artistId: t.artist.id,
    albumId: t.album?.id,
  });

  const play = () => {
    if (!user) return openAuth();
    if (track) void playQueue([toTrackData(track)], 0);
  };

  const toggleLike = () => {
    if (!user) return openAuth();
    if (!track) return;
    setLiked((l) => !l);
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

  if (!track) return <p className="py-16 text-center text-sm text-zinc-500">Loading track…</p>;

  // Rights summary: show the territories where streaming is currently allowed.
  const playable = track.rights.filter((r) => r.streamingAllowed && r.status === 'active');
  const territories = playable.map((r) => r.territory);
  const worldwide = territories.includes('*');

  return (
    <div className="space-y-8 pb-8">
      {/* Hero */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-4">
        <img
          src={bestCover(track.title, track.artist.name, glowFor(0))}
          alt={track.album?.title || track.title}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.startsWith('data:')) img.src = coverFor(track.id, track.artist.name, glowFor(0));
          }}
          className="w-48 h-48 md:w-56 md:h-56 rounded-xl object-cover border-2 border-white/10 shadow-2xl"
        />
        <div className="text-center md:text-left space-y-2">
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-semibold flex items-center gap-1.5 justify-center md:justify-start">
            <Music4 className="w-3.5 h-3.5" /> Song
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            {track.title}
            {track.explicit && (
              <span className="ml-2 align-middle text-[10px] font-bold bg-white/15 text-zinc-300 px-1.5 py-0.5 rounded">
                E
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-300">
            <Link href={`/artists/${track.artist.id}`} className="font-semibold text-white hover:text-[#1DB95D] hover:underline">
              {track.artist.name}
            </Link>
            {track.album && (
              <>
                {' · '}
                <Link href={`/albums/${track.album.id}`} className="hover:text-[#1DB95D] hover:underline">
                  {track.album.title}
                </Link>
              </>
            )}
            {track.duration > 0 ? ` · ${fmtDuration(track.duration)}` : ''}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={play}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1DB95D] text-black font-bold hover:scale-105 transition-transform"
        >
          <Play className="w-5 h-5 fill-black" />
          Play
        </button>
        <button
          onClick={toggleLike}
          className={`p-3 rounded-full border transition-colors ${
            liked ? 'border-[#FF5722] text-[#FF5722]' : 'border-white/20 text-white hover:border-white/50'
          }`}
          title={liked ? 'Unlike' : 'Like'}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart className={`w-5 h-5 ${liked ? 'fill-[#FF5722]' : ''}`} />
        </button>
      </div>

      {/* Metadata + rights (surfaces the rights-before-scale model) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
          <h2 className="text-white font-bold text-sm">Details</h2>
          <dl className="space-y-2 text-sm">
            {[
              ['Genre', track.genre],
              ['Language', track.language],
              ['Region', track.region],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-zinc-500">{label}</dt>
                <dd className="text-zinc-200 text-right">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
          <h2 className="text-white font-bold text-sm flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#00E5FF]" /> Availability
          </h2>
          {playable.length === 0 ? (
            <p className="text-xs text-zinc-400">
              Not currently licensed for streaming in your territory.
            </p>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold bg-[#1DB95D]/15 text-[#1DB95D] px-2.5 py-1 rounded-full border border-[#1DB95D]/30">
                {worldwide ? 'Available worldwide' : `Available in ${territories.join(', ')}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
