"use client";

import React from "react";

export interface VibeItem {
  id: string;
  name: string;
  emoji: string;
  category: "mood" | "activity" | "context" | "african";
  colorHex: string;
}

interface VibePillProps {
  vibe: VibeItem;
  isSelected: boolean;
  onSelect: (vibe: VibeItem) => void;
}

export function VibePill({ vibe, isSelected, onSelect }: VibePillProps) {
  return (
    <button
      onClick={() => onSelect(vibe)}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
        isSelected
          ? "bg-[#1DB95D] text-black shadow-lg shadow-[#1DB95D]/30 scale-105 font-bold"
          : "bg-white/5 text-zinc-300 border border-white/10 hover:border-white/30 hover:bg-white/10 hover:text-white"
      }`}
      style={{
        boxShadow: isSelected ? `0 0 20px ${vibe.colorHex}55` : undefined,
      }}
    >
      <span className="text-sm">{vibe.emoji}</span>
      <span>{vibe.name}</span>
    </button>
  );
}
