"use client";

import React, { useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Zap, Repeat, Shuffle, ListMusic } from "lucide-react";
import { TrackData } from "./TrackCard";

interface AudioPlayerProps {
  currentTrack: TrackData | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  dataSaverEnabled: boolean;
}

export function AudioPlayer({
  currentTrack,
  isPlaying,
  onTogglePlay,
  dataSaverEnabled,
}: AudioPlayerProps) {
  const [progress, setProgress] = useState(35); // demo percentage
  const [volume, setVolume] = useState(80);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-0 right-0 md:left-72 md:right-8 z-40 px-4">
      <div className="glass-player rounded-2xl p-3 md:p-4 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6 shadow-2xl">
        {/* Track Thumbnail & Details */}
        <div className="flex items-center gap-3 w-full md:w-1/4">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-xl object-cover shadow-md shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
            <p className="text-[11px] text-zinc-400 truncate">{currentTrack.artist}</p>
          </div>
          <button className="text-zinc-400 hover:text-[#FF5722] transition-colors p-1">
            <Heart className="w-4 h-4" />
          </button>
        </div>

        {/* Center Player Controls & Seekbar */}
        <div className="flex-1 w-full max-w-md flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4 text-zinc-400">
            <button className="hover:text-white transition-colors">
              <Shuffle className="w-3.5 h-3.5" />
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
            <button className="hover:text-white transition-colors">
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Seekbar */}
          <div className="w-full flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
            <span>1:15</span>
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

        {/* Right Actions: Volume & Data Saver status */}
        <div className="hidden md:flex items-center justify-end gap-3 w-1/4">
          {/* Data Saver Mode Active Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              dataSaverEnabled
                ? "bg-[#1DB95D]/20 text-[#1DB95D] border-[#1DB95D]/30"
                : "bg-white/5 text-zinc-400 border-white/10"
            }`}
            title={
              dataSaverEnabled
                ? "Streaming at 64kbps Low Bitrate (Data Saver Active)"
                : "Streaming at 320kbps High Quality"
            }
          >
            <Zap className={`w-3 h-3 ${dataSaverEnabled ? "fill-[#1DB95D] text-[#1DB95D]" : ""}`} />
            <span>{dataSaverEnabled ? "64 kbps" : "320 kbps"}</span>
          </div>

          <button className="text-zinc-400 hover:text-white transition-colors">
            <ListMusic className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 w-24">
            <Volume2 className="w-4 h-4 text-zinc-400 shrink-0" />
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
