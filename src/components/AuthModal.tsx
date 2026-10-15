'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'signin' | 'signup';

// Beatboxx-style login/signup (Supabase Auth UI look, MELO theme):
// email + password, dark card, green accent, inline errors, loading state.
// OTP is retired from the UI; /auth/otp/* stays live but unoffered.
export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const login = useAuth((s) => s.login);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const googleDiv = useRef<HTMLDivElement>(null);
  const googleCid = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

  if (!open) return null;

  const close = () => {
    setPassword('');
    setError(null);
    setForgotSent(false);
    onClose();
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        tab === 'signup'
          ? await api.register(email.trim(), password, name.trim() || undefined)
          : await api.login(email.trim(), password);
      login(res.accessToken, res.user);
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const valid = /.+@.+\..+/.test(email.trim()) && password.length >= 8;

  // Google Identity Services button (env-gated; hidden until the web client
  // ID exists). Credential goes to /auth/google, same session afterwards.
  useEffect(() => {
    if (!open || !googleCid || !googleDiv.current) return;
    const w = window as unknown as {
      google?: { accounts: { id: { initialize(o: unknown): void; renderButton(el: HTMLElement, o: unknown): void } } };
    };
    const render = () => {
      if (!w.google || !googleDiv.current) return;
      w.google.accounts.id.initialize({
        client_id: googleCid,
        callback: (resp: { credential?: string }) => {
          if (!resp.credential) {
            setError('Google sign-in failed');
            return;
          }
          setBusy(true);
          api
            .googleLogin(resp.credential)
            .then((res) => {
              login(res.accessToken, res.user);
              close();
              router.refresh();
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Google sign-in failed'))
            .finally(() => setBusy(false));
        },
      });
      w.google.accounts.id.renderButton(googleDiv.current, { theme: 'filled_black', size: 'large', width: 320 });
    };
    if (w.google) {
      render();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [open, googleCid, login, router]);

  const forgot = async () => {
    if (!/.+@.+\..+/.test(email.trim())) {
      setError('Enter your email above first');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.forgotPassword(email.trim());
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-sm rounded-2xl bg-[#1A1A1A] border border-white/15 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-extrabold text-white">
            {tab === 'signup' ? 'Create account' : 'Welcome back'}
          </h3>
          <button onClick={close} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          {tab === 'signup' ? 'Sign up to start sharing your vibe' : 'Login to your account'}
        </p>

        <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-xl bg-black/60 border border-white/10">
          {(['signin', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                tab === t ? 'bg-[#1DB95D] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-y-3">
          {tab === 'signup' && (
            <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus-within:border-[#1DB95D]">
              <User className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={40}
                autoComplete="name"
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
            </label>
          )}
          <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus-within:border-[#1DB95D]">
            <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              inputMode="email"
              autoComplete="email"
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus-within:border-[#1DB95D]">
            <Lock className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'signup' ? 'Password (min 8 chars)' : 'Password'}
              type={showPw ? 'text' : 'password'}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className="text-zinc-500 hover:text-white shrink-0"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
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
            {busy ? 'Please wait…' : tab === 'signup' ? 'Create account' : 'Sign in'}
          </button>
          {tab === 'signin' && (
            <button
              type="button"
              onClick={() => void forgot()}
              disabled={busy}
              className="w-full text-xs text-zinc-400 hover:text-white disabled:opacity-40"
            >
              {forgotSent ? 'Reset link sent — check your inbox (15 min, one use).' : 'Forgot password?'}
            </button>
          )}
        </form>
        {googleCid && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-zinc-500">or</span>
              <span className="flex-1 h-px bg-white/10" />
            </div>
            <div ref={googleDiv} className="flex justify-center" />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
