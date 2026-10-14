'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { AuthModal } from '@/components/AuthModal';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const MOODS = ['worship', 'praise', 'prayer', 'bible-study'];

// User uploads (stack v2, Christian-first). Files go straight to R2 via a
// presigned PUT; complete() mints a pending_review track that an admin must
// approve before it can play. A rights declaration is required — uploads
// without ownership proof stay out of the catalogue.
export default function UploadPage() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const init = useAuth((s) => s.init);
  const [showAuth, setShowAuth] = useState(false);
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [rights, setRights] = useState('');
  const [moods, setMoods] = useState<string[]>(['worship']);
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (ready && !user) setShowAuth(true);
  }, [ready, user]);

  const toggleMood = (m: string) =>
    setMoods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const submit = async () => {
    if (!file) {
      setNotice('Choose an MP3 file first.');
      return;
    }
    if (file.type !== 'audio/mpeg') {
      setNotice('Only MP3 files are accepted.');
      return;
    }
    if (!title.trim() || !artistName.trim()) {
      setNotice('Title and artist name are required.');
      return;
    }
    const secs = Number(duration);
    if (!Number.isFinite(secs) || secs <= 0 || secs > 3600) {
      setNotice('Duration must be 1..3600 seconds.');
      return;
    }
    if (rights.trim().length < 10) {
      setNotice('Tell us who owns this recording and why you may share it (min 10 chars).');
      return;
    }
    setBusy(true);
    setNotice('Uploading…');
    try {
      const presigned = await api.presignUpload('audio/mpeg');
      const put = await fetch(presigned.audioUploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: file,
      });
      if (!put.ok) throw new Error(`R2 upload failed (HTTP ${put.status})`);
      const done = await api.completeUpload({
        uploadId: presigned.uploadId,
        audioKey: presigned.audioKey,
        title: title.trim(),
        artistName: artistName.trim(),
        albumTitle: albumTitle.trim() || undefined,
        duration: Math.round(secs),
        genre: 'Gospel',
        moods,
        source: 'user-upload',
        rightsDeclaration: rights.trim(),
      });
      setNotice(`Submitted for review (track ${done.trackId}). It will appear after admin approval.`);
      setTitle('');
      setArtistName('');
      setAlbumTitle('');
      setDuration('');
      setRights('');
      setFile(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#121212]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-32">
        <Header dataSaverEnabled={false} onToggleDataSaver={() => undefined} />
        <main className="flex-1 px-6 md:px-10 py-2 space-y-5 max-w-2xl mx-auto w-full">
          <h2 className="text-2xl font-extrabold text-white">Upload your song</h2>
          <p className="text-xs text-zinc-400">
            MP3 only. Your track stays private until an admin reviews the rights declaration
            and approves it.
          </p>
          {notice && (
            <p className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-200">
              {notice}
            </p>
          )}
          <label className="block text-xs text-zinc-400">
            Audio file (MP3)
            <input
              type="file"
              accept="audio/mpeg,.mp3"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-xs text-zinc-200"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Artist name
            <input
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Album (optional — a pending album is created if new)
            <input
              value={albumTitle}
              onChange={(e) => setAlbumTitle(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Duration (seconds)
            <input
              value={duration}
              inputMode="numeric"
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="text-xs text-zinc-400">
            Moods
            <div className="flex flex-wrap gap-2 mt-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMood(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                    moods.includes(m)
                      ? 'bg-[#1DB95D] text-black border-[#1DB95D]'
                      : 'bg-white/5 text-zinc-300 border-white/10'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-xs text-zinc-400">
            Rights declaration (required)
            <textarea
              value={rights}
              onChange={(e) => setRights(e.target.value)}
              rows={3}
              placeholder="e.g. I recorded this song, I own the master, and I grant MELO streaming rights in Nigeria."
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            disabled={busy}
            onClick={() => void submit()}
            className="px-5 py-2.5 rounded-lg bg-[#1DB95D] text-black text-sm font-bold disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Submit for review'}
          </button>
          <Link href="/" className="block text-xs text-zinc-400 underline">
            Back home
          </Link>
        </main>
      </div>
      <BottomNav />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
