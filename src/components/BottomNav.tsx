"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Search, Library, Sparkles } from "lucide-react";

const mobileItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Vibes", href: "/vibes", icon: Compass },
  { label: "Search", href: "/search", icon: Search },
  { label: "AI", href: "/ai", icon: Sparkles },
  { label: "Library", href: "/library", icon: Library },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-lg border-t border-white/10 px-4 py-2">
      <div className="flex items-center justify-around">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                isActive ? "text-[#1DB95D] font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
