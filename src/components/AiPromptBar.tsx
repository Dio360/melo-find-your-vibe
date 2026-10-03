"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, Mic, Flame } from "lucide-react";

interface AiPromptBarProps {
  onSearchAi: (query: string) => void;
}

const suggestedPrompts = [
  "Give me calm Nigerian music for studying tonight",
  "Afrobeats house party playlist for Lagos night",
  "Naija old-school classics like Fela & TuBaba",
  "Energetic Amapiano beats for workout session",
];

export function AiPromptBar({ onSearchAi }: AiPromptBarProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSearchAi(prompt);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-white/[0.07] via-white/[0.03] to-white/[0.07] border border-white/10 p-5 md:p-6 backdrop-blur-xl relative overflow-hidden shadow-2xl">
      {/* Decorative gradient glow */}
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#00E5FF]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-[#FF5722]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-[#00E5FF] animate-pulse" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Melo AI Music Intelligence
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">
          P0 Feature
        </span>
      </div>

      <p className="text-xs text-zinc-400 mb-4">
        Describe what you feel or what you are doing in plain language. Melo interprets your vibe and builds a playlist from eligible catalogue tracks.
      </p>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="relative mb-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. 'I want something calm like Burna Boy, but introduce me to emerging artists...'"
          className="w-full pl-4 pr-24 py-3.5 rounded-xl bg-black/60 border border-[#00E5FF]/30 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all shadow-inner"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <button
            type="button"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            title="Voice Search"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#1DB95D] text-black font-bold text-xs hover:opacity-90 transition-all shadow-md"
          >
            <span>Ask</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Suggested prompts carousel */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
        <span className="text-[11px] font-medium text-zinc-400 shrink-0 flex items-center gap-1">
          <Flame className="w-3 h-3 text-[#FF5722]" /> Try prompt:
        </span>
        {suggestedPrompts.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(item);
              onSearchAi(item);
            }}
            className="shrink-0 text-[11px] text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 px-3 py-1 rounded-full transition-all"
          >
            "{item}"
          </button>
        ))}
      </div>
    </div>
  );
}
