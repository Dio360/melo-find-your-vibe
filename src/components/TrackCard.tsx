"use client";

import React from "react";
import { Play, Heart } from "lucide-react";
import { coverFor } from "@/lib/vibes";

export interface TrackData {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  vibe: string;
  region: string;
  duration: string;
  isLiked?: boolean;
  borderColor?: string;
  artistId?: string;
  albumId?: string;
}

interface TrackCardProps {
  track: TrackData;
  isPlaying: boolean;
  isLiked: boolean;
  onPlay: (track: TrackData) => void;
  onLike: (track: TrackData) => void;
}

export function TrackCard({ track, isPlaying, isLiked, onPlay, onLike }: TrackCardProps) {
  const glow = track.borderColor ?? "#1DB95D";
  return (
    <div
      onClick={() => onPlay(track)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay(track);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Play ${track.title} by ${track.artist}`}
      className="group relative rounded-2xl bg-[#1A1A1A] border border-white/10 overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer focus:outline-none focus:border-[#1DB95D]"
      style={{ boxShadow: `0 0 20px ${glow}33` }}
    >
      {/* Artwork container */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={track.coverUrl}
          alt={track.album}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.startsWith('data:')) {
              img.src = coverFor('', track.artist, track.borderColor ?? '#1DB95D');
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(track);
            }}
            className="w-12 h-12 rounded-full bg-[#1DB95D] text-black flex items-center justify-center shadow-lg shadow-[#1DB95D]/40 hover:scale-110 transition-transform"
            title="Play Track"
          >
            <Play className="w-5 h-5 fill-black translate-x-0.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(track);
            }}
            className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition-all ${
              isLiked
                ? 'bg-[#FF5722]/90 text-black opacity-100'
                : 'bg-black/60 text-white border border-white/20 opacity-0 group-hover:opacity-100 hover:bg-black/80'
            }`}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-black' : ''}`} />
          </button>
        </div>
      </div>

      {/* Track Details — matches mockup: Artist / Album / Music Style */}
      <div className="p-3.5">
        <h4 className="text-sm font-bold text-white truncate">
          {track.artist}
        </h4>
        <p className="text-[13px] text-zinc-200 truncate mt-0.5">{track.album}</p>
        <p className="text-xs text-zinc-500 truncate mt-0.5">Music Style</p>
      </div>
    </div>
  );
}
