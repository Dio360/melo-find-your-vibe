"use client";

import React from "react";
import { Play, Heart, Plus, Zap } from "lucide-react";

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
}

interface TrackCardProps {
  track: TrackData;
  isPlaying: boolean;
  onPlay: (track: TrackData) => void;
  onLike: (track: TrackData) => void;
}

export function TrackCard({ track, isPlaying, onPlay, onLike }: TrackCardProps) {
  return (
    <div className="group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 p-3.5 transition-all duration-300 hover:shadow-xl hover:shadow-[#1DB95D]/10 hover:-translate-y-1">
      {/* Artwork container */}
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-800">
        <img
          src={track.coverUrl}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <button
            onClick={() => onPlay(track)}
            className="w-12 h-12 rounded-full bg-[#1DB95D] text-black flex items-center justify-center shadow-lg shadow-[#1DB95D]/40 hover:scale-110 transition-transform"
            title="Play Track"
          >
            <Play className="w-5 h-5 fill-black translate-x-0.5" />
          </button>
        </div>

        {/* Region / Vibe badge */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20">
            {track.region}
          </span>
        </div>
      </div>

      {/* Track Details */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-white truncate group-hover:text-[#1DB95D] transition-colors">
            {track.title}
          </h4>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{track.vibe}</p>
        </div>

        {/* Action icons */}
        <button
          onClick={() => onLike(track)}
          className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
            track.isLiked ? "text-[#FF5722]" : "text-zinc-400 hover:text-white"
          }`}
          title="Like Track"
        >
          <Heart className={`w-4 h-4 ${track.isLiked ? "fill-[#FF5722]" : ""}`} />
        </button>
      </div>
    </div>
  );
}
