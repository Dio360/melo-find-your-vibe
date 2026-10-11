'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Play } from 'lucide-react';
import type { TrackData } from '@/components/TrackCard';
import { coverFor } from '@/lib/vibes';
import { useMeloPlayer } from '@/hooks/useMeloPlayer';

interface TrackListProps {
  tracks: TrackData[];
  likedIds?: Set<string>;
  onLike?: (track: TrackData) => void;
  /** Hide the artist column when the list is already scoped to one artist. */
  hideArtist?: boolean;
}

/**
 * Numbered track rows (Phase 9) used by artist, album, track and playlist
 * detail pages. Clicking a row plays it in context; the heart toggles a like.
 */
export function TrackList({ tracks, likedIds, onLike, hideArtist }: TrackListProps) {
  const playQueue = useMeloPlayer((s) => s.playQueue);
  const playingId = useMeloPlayer((s) => s.track?.id);
  const playerStatus = useMeloPlayer((s) => s.status);

  if (tracks.length === 0) {
    return <p className="text-xs text-zinc-500">No tracks here yet.</p>;
  }

  return (
    <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {tracks.map((t, i) => {
        const isPlaying = playerStatus === 'playing' && playingId === t.id;
        const isCurrent = playingId === t.id;
        const liked = likedIds?.has(t.id) ?? false;
        return (
          <div
            key={`${t.id}-${i}`}
            role="button"
            tabIndex={0}
            onClick={() => void playQueue(tracks, i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                void playQueue(tracks, i);
              }
            }}
            aria-label={`Play ${t.title} by ${t.artist}`}
            className={`group grid grid-cols-[24px_40px_1fr_auto] md:grid-cols-[24px_48px_2fr_1fr_auto] items-center gap-3 px-3 md:px-4 py-2.5 cursor-pointer transition-colors focus:outline-none focus:bg-white/10 ${
              isCurrent ? 'bg-white/[0.07]' : 'hover:bg-white/[0.06]'
            }`}
          >
            <span
              className={`text-sm tabular-nums text-center ${
                isPlaying ? 'text-[#1DB95D]' : 'text-zinc-500'
              }`}
            >
              {isPlaying ? (
                <span className="inline-flex items-end gap-0.5 h-3.5" aria-hidden>
                  <span className="w-0.5 h-full bg-[#1DB95D] animate-pulse" />
                  <span className="w-0.5 h-2/3 bg-[#1DB95D] animate-pulse [animation-delay:0.15s]" />
                  <span className="w-0.5 h-1/3 bg-[#1DB95D] animate-pulse [animation-delay:0.3s]" />
                </span>
              ) : (
                <>
                  <span className="group-hover:hidden">{i + 1}</span>
                  <Play className="w-3.5 h-3.5 fill-white hidden group-hover:block mx-auto" />
                </>
              )}
            </span>

            <img
              src={t.coverUrl}
              alt={t.album || t.title}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.startsWith('data:')) {
                  img.src = coverFor('', t.artist, t.borderColor ?? '#1DB95D');
                }
              }}
              className="w-10 h-10 rounded object-cover"
              loading="lazy"
            />

            <div className="min-w-0">
              <Link
                href={`/tracks/${t.id}`}
                onClick={(e) => e.stopPropagation()}
                className={`text-sm font-semibold truncate block hover:underline ${
                  isCurrent ? 'text-[#1DB95D]' : 'text-white'
                }`}
              >
                {t.title}
              </Link>
              {!hideArtist && t.artistId ? (
                <Link
                  href={`/artists/${t.artistId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-zinc-400 hover:text-white hover:underline truncate block"
                >
                  {t.artist}
                </Link>
              ) : (
                <p className="text-xs text-zinc-400 truncate">{t.artist}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pr-1">
              {onLike && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike(t);
                  }}
                  className={`p-1.5 rounded-full transition-colors ${
                    liked
                      ? 'text-[#FF5722]'
                      : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-white'
                  }`}
                  title={liked ? 'Unlike' : 'Like'}
                  aria-label={liked ? 'Unlike' : 'Like'}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-[#FF5722]' : ''}`} />
                </button>
              )}
              <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">{t.duration}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
