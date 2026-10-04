"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, Sparkles, AudioLines } from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: Home, colorHex: "#1DB95D" },
  { label: "Vibes", href: "/vibes", icon: AudioLines, colorHex: "#FF5722" },
  { label: "Search", href: "/search", icon: Search, colorHex: "#00E5FF" },
  { label: "Library", href: "/library", icon: Library, colorHex: "#FFC107" },
  { label: "AI Discovery", href: "/ai", icon: Sparkles, colorHex: "#1DB95D" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-white/10 bg-[#0E0E0E] h-screen sticky top-0 z-30">
      {/* Brand Header */}
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-full bg-[#1DB95D] shadow-lg shadow-[#1DB95D]/30" />
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="absolute inset-0 w-10 h-10"
            >
              <circle cx="33" cy="13" r="2" fill="#0B0B0B" />
              <path
                d="M11 20c5.5 2.2 11 2.2 16.5-1"
                stroke="#0B0B0B"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M12 25.5c4.8 1.9 9.6 1.9 14.4-.9"
                stroke="#0B0B0B"
                strokeWidth="2.3"
                strokeLinecap="round"
              />
              <path
                d="M13 30.5c4 1.6 8 1.6 12-.7"
                stroke="#0B0B0B"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[24px] leading-none tracking-tight text-white">
                Melo
              </span>
              <span className="text-[10px] font-bold uppercase bg-[#1DB95D]/20 text-[#1DB95D] px-1.5 py-0.5 rounded border border-[#1DB95D]/30">
                Vibe
              </span>
            </div>
            <p className="text-[13px] text-zinc-400 mt-1">Find Your Vibe</p>
          </div>
        </div>
      </div>

      {/* Main Navigation — vibe-pill feel: transparent rows, color fill on select */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="relative flex items-center gap-3.5 px-4 py-3 rounded-lg text-[15px] transition-all duration-300"
              style={{
                color: isActive ? item.colorHex : "#D4D4D8",
                fontWeight: isActive ? 600 : 500,
                background: isActive ? `${item.colorHex}26` : "transparent",
                boxShadow: isActive ? `0 0 18px ${item.colorHex}44` : undefined,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = `${item.colorHex}14`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {isActive && (
                <span
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full"
                  style={{ background: item.colorHex }}
                />
              )}
              <Icon className="w-5 h-5 shrink-0" style={{ color: item.colorHex }} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
