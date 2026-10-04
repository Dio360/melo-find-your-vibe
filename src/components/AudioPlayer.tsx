'use client';

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Shuffle,
  Repeat,
  Settings,
} from 'lucide-react';
import { useMeloPlayer, type Quality } from '@/hooks/useMeloPlayer';

const QUALITY_ORDER: Quality[] = ['data_saver', 'balanced', 'high', 'auto'];

function fmt(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '0:00';
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AudioPlayer() {
  const track = useMeloPlayer((s) => s.track);
  const status = useMeloPlayer((s) => s.status);
  const progress = useMeloPlayer((s) => s.progress);
  const duration = useMeloPlayer((s) => s.duration);
  const quality = useMeloPlayer((s) => s.quality);
  const bitrate = useMeloPlayer((s) => s.bitrate);
  const autoSaver = useMeloPlayer((s) => s.autoSaver);
  const error = useMeloPlayer((s) => s.error);
  const toggle = useMeloPlayer((s) => s.toggle);
  const next = useMeloPlayer((s) => s.next);
  const prev = useMeloPlayer((s) => s.prev);
  const seek = useMeloPlayer((s) => s.seek);
  const setQuality = useMeloPlayer((s) => s.setQuality);

  const [volume, setVolumeState] = React.useState(80);
  const setVolume = useMeloPlayer((s) => s.setVolume);
  const isPlaying = status === 'playing';

  if (!track) return null;

  const cycleQuality = () => {
    const nextQ = QUALITY_ORDER[(QUALITY_ORDER.indexOf(quality) + 1) % QUALITY_ORDER.length];
    setQuality(nextQ!);
  };

  const qualityLabel =
    quality === 'auto' ? (autoSaver ? 'Data Saver: ON' : 'Auto') : quality === 'data_saver' ? 'Data Saver: ON' : quality;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-6xl z-40 px-2">
      <div className="rounded-2xl bg-[#141414]/55 backdrop-blur-2xl backdrop-saturate-150 border border-white/15 px-4 md:px-6 py-3 flex items-center gap-4 md:gap-6 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
        {/* Track Thumbnail & Details */}
        <div className="flex items-center gap-3 w-40 md:w-52 shrink-0">
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-11 h-11 rounded-lg object-cover shadow-md shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
            <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
          </div>
        </div>

        {/* Center Player Controls & Seekbar */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-4 md:gap-5 text-zinc-300">
            <button className="hover:text-white transition-colors hidden sm:block" title="Shuffle">
              <Shuffle className="w-4 h-4" />
            </button>
            <button className="hover:text-white transition-colors" onClick={prev} title="Previous">
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={toggle}
              className="w-10 h-10 rounded-full bg-[#1DB95D] text-black flex items-center justify-center shadow-lg shadow-[#1DB95D]/30 hover:scale-105 transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {status === 'loading' ? (
                <span className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black translate-x-0.5" />
              )}
            </button>

            <button className="hover:text-white transition-colors" onClick={next} title="Next">
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
            <button className="hover:text-[#1DB95D] text-[#1DB95D] transition-colors hidden sm:block" title="Repeat">
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Seekbar */}
          <div className="w-full flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
            <span>{fmt(progress)}</span>
            <input
              type="range"
              min="0"
              max={Math.max(duration, 1)}
              step="0.5"
              value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#1DB95D]"
            />
            <span>{fmt(duration)}</span>
          </div>
          {error && <p className="text-[11px] text-[#FF5722]">{error}</p>}
        </div>

        {/* Right Actions: quality + volume */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <button
            onClick={cycleQuality}
            title={`Streaming quality (click to change). ${bitrate ? `Now ${bitrate} kbps.` : ''}`}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              quality === 'data_saver' || autoSaver
                ? 'bg-[#1DB95D] text-black'
                : 'bg-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            <span>{qualityLabel}</span>
            {bitrate ? <span className="opacity-70">· {bitrate}k</span> : null}
          </button>

          <button
            className="p-2 rounded-full bg-white/10 text-zinc-300 hover:text-white transition-colors"
            onClick={cycleQuality}
            title="Streaming quality settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 w-32">
            <Volume2 className="w-4 h-4 text-zinc-300 shrink-0" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolumeState(v);
                setVolume(v);
              }}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#1DB95D]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
