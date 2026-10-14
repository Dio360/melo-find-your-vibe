'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { AuthModal } from '@/components/AuthModal';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface PendingTrack {
  id: string;
  title: string;
  status: string;
  artist: { id: string; name: string };
  album: { id: string; title: string } | null;
  rights: { territory: string; streamingAllowed: boolean; status: string }[];
}

// Admin review queue (stack v2). Server enforces ADMIN_EMAILS; this page
// only renders the queue. Non-admins see the 403 message from the API.
export default function AdminPage() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const init = useAuth((s) => s.init);
  const [items, setItems] = useState<PendingTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setShowAuth(true);
      return;
    }
    api
      .adminPending()
      .then((list) => setItems(list as PendingTrack[]))
      .catch((e) => setError(e instanceof Error ? e.message : 'Admin access required'));
  }, [ready, user]);

  const decide = async (id: string, approveIt: boolean) => {
    setBusy(id);
    try {
      if (approveIt) await api.adminApprove(id);
      else await api.adminReject(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#121212]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-32">
        <Header dataSaverEnabled={false} onToggleDataSaver={() => undefined} />
        <main className="flex-1 px-6 md:px-10 py-2 space-y-6 max-w-4xl mx-auto w-full">
          <h2 className="text-2xl font-extrabold text-white">Admin — pending uploads</h2>
          <p className="text-xs text-zinc-400">
            Tracks stay unplayable until approved (rights gate requires active track + active
            right + ready asset). Approving flips all three; rejecting keeps the files but
            blocks streaming.
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {!error && items.length === 0 && (
            <p className="text-xs text-zinc-500">Queue is empty — nothing awaiting review.</p>
          )}
          <div className="space-y-3">
            {items.map((t) => (
              <div key={t.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm font-bold text-white">{t.title}</p>
                <p className="text-xs text-zinc-400">
                  {t.artist.name}
                  {t.album ? ` — ${t.album.title}` : ''} · {t.status}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    disabled={busy === t.id}
                    onClick={() => void decide(t.id, true)}
                    className="px-4 py-2 rounded-lg bg-[#1DB95D] text-black text-xs font-bold disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy === t.id}
                    onClick={() => void decide(t.id, false)}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-bold disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Link href="/" className="text-xs text-zinc-400 underline">
            Back home
          </Link>
        </main>
      </div>
      <BottomNav />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
