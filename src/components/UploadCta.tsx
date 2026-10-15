'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

// Shared "add your music" entry point (Beatboxx plus-button pattern):
// drops the user into /upload from Home, Vibes, Search, Library.
export function UploadCta({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href="/upload"
        title="Upload your song"
        aria-label="Upload your song"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1DB95D] text-black text-xs font-bold hover:opacity-90"
      >
        <Plus className="w-3.5 h-3.5" />
        Upload
      </Link>
    );
  }
  return (
    <Link
      href="/upload"
      className="flex items-center gap-3 p-4 rounded-xl bg-[#1DB95D]/10 border border-[#1DB95D]/30 hover:bg-[#1DB95D]/15 transition-colors"
    >
      <span className="w-10 h-10 rounded-full bg-[#1DB95D] text-black flex items-center justify-center shrink-0">
        <Plus className="w-5 h-5" />
      </span>
      <span>
        <span className="block text-sm font-bold text-white">Add your song or album</span>
        <span className="block text-xs text-zinc-400">
          Upload MP3s — they go live after a quick rights review.
        </span>
      </span>
    </Link>
  );
}
