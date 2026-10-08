'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Mail, MessageSquare } from 'lucide-react';
import { api, setToken, type ApiUser } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Method = 'phone' | 'email';

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const login = useAuth((s) => s.login);
  const [method, setMethod] = useState<Method>('phone');
  const [step, setStep] = useState<'identity' | 'code' | 'name'>('identity');
  const [identity, setIdentity] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState<{ token: string; user: ApiUser } | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const close = () => {
    setStep('identity');
    setCode('');
    setName('');
    setPending(null);
    setDevCode(null);
    setError(null);
    onClose();
  };

  const switchMethod = (m: Method) => {
    setMethod(m);
    setIdentity('');
    setError(null);
  };

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestOtp(identity);
      setDevCode(res.devCode ?? null);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.verifyOtp(identity, code);
      if (!res.user.name) {
        // First sign-in — capture a display name (onboarding).
        setPending({ token: res.accessToken, user: res.user });
        setStep('name');
      } else {
        login(res.accessToken, res.user);
        close();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending || name.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      // Store the session first — the profile update itself requires auth.
      setToken(pending.token);
      const updated = await api.updateProfile({ name: name.trim() });
      login(pending.token, updated);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save name');
    } finally {
      setBusy(false);
    }
  };

  // Portal out of the header: backdrop-blur/sticky ancestors turn into
  // containing blocks for fixed children and push the modal off-screen.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-sm rounded-2xl bg-[#1A1A1A] border border-white/15 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-extrabold text-white">Sign in to Melo</h3>
          <button onClick={close} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-zinc-400 mb-4">One-time code — no password needed.</p>

        {step === 'identity' && (
          <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-xl bg-black/60 border border-white/10">
            {(['phone', 'email'] as Method[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMethod(m)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  method === m ? 'bg-[#1DB95D] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {m === 'phone' ? <Phone className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                {m === 'phone' ? 'Phone' : 'Email'}
              </button>
            ))}
          </div>
        )}

        {step === 'name' ? (
          <form onSubmit={saveName} className="space-y-3">
            <p className="text-xs text-zinc-400">
              Welcome to Melo! What should we call you?
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chioma"
              maxLength={40}
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB95D]"
            />
            <button
              type="submit"
              disabled={busy || name.trim().length < 2}
              className="w-full py-3 rounded-xl bg-[#1DB95D] text-black font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {busy ? 'Saving…' : 'Start listening'}
            </button>
          </form>
        ) : step === 'identity' ? (
          <form onSubmit={requestCode} className="space-y-3">
            <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus-within:border-[#1DB95D]">
              {method === 'phone' ? (
                <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
              ) : (
                <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
              )}
              <input
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder={method === 'phone' ? '+234 801 234 5678' : 'you@example.com'}
                inputMode={method === 'phone' ? 'tel' : 'email'}
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={busy || identity.trim().length < (method === 'phone' ? 7 : 5)}
              className="w-full py-3 rounded-xl bg-[#1DB95D] text-black font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-3">
            <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus-within:border-[#1DB95D]">
              <MessageSquare className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                maxLength={6}
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none tracking-[0.3em]"
              />
            </label>
            {devCode && (
              <p className="text-[11px] text-[#00E5FF]">
                Demo mode — your code is <span className="font-mono font-bold">{devCode}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={busy || code.trim().length < 4}
              className="w-full py-3 rounded-xl bg-[#1DB95D] text-black font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button
              type="button"
              onClick={() => setStep('identity')}
              className="w-full text-xs text-zinc-400 hover:text-white"
            >
              Use a different {method === 'phone' ? 'number' : 'email'}
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-xs text-[#FF5722]">{error}</p>}
      </div>
    </div>,
    document.body,
  );
}
