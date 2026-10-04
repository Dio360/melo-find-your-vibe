// MELO API client (Phase 5). Backend: http://localhost:3001/api/v1
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const TOKEN_KEY = 'melo_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && auth && getToken()) {
    // Session expired or revoked — drop it so the UI falls back to logged-out.
    setToken(null);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ApiUser {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  country: string | null;
}

export const api = {
  requestOtp: (identifier: string) =>
    request<{ ok: boolean; kind: string; expiresIn: number; devCode?: string }>(
      '/auth/otp/request',
      { method: 'POST', body: JSON.stringify({ identifier }) },
      false,
    ),
  verifyOtp: (identifier: string, code: string) =>
    request<{ accessToken: string; user: ApiUser }>(
      '/auth/otp/verify',
      { method: 'POST', body: JSON.stringify({ identifier, code }) },
      false,
    ),
  me: () => request<ApiUser & { preference: unknown }>('/users/me'),
  updateProfile: (dto: { name?: string; avatar?: string; country?: string }) =>
    request<ApiUser>('/users/me', { method: 'PATCH', body: JSON.stringify(dto) }),
  tracks: (params = '') => request<unknown[]>(`/catalogue/tracks${params}`),
  authorize: (trackId: string, quality: string, territory = 'NG') =>
    request<{ allowed: boolean; reason?: string; streamUrl?: string; expiresIn?: number; bitrate?: number }>(
      `/playback/authorize?trackId=${trackId}&quality=${quality}&territory=${territory}`,
    ),
  logEvent: (event: {
    trackId?: string;
    eventType: string;
    position?: number;
    duration?: number;
    network?: string;
  }) => request('/events/listen', { method: 'POST', body: JSON.stringify(event) }).catch(() => null),
  likedTracks: () => request<{ trackId: string }[]>('/library/likes'),
  aiInterpret: (prompt: string) =>
    request<Record<string, unknown>>('/ai/interpret', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
  aiPlaylist: (prompt: string, count = 20) =>
    request<{
      playlist: {
        id: string;
        name: string;
        description: string | null;
        tracks: {
          position: number;
          track: { id: string; title: string; duration: number; artist: { name: string } };
        }[];
      };
      explanation: string;
      fallback: boolean;
    }>('/ai/playlist', { method: 'POST', body: JSON.stringify({ prompt, count }) }),
  likeTrack: (trackId: string) =>
    request('/library/likes/' + trackId, { method: 'POST' }).catch(() => null),
  unlikeTrack: (trackId: string) =>
    request('/library/likes/' + trackId, { method: 'DELETE' }).catch(() => null),
};
