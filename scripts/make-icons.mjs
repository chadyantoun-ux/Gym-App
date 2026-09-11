/* Generate the PWA placeholder icons.  B-68.
   ---------------------------------------------------------------------------
   THIS IS NOT A BUILD STEP. The PNGs it writes are committed to the repo and
   the app never runs this file. It exists once, so the placeholders can be
   regenerated or nudged without hand-editing binary, and so the maskable
   geometry is arithmetic rather than a designer's eyeball. Delete it the day
   Chady's real artwork lands, or keep it - either is fine.

   Run (Node is at C:\Program Files\nodejs, not on the git-bash PATH):
     "/c/Program Files/nodejs/node.exe" scripts/make-icons.mjs

   NO DEPENDENCIES. PNG is written by hand with Node's built-in zlib.

   WHAT IT DRAWS: the 2a tokens and nothing else - a flat opaque #1c1b1a ground
   with one heavy amber #f5b32b dumbbell. One shape, contiguous, no hairline:
   at 64 px (the smallest place the mark appears) the thinnest stroke is still
   ~7 px of the 512 grid. No text, no white plate.

   THE GEOMETRY THAT MATTERS (assets/README-icons.md): the maskable icon's mark
   must sit inside a 410 px circle centred on a 512 px canvas, because Android
   crops the corners to the launcher's shape. That is asserted below, not
   trusted - fitCheck() fails the run if any corner of any rectangle escapes
   the safe circle.                                                          */

import { deflateSync, crc32 as zcrc32 } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const BG    = [0x1c, 0x1b, 0x1a];   /* --bg    */
const AMBER = [0xf5, 0xb3, 0x2b];   /* --amber */

/* ---------------------------------------------------------------- PNG ---- */

const crc32 = typeof zcrc32 === 'function'
  ? (buf) => zcrc32(buf)
  : (() => {                                    /* pre-20.15 fallback */
      const T = new Int32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        T[n] = c;
      }
      return (buf) => {
        let c = -1;
        for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
        return (c ^ -1) >>> 0;
      };
    })();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

/* 8-bit truecolour, colour type 2: no alpha channel at all, so the file is
   opaque by construction and no launcher can composite its own plate through
   it. That is a requirement for the maskable icon, not an optimisation. */
function png(size, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   /* bit depth   */
  ihdr[9] = 2;   /* colour type */
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;                                /* filter: none */
    for (let x = 0; x < size; x++) {
      const p = rgb[y * size + x];
      raw[o++] = p[0]; raw[o++] = p[1]; raw[o++] = p[2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* --------------------------------------------------------------- mark ---- */

/* The dumbbell in units of its own full width (1.0 wide).  Contiguous:
   the bar overlaps both end plates, so it is one shape, not three. */
const BAR_T   = 56 / 340;    /* bar thickness            */
const PLATE_W = 44 / 340;    /* end plate width          */
const PLATE_H = 156 / 340;   /* end plate height         */

/* Rectangles as [x0, y0, x1, y1] in canvas pixels, centred on cx, cy. */
function rects(cx, cy, w) {
  const h  = PLATE_H * w, bt = BAR_T * w, pw = PLATE_W * w;
  const x0 = cx - w / 2, x1 = cx + w / 2;
  return [
    [x0,          cy - bt / 2, x1,      cy + bt / 2],   /* bar         */
    [x0,          cy - h / 2,  x0 + pw, cy + h / 2],    /* left plate  */
    [x1 - pw,     cy - h / 2,  x1,      cy + h / 2]     /* right plate */
  ].map(r => r.map(Math.round));
}

/* Every corner of every rectangle must be inside the safe circle. Throws
   rather than writing an icon whose mark can be cropped on some launcher. */
function fitCheck(name, rs, cx, cy, radius) {
  for (const [a, b, c, d] of rs) {
    for (const [x, y] of [[a, b], [c, b], [a, d], [c, d]]) {
      const r = Math.hypot(x - cx, y - cy);
      if (r > radius) {
        throw new Error(`${name}: corner (${x},${y}) is ${r.toFixed(1)} px from centre, `
                      + `outside the ${radius} px safe radius`);
      }
    }
  }
}

function render(size, markWidth) {
  const px = new Array(size * size);
  for (let i = 0; i < px.length; i++) px[i] = BG;      /* opaque ground, edge to edge */
  const rs = rects(size / 2, size / 2, markWidth);
  for (const [x0, y0, x1, y1] of rs) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) px[y * size + x] = AMBER;
    }
  }
  return { px, rs };
}

function write(file, size, markWidth, safeRadius) {
  const { px, rs } = render(size, markWidth);
  if (safeRadius) fitCheck(file, rs, size / 2, size / 2, safeRadius);
  const buf = png(size, px);
  writeFileSync(join(OUT, file), buf);
  const h = Math.round(PLATE_H * markWidth);
  console.log(`${file.padEnd(28)} ${size}x${size}  mark ${markWidth}x${h}  ${buf.length} bytes`);
}

/* `any` icons are never cropped, so they breathe to the padding README-icons.md
   asks for: ~11 px on the 192, ~28 px on the 512.
   The maskable one is held to the 410 px circle, which is what caps it at 340. */
write('icon-192.png',             192, 170);
write('icon-512.png',             512, 456);
write('icon-maskable-512.png',    512, 340, 205);
/* iOS masks it itself, so no rounded corners of ours and a comparable inset. */
write('apple-touch-icon-180.png', 180, 130);
