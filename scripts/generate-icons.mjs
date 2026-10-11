/**
 * Generates the MELO PWA/app icon set from a single SVG source.
 *
 * Brand: #121212 canvas, #1DB95D geometric "M" (rounded strokes — reads as a
 * soundwave at small sizes). Run with: node scripts/generate-icons.mjs
 *
 * Outputs:
 *   public/icons/icon-192x192.png        manifest icon
 *   public/icons/icon-512x512.png        manifest icon
 *   public/icons/icon-maskable-512x512.png  Android maskable (logo at 60%)
 *   src/app/apple-icon.png               iOS home screen (180px, auto-wired)
 *   src/app/icon.png                     favicon (48px, auto-wired)
 */
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const BG = '#121212';
const FG = '#1DB95D';

/** Geometric M: two uprights + a V-join, centered in a 512 viewBox. */
function svg({ stroke = 44, scale = 1 }) {
  const transform =
    scale === 1 ? '' : ` transform="translate(256 256) scale(${scale}) translate(-256 -256)"`;
  return Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${BG}"/>
      <g${transform}>
        <path d="M 150 350 L 150 170 L 256 262 L 362 170 L 362 350"
              fill="none" stroke="${FG}" stroke-width="${stroke}"
              stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>`);
}

async function emit(out, size, opts = {}) {
  await sharp(svg(opts)).resize(size, size).png().toFile(out);
  console.log(`  ${out}`);
}

await mkdir('public/icons', { recursive: true });

console.log('Generating MELO icon set:');
await emit('public/icons/icon-192x192.png', 192);
await emit('public/icons/icon-512x512.png', 512);
// Maskable: full-bleed background, logo inside the 80% safe circle.
await emit('public/icons/icon-maskable-512x512.png', 512, { scale: 0.62 });
await emit('src/app/apple-icon.png', 180);
// Small favicon: thicker relative stroke so the M stays legible at 48px.
await emit('src/app/icon.png', 48, { stroke: 64 });

console.log('Done.');
