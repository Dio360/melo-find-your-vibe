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
  likedTracks: () =>
    request<{ track: { id: string; title: string; artist: { name: string } } }[]>(
      '/library/likes',
    ),
  followedArtists: () =>
    request<{ artist: { id: string; name: string; country: string | null } }[]>('/library/artists'),
  followArtist: (artistId: string) =>
    request(`/library/artists/${artistId}`, { method: 'POST' }).catch(() => null),
  unfollowArtist: (artistId: string) =>
    request(`/library/artists/${artistId}`, { method: 'DELETE' }).catch(() => null),
  recentPlays: () => request<unknown[]>('/library/recent'),
  myPlaylists: () =>
    request<{ id: string; name: string; description: string | null; _count: { tracks: number } }[]>(
      '/playlists/mine',
    ),
  createPlaylist: (name: string) =>
    request<{ id: string; name: string }>('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  deletePlaylist: (id: string) =>
    request(`/playlists/${id}`, { method: 'DELETE' }).catch(() => null),
  playlistDetail: (id: string) =>
    request<{
      id: string;
      name: string;
      description: string | null;
      tracks: { track: { id: string; title: string; duration?: number; artist: { id: string; name: string } } }[];
    }>(`/playlists/${id}`),
  artistDetail: (id: string) =>
    request<{
      id: string;
      name: string;
      bio: string | null;
      image: string | null;
      country: string | null;
      region: string | null;
      verified: boolean;
      albums: { id: string; title: string; cover: string | null; releaseDate: string | null }[];
      tracks: { id: string; title: string; duration: number; genre: string | null; albumId: string | null }[];
    }>(`/catalogue/artists/${id}`),
  albumDetail: (id: string) =>
    request<{
      id: string;
      title: string;
      cover: string | null;
      releaseDate: string | null;
      artist: { id: string; name: string };
      tracks: { id: string; title: string; duration: number; explicit: boolean; genre: string | null }[];
    }>(`/catalogue/albums/${id}`),
  trackDetail: (id: string) =>
    request<{
      id: string;
      title: string;
      duration: number;
      genre: string | null;
      language: string | null;
      region: string | null;
      explicit: boolean;
      status: string;
      artist: { id: string; name: string; verified: boolean };
      album: { id: string; title: string; cover: string | null } | null;
      rights: { territory: string; streamingAllowed: boolean; status: string }[];
    }>(`/catalogue/tracks/${id}`),
  searchAll: (q: string, entity?: string) =>
    request<
      { type: string; id: string; title: string; subtitle: string | null; score: number }[]
    >(`/search?q=${encodeURIComponent(q)}${entity ? `&entity=${entity}` : ''}`, undefined, false),
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
