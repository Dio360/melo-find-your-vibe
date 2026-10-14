// Convex placeholder (stack v2).
// Decision: Neon Postgres stays the system of record (catalogue, auth,
// search via pg_trgm — all live). Convex is reserved for realtime sync
// (presence, live likes, collaborative queues) and is NOT a second primary
// DB. To activate: `npm i convex`, `npx convex dev`, paste CONVEX_URL into
// env, then mirror only ephemeral state here. Do not duplicate User/Track
// tables — that breaks free-tier limits and consistency.
export const convexSchemaNote = 'neon-primary';
