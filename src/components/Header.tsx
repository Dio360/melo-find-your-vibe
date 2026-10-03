"use client";

import React from "react";
import { Search, Bell, User, Zap } from "lucide-react";

interface HeaderProps {
  onToggleDataSaver: () => void;
  dataSaverEnabled: boolean;
}

export function Header({ onToggleDataSaver, dataSaverEnabled }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 py-4 px-6 md:px-8 border-b border-white/5 bg-[#121212]/80 backdrop-blur-md sticky top-0 z-20">
      {/* Search Input Bar */}
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search tracks, artists, vibes, or African genres..."
          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB95D] focus:ring-1 focus:ring-[#1DB95D] transition-all"
        />
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Data Saver Mode Toggle Button */}
        <button
          onClick={onToggleDataSaver}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            dataSaverEnabled
              ? "bg-[#1DB95D]/20 text-[#1DB95D] border-[#1DB95D]/40 shadow-sm shadow-[#1DB95D]/20"
              : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
          }`}
          title="Data Saver mode optimizes audio bitrate for weak connections"
        >
          <Zap className={`w-3.5 h-3.5 ${dataSaverEnabled ? "fill-[#1DB95D] text-[#1DB95D]" : ""}`} />
          <span>Data Saver: {dataSaverEnabled ? "ON" : "OFF"}</span>
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all">
          <Bell className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF5722] to-[#FFC107] flex items-center justify-center text-black font-bold text-xs shadow-md">
            <User className="w-4 h-4 text-black" />
          </div>
          <span className="hidden sm:inline text-xs font-semibold text-zinc-200">Listener</span>
        </div>
      </div>
    </header>
  );
}
