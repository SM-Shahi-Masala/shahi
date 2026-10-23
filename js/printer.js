'use strict';
// The bill on a small Bluetooth thermal printer: 58 mm paper (about 2.2 inch), 32 letters a line, plain text.
// The printer is told what to do in ESC/POS, the language almost every such printer understands.
// Two ways to reach it:
//  - direct: Chrome talks to the printer itself (Web Bluetooth; printers with Bluetooth Low Energy).
//  - rawbt: the free Android app "RawBT" prints it (also printers with classic Bluetooth only).
const COLS = 32;

// The printer has only English letters: ₹ becomes Rs, anything else unknown becomes ?.
const plain = (s) =>
  String(s ?? '')
    .replace(/₹/g, 'Rs ')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?')
    .trim();
const money2 = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Breaks a text into lines of at most `width` letters (a word longer than a line is cut).
function wrapText(s, width = COLS) {
  const lines = [];
  let line = '';
  for (let word of plain(s).split(' ').filter(Boolean)) {
    while (word.length > width) {
      if (line) lines.push(line), (line = '');
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (line && (line + ' ' + word).length > width) lines.push(line), (line = word);
    else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines;
}
// "left ......... right" on one line of `width` letters.
const sides = (left, right, width = COLS) => {
  left = left.match(/^ */)[0] + plain(left); // a leading indent is kept
  right = plain(right);
  const room = width - right.length - 1;
  return (left.length > room ? left.slice(0, room) : left).padEnd(width - right.length) + right;
};
const RULE = '-'.repeat(COLS);

// The bill as lines. Each line: { t: text, c: centred, b: bold, big: double size (16 letters a line) }.
function receiptLines(o, s) {
  const L = [];
  const add = (t, f = {}) => L.push({ t, ...f });
  for (const t of wrapText(s.business_name || 'Bill', COLS / 2)) add(t, { c: 1, b: 1, big: 1 });
  if (s.business_phone || s.business_whatsapp) add('Ph: ' + (s.business_phone || s.business_whatsapp), { c: 1 });
  add(RULE);
  add(sides('Bill: ' + o.bill_no, ''), { b: 1 });
  add(sides(fullDate(o.bill_date), o.bill_time || ''));
  for (const t of wrapText('To: ' + o.customer_name)) add(t, { b: 1 });
  add(RULE);
  add(sides('Item', 'Amount'), { b: 1 });
  add(RULE);
  for (const i of o.items) {
    for (const t of wrapText(`${i.product_name} ${i.pack_name}`)) add(t);
    add(sides(`  ${i.quantity} x ${money2(i.rate)}`, money2(i.line_total)));
  }
  add(RULE);
  add(sides('TOTAL', 'Rs ' + money2(o.total)), { b: 1 });
  for (const [label, v, strong] of balanceRows(o)) add(sides(label, 'Rs ' + money2(v)), { b: strong ? 1 : 0 });
  add(RULE);
  // UPI QR for exactly the amount to pay, printed as a picture.
  const qr = billQr(o);
  if (qr) {
    add('Scan to pay Rs ' + money2(amountToPay(o)), { c: 1, b: 1 });
    L.push({ t: '[ UPI QR code ]', c: 1, qr });
    add('UPI: ' + s.business_upi, { c: 1 });
    add(RULE);
  }
  if (o.status === 'cancelled') add('*** CANCELLED ***', { c: 1, b: 1 });
  const note = o.note || s.bill_note;
  if (note) for (const t of wrapText(note)) add(t, { c: 1 });
  if (s.bill_footer) for (const t of wrapText(s.bill_footer)) add(t, { c: 1, b: 1 });
  return L;
}
// What will come out of the printer, for the preview on the screen (big letters are shown at normal size there).
const receiptText = (o, s) => receiptLines(o, s).map((l) => (l.c ? l.t.padStart(Math.floor((COLS + l.t.length) / 2)) : l.t)).join('\n');
// The same preview with the QR drawn as it is printed.
const receiptPreview = (o, s) =>
  `<div class="receipt">${receiptLines(o, s)
    .map((l) => (l.qr ? qrSvg(l.qr, 150) : `<pre>${esc(l.c ? l.t.padStart(Math.floor((COLS + l.t.length) / 2)) : l.t) || ' '}</pre>`))
    .join('')}</div>`;

// A QR code as an ESC/POS picture (GS v 0): each square is a few dots, with a white border. About 270 dots wide (paper: 384).
function qrRaster(text) {
  const m = qrMatrix(text);
  const q = m.length + 8;
  const scale = Math.max(2, Math.min(6, Math.floor(288 / q)));
  const w = q * scale;
  const wb = Math.ceil(w / 8);
  const out = [0x1d, 0x76, 0x30, 0x00, wb & 255, wb >> 8, w & 255, w >> 8];
  for (let y = 0; y < w; y++) {
    const r = Math.floor(y / scale) - 4;
    for (let xb = 0; xb < wb; xb++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const c = Math.floor((xb * 8 + bit) / scale) - 4;
        if (r >= 0 && r < m.length && c >= 0 && c < m.length && m[r][c]) byte |= 0x80 >> bit;
      }
      out.push(byte);
    }
  }
  return out;
}

// The same lines as ESC/POS printer commands.
function receiptBytes(o, s) {
  const out = [0x1b, 0x40]; // start fresh
  const push = (...b) => out.push(...b);
  for (const l of receiptLines(o, s)) {
    if (l.qr) {
      push(0x1b, 0x61, 1, 0x1b, 0x45, 0, 0x1d, 0x21, 0);
      push(...qrRaster(l.qr));
      push(0x0a);
      continue;
    }
    push(0x1b, 0x61, l.c ? 1 : 0); // centre or left
    push(0x1b, 0x45, l.b ? 1 : 0); // bold
    push(0x1d, 0x21, l.big ? 0x11 : 0x00); // double width and height
    for (const ch of l.t.replace(/[^\x20-\x7E]/g, '?') || ' ') push(ch.charCodeAt(0));
    push(0x0a);
  }
  push(0x1b, 0x45, 0, 0x1d, 0x21, 0, 0x1b, 0x61, 0);
  push(0x1b, 0x64, 4); // feed 4 lines so the bill can be torn off
  return new Uint8Array(out);
}

// ---------- direct Bluetooth (Chrome, printers with Bluetooth Low Energy) ----------
// The services that 58 mm printers usually offer for printing.
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
];
let btPrinter = null; // { device, ch } while this page is open, so the next bill prints without choosing again
const canBluetooth = () => !!(navigator.bluetooth && navigator.bluetooth.requestDevice);

async function findWritable(server) {
  for (const service of await server.getPrimaryServices()) {
    for (const ch of await service.getCharacteristics()) {
      if (ch.properties.writeWithoutResponse || ch.properties.write) return ch;
    }
  }
  return null;
}

async function printDirect(bytes) {
  if (!canBluetooth()) throw new Error('This browser cannot use Bluetooth. Use Chrome on Android, or choose "RawBT app".');
  if (!btPrinter || !btPrinter.device.gatt.connected) {
    let device = btPrinter?.device;
    if (!device) {
      try {
        device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: PRINTER_SERVICES });
      } catch (e) {
        if (e.name === 'NotFoundError') return false; // the person closed the list
        throw new Error('Bluetooth is off or not allowed. Switch it on and try again.');
      }
    }
    let ch;
    try {
      ch = await findWritable(await device.gatt.connect());
    } catch {
      btPrinter = null;
      throw new Error('Could not connect to the printer. Switch it on, keep it near, and try again.');
    }
    if (!ch) throw new Error('This printer does not accept printing this way. Choose "RawBT app" instead.');
    btPrinter = { device, ch };
  }
  // Sent in small pieces: small printers take about 100 letters at a time.
  const { ch } = btPrinter;
  for (let i = 0; i < bytes.length; i += 100) {
    const part = bytes.slice(i, i + 100);
    if (ch.properties.writeWithoutResponse) {
      await ch.writeValueWithoutResponse(part);
      await new Promise((r) => setTimeout(r, 30));
    } else await ch.writeValueWithResponse(part);
  }
  return true;
}

// ---------- the RawBT app (Android, any Bluetooth printer) ----------
// Opens RawBT with the bill; if RawBT is not installed, Android opens its page in the Play Store.
function printRawBT(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  location.href = `intent:base64,${btoa(bin)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

// ---------- which way this phone prints (remembered on the phone) ----------
const PRINT_WAYS = { direct: 'Bluetooth printer (2 inch), direct', rawbt: 'Bluetooth printer (2 inch), RawBT app', a4: 'Normal printer / A4' };
const printWay = {
  get: () => {
    try {
      return localStorage.getItem('printWay') || '';
    } catch {
      return '';
    }
  },
  set: (v) => {
    try {
      localStorage.setItem('printWay', v);
    } catch {}
  },
};

async function printBill(o, way) {
  if (way === 'a4') return window.print();
  const bytes = receiptBytes(o, S.boot.settings);
  if (way === 'rawbt') return printRawBT(bytes);
  if (await printDirect(bytes)) toast('Sent to the printer');
}

// The choice of printer, with a preview of the 2 inch bill.
function choosePrinter(o) {
  ACT.pickWay = async (el) => {
    printWay.set(el.dataset.way);
    closeSheet();
    try {
      await printBill(o, el.dataset.way);
    } finally {
      refresh(); // the bill page then shows the chosen printer
    }
  };
  sheet(`<h3>How do you print?</h3>
    <p class="muted small">Chosen once; the Print button then prints at once. “Change printer” on the bill chooses again.</p>
    <div class="menu">
      ${canBluetooth() ? `<button data-act="pickWay" data-way="direct"><span class="ico">${icon('print')}</span><span><b>${PRINT_WAYS.direct}</b><br><span class="muted small">No app needed. Chrome shows nearby printers: choose yours.</span></span></button>` : ''}
      <button data-act="pickWay" data-way="rawbt"><span class="ico">${icon('print')}</span><span><b>${PRINT_WAYS.rawbt}</b><br><span class="muted small">Works with every Bluetooth printer. Install “RawBT” from the Play Store once and pair the printer in it.</span></span></button>
      <button data-act="pickWay" data-way="a4"><span class="ico">${icon('print')}</span><span><b>${PRINT_WAYS.a4}</b><br><span class="muted small">Big printer, or save as PDF.</span></span></button>
    </div>
    <h3>2 inch bill</h3>
    ${receiptPreview(o, S.boot.settings)}`);
}
