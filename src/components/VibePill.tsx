"use client";

import React from "react";

export interface VibeItem {
  id: string;
  name: string;
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
      className="inline-flex items-center px-5 py-2.5 rounded-full text-sm whitespace-nowrap transition-all duration-300 cursor-pointer"
      style={{
        border: `1px solid ${vibe.colorHex}`,
        color: isSelected ? "#101010" : vibe.colorHex,
        fontWeight: isSelected ? 700 : 500,
        background: isSelected ? vibe.colorHex : "transparent",
        boxShadow: isSelected
          ? `0 0 26px ${vibe.colorHex}88`
          : `0 0 10px ${vibe.colorHex}1F`,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = `${vibe.colorHex}14`;
          e.currentTarget.style.boxShadow = `0 0 16px ${vibe.colorHex}44`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.boxShadow = `0 0 10px ${vibe.colorHex}1F`;
        }
      }}
    >
      <span>{vibe.name}</span>
    </button>
  );
}
