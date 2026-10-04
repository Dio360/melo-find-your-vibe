"use client";

import React, { useState } from "react";

interface AiPromptBarProps {
  onSearchAi: (query: string) => void;
}

export function AiPromptBar({ onSearchAi }: AiPromptBarProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSearchAi(prompt);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded-2xl p-[1.5px] shadow-[0_0_24px_rgba(29,185,93,0.25),0_0_24px_rgba(255,87,34,0.2)]"
      style={{
        background: "linear-gradient(90deg, #1DB95D 0%, #00E5FF 50%, #FF5722 100%)",
      }}
    >
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask Melo: Give me calm Nigerian music for studying tonight..."
        className="w-full px-6 py-4 rounded-2xl bg-[#0A0A0A]/95 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
      />
    </form>
  );
}
