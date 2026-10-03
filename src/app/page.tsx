"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { VibePill, VibeItem } from "@/components/VibePill";
import { AiPromptBar } from "@/components/AiPromptBar";
import { TrackCard, TrackData } from "@/components/TrackCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Compass, Sparkles, Flame, Music, Disc3, ShieldCheck } from "lucide-react";

// Mock Vibe Taxonomy
const mockVibes: VibeItem[] = [
  { id: "v1", name: "Naija Chill", emoji: "🇳🇬", category: "african", colorHex: "#1DB95D" },
  { id: "v2", name: "Lagos Night Drive", emoji: "🌙", category: "context", colorHex: "#00E5FF" },
  { id: "v3", name: "Afrobeat Energy", emoji: "🔥", category: "mood", colorHex: "#FF5722" },
  { id: "v4", name: "Late Night Study", emoji: "📚", category: "activity", colorHex: "#FFC107" },
  { id: "v5", name: "Amapiano Grooves", emoji: "💃", category: "african", colorHex: "#E91E63" },
  { id: "v6", name: "Sunday Morning", emoji: "☀️", category: "context", colorHex: "#FF9800" },
  { id: "v7", name: "Highlife Classics", emoji: "🎺", category: "african", colorHex: "#8BC34A" },
];

// Mock Royalty-Free & Authorized Demo Track Data
const initialTracks: TrackData[] = [
  {
    id: "t1",
    title: "Ojuelegba",
    artist: "Wizkid",
    album: "Ayo",
    coverUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
    vibe: "Naija Chill • Lagos Story",
    region: "Nigeria 🇳🇬",
    duration: "3:36",
    isLiked: true,
  },
  {
    id: "t2",
    title: "Last Last",
    artist: "Burna Boy",
    album: "Love, Damini",
    coverUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    vibe: "Afrobeat Energy • Emotion",
    region: "Nigeria 🇳🇬",
    duration: "2:52",
    isLiked: false,
  },
  {
    id: "t3",
    title: "Sungba (Remix)",
    artist: "Asake ft. Burna Boy",
    album: "Ololade Asake",
    coverUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
    vibe: "Street Vibe • High Energy",
    region: "Nigeria 🇳🇬",
    duration: "3:30",
    isLiked: true,
  },
  {
    id: "t4",
    title: "Free Mind",
    artist: "Tems",
    album: "For Broken Ears",
    coverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
    vibe: "Late Night Study • Soulful",
    region: "Nigeria 🇳🇬",
    duration: "4:07",
    isLiked: false,
  },
  {
    id: "t5",
    title: "Calm Down",
    artist: "Rema",
    album: "Rave & Roses",
    coverUrl:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&auto=format&fit=crop&q=80",
    vibe: "Afrorave • Romance",
    region: "Nigeria 🇳🇬",
    duration: "3:39",
    isLiked: true,
  },
  {
    id: "t6",
    title: "Unavailable",
    artist: "Davido ft. Musa Keys",
    album: "Timeless",
    coverUrl:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80",
    vibe: "Amapiano • Party Energy",
    region: "Nigeria / SA 🇿🇦",
    duration: "2:50",
    isLiked: false,
  },
];

export default function HomePage() {
  const [selectedVibe, setSelectedVibe] = useState<string>("v1");
  const [dataSaver, setDataSaver] = useState<boolean>(true);
  const [currentTrack, setCurrentTrack] = useState<TrackData | null>(initialTracks[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [tracks, setTracks] = useState<TrackData[]>(initialTracks);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const handleSelectVibe = (vibe: VibeItem) => {
    setSelectedVibe(vibe.id);
    setAiNotice(`Vibe Filter Active: ${vibe.emoji} ${vibe.name}`);
  };

  const handlePlayTrack = (track: TrackData) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleLikeTrack = (track: TrackData) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isLiked: !t.isLiked } : t))
    );
  };

  const handleAiSearch = (prompt: string) => {
    setAiNotice(`AI Request Parsed: "${prompt}". Filtering catalogue vibes...`);
  };

  return (
    <div className="flex min-h-screen bg-[#121212]">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-36 md:pb-28">
        <Header
          dataSaverEnabled={dataSaver}
          onToggleDataSaver={() => setDataSaver(!dataSaver)}
        />

        <main className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Hero / Greeting Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Good Evening, <span className="text-[#1DB95D]">Find Your Vibe</span>
              </h2>
              <p className="text-xs md:text-sm text-zinc-400 mt-1">
                Discover music by feeling, context, and African culture — affordably and reliably.
              </p>
            </div>

            {/* Data Saver Mode Notice Badge */}
            {dataSaver && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1DB95D]/10 border border-[#1DB95D]/30 text-[#1DB95D] text-xs font-semibold shrink-0">
                <ShieldCheck className="w-4 h-4" />
                <span>Data Saver Active (Low Bandwidth Optimized)</span>
              </div>
            )}
          </div>

          {/* Vibe Pills Filter Bar */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Compass className="w-4 h-4 text-[#1DB95D]" />
                <span>Choose Your Current Vibe</span>
              </div>
              <span className="text-xs text-zinc-400">7 Vibes Available</span>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
              {mockVibes.map((vibe) => (
                <VibePill
                  key={vibe.id}
                  vibe={vibe}
                  isSelected={selectedVibe === vibe.id}
                  onSelect={handleSelectVibe}
                />
              ))}
            </div>
          </section>

          {/* AI Search & Playlist Generator Component */}
          <section>
            <AiPromptBar onSearchAi={handleAiSearch} />
          </section>

          {/* AI Notification Alert if Active */}
          {aiNotice && (
            <div className="p-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-medium flex items-center justify-between">
              <span>{aiNotice}</span>
              <button
                onClick={() => setAiNotice(null)}
                className="text-zinc-400 hover:text-white text-xs underline"
              >
                Clear
              </button>
            </div>
          )}

          {/* African Spotlight Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Flame className="w-5 h-5 text-[#FF5722]" />
                <span>African Spotlight & Trending Vibes</span>
              </div>
              <button className="text-xs text-[#1DB95D] hover:underline font-semibold">
                See All
              </button>
            </div>

            {/* Track Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                  onPlay={handlePlayTrack}
                  onLike={handleLikeTrack}
                />
              ))}
            </div>
          </section>

          {/* Emerging African Artists Discovery Section */}
          <section className="rounded-2xl bg-gradient-to-r from-[#1E1E1E] to-[#181818] border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC107]/20 text-[#FFC107] text-xs font-bold border border-[#FFC107]/30">
                <Disc3 className="w-3.5 h-3.5" />
                <span>Emerging Artist Spotlight</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                Discover Underground African Talent Before They Go Mainstream
              </h3>
              <p className="text-xs text-zinc-400 max-w-xl">
                Melo balances popular hits with 40% emerging African indie artists so you always discover fresh, authentic vibes.
              </p>
            </div>

            <button className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#FFC107] text-black font-extrabold text-xs hover:opacity-90 transition-all shadow-lg shrink-0">
              Discover New Artists
            </button>
          </section>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Persistent Audio Player */}
      <AudioPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        dataSaverEnabled={dataSaver}
      />
    </div>
  );
}
