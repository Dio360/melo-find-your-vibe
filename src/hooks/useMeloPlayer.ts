'use client';

import { create } from 'zustand';
import { api, getToken } from '@/lib/api';
import type { TrackData } from '@/components/TrackCard';

export type Quality = 'data_saver' | 'balanced' | 'high' | 'auto';
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

const QUALITY_KEY = 'melo_quality';
const SESSION_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : String(Date.now());

let audio: HTMLAudioElement | null = null;
function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'metadata';
  }
  return audio;
}

function networkType(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  if (!conn) return 'unknown';
  if (conn.saveData) return 'save-data';
  return conn.effectiveType ?? 'unknown';
}

function isSlowNetwork(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  if (!conn) return false;
  return conn.saveData === true || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
}

function loadQuality(): Quality {
  if (typeof window === 'undefined') return 'auto';
  const saved = window.localStorage.getItem(QUALITY_KEY);
  return saved === 'data_saver' || saved === 'balanced' || saved === 'high' ? saved : 'auto';
}

interface PlayerState {
  queue: TrackData[];
  index: number;
  track: TrackData | null;
  status: PlayerStatus;
  progress: number;
  duration: number;
  quality: Quality;
  bitrate: number | null;
  autoSaver: boolean;
  error: string | null;
  needsAuth: boolean;
  playQueue: (tracks: TrackData[], index: number) => Promise<void>;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setQuality: (q: Quality) => void;
  setVolume: (v: number) => void;
  clearNeedsAuth: () => void;
  initNetwork: () => () => void;
}

async function resolveAndPlay(track: TrackData, quality: Quality, set: (p: Partial<PlayerState>) => void, get: () => PlayerState) {
  const effective = quality === 'auto' ? (isSlowNetwork() ? 'data_saver' : 'balanced') : quality;
  set({ status: 'loading', error: null });
  try {
    const res = await api.authorize(track.id, effective);
    if (!res.allowed || !res.streamUrl) {
      set({
        status: 'error',
        error:
          res.reason === 'not-licensed'
            ? "This track isn't licensed for your region right now."
            : "This track isn't available right now.",
      });
      return;
    }
    const el = getAudio();
    el.src = res.streamUrl;
    set({ bitrate: res.bitrate ?? null, autoSaver: effective === 'data_saver' });
    await el.play();
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : 'Playback failed' });
  }
}

export const useMeloPlayer = create<PlayerState>()((set, get) => {
  if (typeof window !== 'undefined') {
    const el = getAudio();
    el.addEventListener('playing', () => {
      set({ status: 'playing' });
      const t = get().track;
      void api.logEvent({ trackId: t?.id, eventType: 'play', network: networkType() });
    });
    el.addEventListener('pause', () => {
      if (get().status === 'playing') {
        set({ status: 'paused' });
        const t = get().track;
        void api.logEvent({
          trackId: t?.id,
          eventType: 'pause',
          position: Math.floor(el.currentTime),
          duration: Math.floor(el.duration || 0),
        });
      }
    });
    el.addEventListener('ended', () => {
      const t = get().track;
      void api.logEvent({ trackId: t?.id, eventType: 'complete', network: networkType() });
      get().next();
    });
    el.addEventListener('timeupdate', () => {
      set({ progress: el.currentTime, duration: el.duration || get().duration });
    });
    el.addEventListener('loadedmetadata', () => {
      set({ duration: el.duration || 0 });
    });
    el.addEventListener('error', () => {
      set({ status: 'error', error: 'Audio failed to load. Check your connection.' });
    });
  }

  return {
    queue: [],
    index: -1,
    track: null,
    status: 'idle',
    progress: 0,
    duration: 0,
    quality: loadQuality(),
    bitrate: null,
    autoSaver: false,
    error: null,
    needsAuth: false,

    playQueue: async (tracks, index) => {
      if (!getToken()) {
        set({ queue: tracks, index, needsAuth: true });
        return;
      }
      const current = get();
      if (current.track?.id === tracks[index]?.id) {
        get().toggle();
        return;
      }
      if (current.track && current.status === 'playing') {
        void api.logEvent({ trackId: current.track.id, eventType: 'skip', network: networkType() });
      }
      set({ queue: tracks, index, track: tracks[index] ?? null, progress: 0, duration: 0 });
      const track = tracks[index];
      if (track) await resolveAndPlay(track, get().quality, set, get);
    },

    toggle: () => {
      const el = getAudio();
      const { status } = get();
      if (status === 'playing') el.pause();
      else if (status === 'paused') void el.play();
      else if (get().track) void resolveAndPlay(get().track!, get().quality, set, get);
    },

    next: () => {
      const { queue, index, track, status } = get();
      if (track && status === 'playing') {
        void api.logEvent({ trackId: track.id, eventType: 'skip', network: networkType() });
      }
      if (queue.length === 0) return;
      const nextIndex = (index + 1) % queue.length;
      const nextTrack = queue[nextIndex];
      set({ index: nextIndex, track: nextTrack, progress: 0, duration: 0 });
      void resolveAndPlay(nextTrack, get().quality, set, get);
    },

    prev: () => {
      const { queue, index } = get();
      if (queue.length === 0) return;
      const prevIndex = (index - 1 + queue.length) % queue.length;
      const prevTrack = queue[prevIndex];
      set({ index: prevIndex, track: prevTrack, progress: 0, duration: 0 });
      void resolveAndPlay(prevTrack, get().quality, set, get);
    },

    seek: (seconds) => {
      const el = getAudio();
      el.currentTime = Math.max(0, Math.min(seconds, el.duration || seconds));
      set({ progress: el.currentTime });
    },

    setQuality: (q) => {
      window.localStorage.setItem(QUALITY_KEY, q);
      set({ quality: q });
      const { track, status } = get();
      if (track && (status === 'playing' || status === 'paused')) {
        const el = getAudio();
        const pos = el.currentTime;
        void (async () => {
          await resolveAndPlay(track, q, set, get);
          getAudio().currentTime = pos;
        })();
      }
    },

    clearNeedsAuth: () => set({ needsAuth: false }),

    setVolume: (v) => {
      getAudio().volume = Math.max(0, Math.min(100, v)) / 100;
    },

    initNetwork: () => {
      if (typeof navigator === 'undefined') return () => undefined;
      const conn = (navigator as Navigator & { connection?: { addEventListener?: (t: string, f: () => void) => void; removeEventListener?: (t: string, f: () => void) => void } }).connection;
      if (!conn?.addEventListener) return () => undefined;
      const onChange = () => {
        const slow = isSlowNetwork();
        set({ autoSaver: slow && get().quality === 'auto' });
        if (slow && get().quality === 'auto' && get().status === 'playing') {
          const t = get().track;
          if (t) {
            const pos = getAudio().currentTime;
            void (async () => {
              await resolveAndPlay(t, 'auto', set, get);
              getAudio().currentTime = pos;
            })();
          }
        }
      };
      conn.addEventListener('change', onChange);
      onChange();
      return () => conn.removeEventListener?.('change', onChange);
    },
  };
});
