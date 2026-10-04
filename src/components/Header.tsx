"use client";

import React from "react";
import { Bell, User, Zap } from "lucide-react";

interface HeaderProps {
  onToggleDataSaver: () => void;
  dataSaverEnabled: boolean;
}

export function Header({ onToggleDataSaver, dataSaverEnabled }: HeaderProps) {
  return (
    <header className="flex items-center justify-end gap-3 py-4 px-6 md:px-10 sticky top-0 z-20 bg-[#121212]/80 backdrop-blur-md">
      {/* Data Saver toggle pill */}
      <button
        onClick={onToggleDataSaver}
        title="Data Saver mode optimizes audio bitrate for weak connections"
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
          dataSaverEnabled
            ? "bg-[#1DB95D] text-black shadow-lg shadow-[#1DB95D]/30"
            : "bg-white/10 text-zinc-300 hover:text-white"
        }`}
      >
        <Zap className={`w-3.5 h-3.5 ${dataSaverEnabled ? "fill-black" : ""}`} />
        <span>Data Saver: {dataSaverEnabled ? "ON" : "OFF"}</span>
      </button>

      {/* Notifications */}
      <button
        className="p-2.5 rounded-full bg-white/5 text-zinc-300 hover:text-white transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
      </button>

      {/* User Profile */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF5722] to-[#FFC107] flex items-center justify-center shadow-md">
          <User className="w-4 h-4 text-black" />
        </div>
        <span className="hidden sm:inline text-sm font-medium text-white">Listener</span>
      </div>
    </header>
  );
}
