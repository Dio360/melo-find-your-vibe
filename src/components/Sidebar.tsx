"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Search, Library, Sparkles, Music2, Flame } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Vibes", href: "#vibes", icon: Compass },
  { label: "Search", href: "#search", icon: Search },
  { label: "Library", href: "#library", icon: Library },
  { label: "AI Discovery", href: "#ai", icon: Sparkles, badge: "AI" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-[#121212] p-6 h-screen sticky top-0 z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1DB95D] via-[#00E5FF] to-[#FF5722] p-0.5 flex items-center justify-center shadow-lg shadow-[#1DB95D]/20">
          <div className="w-full h-full bg-[#121212] rounded-[10px] flex items-center justify-center">
            <Flame className="w-6 h-6 text-[#1DB95D]" />
          </div>
        </div>
        <div>
          <h1 className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
            MELO <span className="text-[10px] uppercase bg-[#1DB95D]/20 text-[#1DB95D] px-1.5 py-0.5 rounded font-bold border border-[#1DB95D]/30">Vibe</span>
          </h1>
          <p className="text-[11px] text-zinc-400 font-medium">Find Your Vibe</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? "bg-[#1DB95D] text-black font-bold shadow-lg shadow-[#1DB95D]/25"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Icon className={`w-5 h-5 ${isActive ? "text-black" : "text-zinc-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#FF5722] text-black">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Quick Vibe Feature Card */}
      <div className="mt-auto p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#1DB95D]/20 rounded-full blur-xl group-hover:bg-[#1DB95D]/30 transition-all" />
        <div className="flex items-center gap-2 mb-2">
          <Music2 className="w-4 h-4 text-[#1DB95D]" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">African Discovery</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed mb-3">
          Discover emerging Nigerian & African sounds curated by mood & context.
        </p>
        <button className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-[#1DB95D] hover:text-black text-white text-xs font-semibold transition-all">
          Explore Vibes
        </button>
      </div>
    </aside>
  );
}
