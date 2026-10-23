'use strict';
// A QR code (byte mode, error correction M, versions 1 to 20) as rows of true (dark) / false, for the UPI payment link on bills.
// The same code is in public/js/qr.js for the screen and the 2 inch printer; test/api.test.js checks that both are the same.
const qrMatrix = (() => {
  // Error correction codewords per block and number of blocks, level M, by version (index 1..20).
  const EC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];
  const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
  const rawModules = (v) => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const n = Math.floor(v / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  };
  const dataBytes = (v) => Math.floor(rawModules(v) / 8) - EC[v] * BLOCKS[v];

  // Arithmetic in GF(256) with the QR polynomial 0x11D.
  const EXP = [];
  const LOG = [];
  for (let i = 0, x = 1; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  const mul = (a, b) => (a && b ? EXP[(LOG[a] + LOG[b]) % 255] : 0);
  function divisor(degree) {
    const r = new Array(degree).fill(0);
    r[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        r[j] = mul(r[j], root);
        if (j + 1 < degree) r[j] ^= r[j + 1];
      }
      root = mul(root, 2);
    }
    return r;
  }
  function remainder(data, div) {
    const r = new Array(div.length).fill(0);
    for (const b of data) {
      const factor = b ^ r.shift();
      r.push(0);
      for (let i = 0; i < div.length; i++) r[i] ^= mul(div[i], factor);
    }
    return r;
  }

  // The message bytes with error correction, split into blocks and interleaved.
  function codewords(bytes, v) {
    const cap = dataBytes(v) * 8;
    const bits = [];
    const put = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };
    put(4, 4); // byte mode
    put(bytes.length, v < 10 ? 8 : 16);
    for (const b of bytes) put(b, 8);
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));

    const numBlocks = BLOCKS[v];
    const ecLen = EC[v];
    const raw = Math.floor(rawModules(v) / 8);
    const numShort = numBlocks - (raw % numBlocks);
    const shortLen = Math.floor(raw / numBlocks);
    const div = divisor(ecLen);
    const blocks = [];
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat = data.slice(k, k + shortLen - ecLen + (i < numShort ? 0 : 1));
      k += dat.length;
      const ecc = remainder(dat, div);
      if (i < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const out = [];
    for (let i = 0; i < blocks[0].length; i++) {
      for (let j = 0; j < blocks.length; j++) if (i !== shortLen - ecLen || j >= numShort) out.push(blocks[j][i]);
    }
    return out;
  }

  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  // Higher = harder to scan (the four rules of the QR standard).
  function penalty(m) {
    const n = m.length;
    let score = 0;
    let dark = 0;
    const line = (get) => {
      for (let a = 0; a < n; a++) {
        let run = 1;
        for (let b = 1; b <= n; b++) {
          if (b < n && get(a, b) === get(a, b - 1)) run++;
          else {
            if (run >= 5) score += run - 2;
            run = 1;
          }
        }
        for (let b = 0; b + 11 <= n; b++) {
          const s = Array.from({ length: 11 }, (_, k) => (get(a, b + k) ? 1 : 0)).join('');
          if (s === '10111010000' || s === '00001011101') score += 40;
        }
      }
    };
    line((a, b) => m[a][b]);
    line((a, b) => m[b][a]);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (m[y][x]) dark++;
        if (x + 1 < n && y + 1 < n && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
      }
    }
    return score + Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
  }

  return function qrMatrix(text, minVersion = 1) {
    const bytes = new TextEncoder().encode(String(text));
    let v = Math.max(1, minVersion);
    while (v <= 20 && 4 + (v < 10 ? 8 : 16) + 8 * bytes.length > dataBytes(v) * 8) v++;
    if (v > 20) throw new Error('Text too long for a QR code');
    const size = v * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => {
      m[y][x] = dark;
      fixed[y][x] = true;
    };

    for (let i = 0; i < size; i++) {
      set(6, i, i % 2 === 0);
      set(i, 6, i % 2 === 0);
    }
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
        }
      }
    }
    const pos = [];
    if (v > 1) {
      const count = Math.floor(v / 7) + 2;
      const step = Math.ceil((v * 4 + 4) / (count * 2 - 2)) * 2;
      for (let i = 0, p = v * 4 + 10; i < count - 1; i++, p -= step) pos.unshift(p);
      pos.unshift(6);
    }
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
    const format = (mask) => {
      const data = mask; // level M = 00
      let rem = data;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const bits = ((data << 10) | rem) ^ 0x5412;
      const bit = (i) => ((bits >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6));
      set(8, 8, bit(7));
      set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    };
    format(0); // marks the places as taken
    if (v >= 7) {
      let rem = v;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (v << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const b = ((bits >>> i) & 1) === 1;
        const a = size - 11 + (i % 3);
        const c = Math.floor(i / 3);
        set(a, c, b);
        set(c, a, b);
      }
    }

    const words = codewords(bytes, v);
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
          if (!fixed[y][x] && i < words.length * 8) {
            m[y][x] = ((words[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
            i++;
          }
        }
      }
    }

    const flip = (mask) => {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fixed[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
    };
    let best = 0;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      flip(mask);
      format(mask);
      const s = penalty(m);
      if (s < bestScore) [best, bestScore] = [mask, s];
      flip(mask);
    }
    flip(best);
    format(best);
    return m;
  };
})();

// The UPI link that a payment app opens: pay this UPI ID exactly this amount (the apps do not let the amount be changed).
const upiLink = (upi, name, amount, note) =>
  `upi://pay?pa=${upi}&pn=${encodeURIComponent(name || 'Payee')}&am=${Number(amount).toFixed(2)}&cu=INR${note ? '&tn=' + encodeURIComponent(note) : ''}`;

