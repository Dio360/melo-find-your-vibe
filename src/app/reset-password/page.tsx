'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (password !== confirm) throw new Error('Passwords do not match');
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return <p className="text-xs text-zinc-400">This link is incomplete — request a fresh one from the sign-in form.</p>;
  }
  if (done) {
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="w-10 h-10 text-[#1DB95D] mx-auto" />
        <p className="text-sm text-white font-bold">Password updated</p>
        <p className="text-xs text-zinc-400">Sign in with your new password.</p>
        <Link href="/" className="inline-block text-xs text-[#1DB95D] underline">
          Back to home
        </Link>
      </div>
    );
  }
  const valid = password.length >= 8 && confirm.length >= 8;
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus-within:border-[#1DB95D]">
        <Lock className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min 8 chars)"
          type="password"
          autoComplete="new-password"
          className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus-within:border-[#1DB95D]">
        <Lock className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          type="password"
          autoComplete="new-password"
          className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
        />
      </label>
      {error && (
        <p className="px-4 py-2.5 rounded-xl bg-[#FF5722]/10 border border-[#FF5722]/30 text-xs text-[#FF8A65]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !valid}
        className="w-full py-3 rounded-xl bg-[#1DB95D] text-black font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {busy ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#1A1A1A] border border-white/15 p-6 shadow-2xl">
        <h3 className="text-lg font-extrabold text-white mb-1">Reset password</h3>
        <p className="text-xs text-zinc-400 mb-4">Links expire after 15 minutes and work once.</p>
        <Suspense fallback={<p className="text-xs text-zinc-500">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
