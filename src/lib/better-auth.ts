// Better Auth client (stack v2).
// Migration path: Better Auth becomes the session layer; until the server
// adapter + Convex/Neon session tables are cut over, this client delegates
// to the live NestJS OTP endpoints (same UX, no broken login). Swapping the
// internals later won't change the component API.
import { api } from './api';

export const betterAuthClient = {
  register: (email: string, password: string, name?: string) =>
    api.register(email, password, name),
  login: (email: string, password: string) => api.login(email, password),
  // Legacy OTP — retired from the UI, endpoints stay live.
  requestOtp: (identifier: string) => api.requestOtp(identifier),
  verifyOtp: (identifier: string, code: string) => api.verifyOtp(identifier, code),
};
