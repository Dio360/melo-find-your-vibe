'use client';

import React, { useState } from 'react';
import { X, Phone, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const login = useAuth((s) => s.login);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const close = () => {
    setStep('phone');
    setCode('');
    setDevCode(null);
    setError(null);
    onClose();
  };

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestOtp(phone);
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
      const res = await api.verifyOtp(phone, code);
      login(res.accessToken, res.user);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#1A1A1A] border border-white/15 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-extrabold text-white">Sign in to Melo</h3>
          <button onClick={close} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-zinc-400 mb-5">Phone OTP — no password needed.</p>

        {step === 'phone' ? (
          <form onSubmit={requestCode} className="space-y-3">
            <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus-within:border-[#1DB95D]">
              <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 801 234 5678"
                inputMode="tel"
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={busy || phone.trim().length < 7}
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
              onClick={() => setStep('phone')}
              className="w-full text-xs text-zinc-400 hover:text-white"
            >
              Use a different number
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-xs text-[#FF5722]">{error}</p>}
      </div>
    </div>
  );
}
