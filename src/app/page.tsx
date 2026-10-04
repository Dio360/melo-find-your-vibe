"use client";

import React, { useState } from "react";
import { Compass } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { VibePill, VibeItem } from "@/components/VibePill";
import { AiPromptBar } from "@/components/AiPromptBar";
import { TrackCard, TrackData } from "@/components/TrackCard";
import { AudioPlayer } from "@/components/AudioPlayer";

// Vibe taxonomy — matches melo_ui_design_system_1791043062298 mockup
const mockVibes: VibeItem[] = [
  { id: "v1", name: "Naija Chill", category: "african", colorHex: "#00E5FF" },
  { id: "v2", name: "Lagos Night Drive", category: "context", colorHex: "#FF5722" },
  { id: "v3", name: "Afrobeat Energy", category: "mood", colorHex: "#FFC107" },
  { id: "v4", name: "Late Night Study", category: "activity", colorHex: "#1DB95D" },
];

// Track grid — matches melo_ui_design_system_1791043062298 mockup
const initialTracks: TrackData[] = [
  {
    id: "t1",
    title: "Rave & Roses",
    artist: "Rema",
    album: "Rave & Roses",
    coverUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
    vibe: "Naija Chill",
    region: "Nigeria",
    duration: "3:10",
    isLiked: false,
    borderColor: "#1DB95D",
  },
  {
    id: "t2",
    title: "Love, Damini",
    artist: "Burna Boy",
    album: "Love, Damini",
    coverUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    vibe: "Afrobeat Energy",
    region: "Nigeria",
    duration: "3:10",
    isLiked: false,
    borderColor: "#FF5722",
  },
  {
    id: "t3",
    title: "Made In Lagos",
    artist: "Wizkid",
    album: "Made In Lagos",
    coverUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
    vibe: "Naija Chill",
    region: "Nigeria",
    duration: "3:10",
    isLiked: false,
    borderColor: "#E8DCC8",
  },
  {
    id: "t4",
    title: "Timeless",
    artist: "Davido",
    album: "Timeless",
    coverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
    vibe: "Afrobeat Energy",
    region: "Nigeria",
    duration: "3:10",
    isLiked: false,
    borderColor: "#00E5FF",
  },
  {
    id: "t5",
    title: "For Broken Ears",
    artist: "Tems",
    album: "For Broken Ears",
    coverUrl:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&auto=format&fit=crop&q=80",
    vibe: "Late Night Study",
    region: "Nigeria",
    duration: "3:10",
    isLiked: false,
    borderColor: "#FF9800",
  },
];

const nowPlayingDefault: TrackData = {
  id: "now-playing",
  title: "Ojuelegba",
  artist: "Wizkid",
  album: "Ayo",
  coverUrl:
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
  vibe: "Naija Chill",
  region: "Nigeria",
  duration: "3:10",
  isLiked: false,
};

export default function HomePage() {
  const [userName] = useState<string>("Chioma");
  const [selectedVibe, setSelectedVibe] = useState<string>("v1");
  const [dataSaver, setDataSaver] = useState<boolean>(true);
  const [currentTrack, setCurrentTrack] = useState<TrackData | null>(nowPlayingDefault);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [tracks, setTracks] = useState<TrackData[]>(initialTracks);

  const handleSelectVibe = (vibe: VibeItem) => {
    setSelectedVibe(vibe.id);
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
    console.log("AI search prompt:", prompt);
  };

  return (
    <div className="flex min-h-screen bg-[#121212]">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-32">
        <Header
          dataSaverEnabled={dataSaver}
          onToggleDataSaver={() => setDataSaver(!dataSaver)}
        />

        <main className="flex-1 px-6 md:px-10 py-2 space-y-6 max-w-7xl mx-auto w-full">
          {/* Hero / Greeting Header — matches mockup */}
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Good Evening, <span className="text-[#1DB95D]">{userName}</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-2">
              Discover music by feeling, context, and African culture — affordably and reliably.
            </p>
          </div>

          {/* Vibe Pills Filter Bar — matches mockup */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Compass className="w-4 h-4 text-[#1DB95D]" />
              <span>Choose Your Current Vibe</span>
            </div>
            <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
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

          {/* AI prompt bar — matches mockup single gradient input */}
          <AiPromptBar onSearchAi={handleAiSearch} />

          {/* Track grid — matches mockup 5-card row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 pt-2">
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
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Floating glass player — matches mockup */}
      <AudioPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />
    </div>
  );
}
