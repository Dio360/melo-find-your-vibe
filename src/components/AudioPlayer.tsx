"use client";

import React, { useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Settings } from "lucide-react";
import { TrackData } from "./TrackCard";

interface AudioPlayerProps {
  currentTrack: TrackData | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export function AudioPlayer({
  currentTrack,
  isPlaying,
  onTogglePlay,
}: AudioPlayerProps) {
  const [progress, setProgress] = useState(35); // demo percentage
  const [volume, setVolume] = useState(80);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-6xl z-40 px-2">
      <div className="rounded-2xl bg-[#141414]/55 backdrop-blur-2xl backdrop-saturate-150 border border-white/15 px-4 md:px-6 py-3 flex items-center gap-4 md:gap-6 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
        {/* Track Thumbnail & Details */}
        <div className="flex items-center gap-3 w-40 md:w-52 shrink-0">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-11 h-11 rounded-lg object-cover shadow-md shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate">{currentTrack.title}</h4>
            <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Center Player Controls & Seekbar */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-4 md:gap-5 text-zinc-300">
            <button className="hover:text-white transition-colors hidden sm:block">
              <Shuffle className="w-4 h-4" />
            </button>
            <button className="hover:text-white transition-colors">
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-10 h-10 rounded-full bg-[#1DB95D] text-black flex items-center justify-center shadow-lg shadow-[#1DB95D]/30 hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black translate-x-0.5" />
              )}
            </button>

            <button className="hover:text-white transition-colors">
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
            <button className="hover:text-[#1DB95D] text-[#1DB95D] transition-colors hidden sm:block">
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Seekbar */}
          <div className="w-full flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
            <span>1:45</span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#1DB95D]"
            />
            <span>{currentTrack.duration}</span>
          </div>
        </div>

        {/* Right Actions: Settings + Volume */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <button className="p-2 rounded-full bg-white/10 text-zinc-300 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 w-32">
            <Volume2 className="w-4 h-4 text-zinc-300 shrink-0" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#1DB95D]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
