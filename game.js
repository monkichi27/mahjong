/* ไพ่นกกระจอก จับ 3 — mobile-first triple-tile match game. No ads, no tracking. */
(() => {
'use strict';

// ============================================================
// Constants
// ============================================================
const TRAY_SIZE = 7;
const PARK_SIZE = 3;
const ASPECT = 1.28;           // tile height / width
const MAX_UNIT = 36;           // px per half-tile at most (tile width = 2 units)
const Z_SHIFT_X = 3;           // px offset per layer (3D feel)
const Z_SHIFT_Y = 4;
const HELPERS_PER_LEVEL = { undo: 5, shuffle: 3, pop: 3 };
const SAVE_KEY = 'mj3.save.v1';

const NUM_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
// Ordered by how easy the faces are to tell apart; early levels use the first few.
const TYPE_ORDER = [
  'dZ', 'dF', 'dB', 'c1', 'b1', 'w1', 'WE', 'c5', 'b5', 'w5', 'WS', 'c9', 'b9', 'w9',
  'WW', 'c3', 'b3', 'w3', 'WN', 'c2', 'b2', 'w2', 'c4', 'b4', 'w4', 'c6', 'b6', 'w6',
  'c7', 'b7', 'w7', 'c8', 'b8', 'w8',
];

const COL = { green: '#1f8a4c', red: '#d1342f', blue: '#1d4f9c', ink: '#222' };
const CJK_FONT = '"PingFang SC","PingFang TC","Hiragino Sans GB","Heiti SC","Noto Sans CJK SC","Noto Sans SC","Noto Sans CJK TC","Microsoft YaHei",serif';

// ============================================================
// Tile face rendering (inline SVG, viewBox 60x80)
// ============================================================
const faceCache = new Map();

function circle(cx, cy, r, color) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="rgba(0,0,0,.28)" stroke-width="1.4"/>` +
         `<circle cx="${cx}" cy="${cy}" r="${(r * 0.42).toFixed(1)}" fill="none" stroke="#fff" stroke-width="${Math.max(1.2, r * 0.2).toFixed(1)}" opacity=".9"/>`;
}
function stick(cx, cy, h, color) {
  const w = h * 0.36, x = cx - w / 2, y = cy - h / 2;
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${(w / 2.4).toFixed(1)}" fill="${color}"/>` +
         `<rect x="${x.toFixed(1)}" y="${(cy - h * 0.07).toFixed(1)}" width="${w.toFixed(1)}" height="${(h * 0.14).toFixed(1)}" fill="rgba(255,255,255,.75)"/>`;
}
function text(str, y, size, color, weight = 700) {
  return `<text x="30" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color}" font-family='${CJK_FONT}'>${str}</text>`;
}

const DOTS = {
  1: [[30, 40, 17, COL.red]],
  2: [[30, 21, 11, COL.green], [30, 59, 11, COL.blue]],
  3: [[15, 19, 9, COL.blue], [30, 40, 9, COL.red], [45, 61, 9, COL.green]],
  4: [[17, 22, 9.5, COL.blue], [43, 22, 9.5, COL.green], [17, 58, 9.5, COL.green], [43, 58, 9.5, COL.blue]],
  5: [[16, 20, 8.5, COL.blue], [44, 20, 8.5, COL.green], [30, 40, 8.5, COL.red], [16, 60, 8.5, COL.green], [44, 60, 8.5, COL.blue]],
  6: [[17, 18, 8, COL.green], [43, 18, 8, COL.green], [17, 40, 8, COL.red], [43, 40, 8, COL.red], [17, 62, 8, COL.red], [43, 62, 8, COL.red]],
  7: [[13, 14, 6.5, COL.green], [30, 20, 6.5, COL.green], [47, 26, 6.5, COL.green], [17, 46, 6.5, COL.red], [43, 46, 6.5, COL.red], [17, 64, 6.5, COL.red], [43, 64, 6.5, COL.red]],
  8: [[17, 14, 6.5, COL.blue], [43, 14, 6.5, COL.blue], [17, 31, 6.5, COL.blue], [43, 31, 6.5, COL.blue], [17, 49, 6.5, COL.blue], [43, 49, 6.5, COL.blue], [17, 66, 6.5, COL.blue], [43, 66, 6.5, COL.blue]],
  9: [[14, 17, 6.5, COL.green], [30, 17, 6.5, COL.green], [46, 17, 6.5, COL.green], [14, 40, 6.5, COL.red], [30, 40, 6.5, COL.red], [46, 40, 6.5, COL.red], [14, 63, 6.5, COL.blue], [30, 63, 6.5, COL.blue], [46, 63, 6.5, COL.blue]],
};
const BAMS = {
  1: [[30, 40, 48, COL.green]],
  2: [[30, 22, 26, COL.green], [30, 58, 26, COL.blue]],
  3: [[30, 21, 26, COL.blue], [18, 58, 26, COL.green], [42, 58, 26, COL.green]],
  4: [[18, 22, 26, COL.green], [42, 22, 26, COL.blue], [18, 58, 26, COL.blue], [42, 58, 26, COL.green]],
  5: [[16, 21, 24, COL.green], [44, 21, 24, COL.blue], [30, 40, 24, COL.red], [16, 59, 24, COL.blue], [44, 59, 24, COL.green]],
  6: [[14, 22, 26, COL.green], [30, 22, 26, COL.green], [46, 22, 26, COL.green], [14, 58, 26, COL.blue], [30, 58, 26, COL.blue], [46, 58, 26, COL.blue]],
  7: [[30, 14, 20, COL.red], [14, 38, 20, COL.green], [30, 38, 20, COL.green], [46, 38, 20, COL.green], [14, 63, 20, COL.blue], [30, 63, 20, COL.blue], [46, 63, 20, COL.blue]],
  8: [[12, 22, 26, COL.green], [24, 22, 26, COL.green], [36, 22, 26, COL.green], [48, 22, 26, COL.green], [12, 58, 26, COL.blue], [24, 58, 26, COL.blue], [36, 58, 26, COL.blue], [48, 58, 26, COL.blue]],
  9: [[14, 16, 20, COL.red], [30, 16, 20, COL.red], [46, 16, 20, COL.red], [14, 40, 20, COL.green], [30, 40, 20, COL.green], [46, 40, 20, COL.green], [14, 64, 20, COL.blue], [30, 64, 20, COL.blue], [46, 64, 20, COL.blue]],
};

function faceSVG(type) {
  if (faceCache.has(type)) return faceCache.get(type);
  const kind = type[0], v = type[1];
  let inner = '';
  if (kind === 'c') inner = DOTS[+v].map(d => circle(...d)).join('');
  else if (kind === 'b') inner = BAMS[+v].map(d => stick(...d)).join('');
  else if (kind === 'w') inner = text(NUM_CN[+v], 33, 30, COL.ink) + text('萬', 71, 30, COL.red);
  else if (kind === 'W') inner = text({ E: '東', S: '南', W: '西', N: '北' }[v], 54, 42, COL.ink, 800);
  else if (type === 'dZ') inner = text('中', 55, 44, COL.red, 800);
  else if (type === 'dF') inner = text('發', 55, 44, COL.green, 800);
  else if (type === 'dB') inner = `<rect x="11" y="13" width="38" height="54" rx="5" fill="none" stroke="${COL.blue}" stroke-width="4.5"/>` +
                                  `<rect x="18" y="20" width="24" height="40" rx="3" fill="none" stroke="${COL.blue}" stroke-width="2" opacity=".6"/>`;
  const svg = `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
  faceCache.set(type, svg);
  return svg;
}

// ============================================================
// Utilities
// ============================================================
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = rnd(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
const overlaps = (a, b) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ============================================================
// Level generation
// ============================================================
function levelParams(L) {
  // Endless. Tiles grow to 150 (~level 22), layers to 7 (~level 21),
  // kinds of tiles to 20 (~level 46) — later kinds look alike, so it keeps getting harder.
  let tiles = Math.min(150, 24 + (L - 1) * 6);
  tiles -= tiles % 3;
  const types = Math.min(20, 5 + Math.floor((L - 1) / 3));
  const layers = Math.min(7, 2 + Math.floor((L - 1) / 4));
  return { tiles, types, layers };
}

// Helpers per level: generous early, fewer from level 20 on (never below 2/1/1).
function helpersFor(L) {
  const over = Math.max(0, L - 20);
  return {
    undo: Math.max(2, HELPERS_PER_LEVEL.undo - Math.floor(over / 5)),
    shuffle: Math.max(1, HELPERS_PER_LEVEL.shuffle - Math.floor(over / 8)),
    pop: Math.max(1, HELPERS_PER_LEVEL.pop - Math.floor(over / 8)),
  };
}

const SHAPES = ['rect', 'diamond', 'circle', 'ring', 'cross', 'x', 'holes'];
function inMask(shape, nx, ny) {
  switch (shape) {
    case 'rect': return true;
    case 'diamond': return Math.abs(nx) + Math.abs(ny) <= 1.2;
    case 'circle': return nx * nx + ny * ny <= 1.15;
    case 'ring': { const r = nx * nx + ny * ny; return r >= 0.22 && r <= 1.15; }
    case 'cross': return Math.abs(nx) <= 0.42 || Math.abs(ny) <= 0.42;
    case 'x': return Math.abs(Math.abs(nx) - Math.abs(ny)) <= 0.5;
    case 'holes': return Math.random() < 0.8;
  }
  return true;
}

function layerCells(cols, rows, z, shape) {
  const off = z % 2;
  const shrink = Math.max(0.6, 1 - 0.07 * z);
  const cells = [];
  for (let i = 0; i < cols - off; i++) {
    for (let j = 0; j < rows - off; j++) {
      const x = 2 * i + off, y = 2 * j + off;
      const nx = ((x + 1) - cols) / cols / shrink;
      const ny = ((y + 1) - rows) / rows / shrink;
      if (inMask(shape, nx, ny)) cells.push({ x, y, z });
    }
  }
  return cells;
}

function tryLayout(N, layers) {
  const shape = pick(SHAPES);
  const decay = 0.72;
  let sumShare = 0;
  for (let z = 0; z < layers; z++) sumShare += Math.pow(decay, z);
  const target0 = N / sumShare;

  // Pick a grid whose layer-0 mask count is close to the target for layer 0.
  let best = null;
  for (let cols = 4; cols <= 7; cols++) {
    for (let rows = cols; rows <= Math.min(9, cols + 2); rows++) {
      const m0 = layerCells(cols, rows, 0, shape === 'holes' ? 'rect' : shape).length;
      const score = Math.abs(m0 - target0) + (m0 < target0 * 0.9 ? 100 : 0);
      if (!best || score < best.score) best = { cols, rows, score };
    }
  }
  const { cols, rows } = best;

  const chosen = [];
  let need = N;
  for (let z = 0; z < 8 && need > 0; z++) {
    let cands = shuffle(layerCells(cols, rows, z, shape));
    if (z > 0) cands = cands.filter(c => chosen[z - 1].some(p => overlaps(p, c)));
    const share = z < layers ? Math.round(N * Math.pow(decay, z) / sumShare) : Math.round(need * 0.7);
    const take = Math.min(cands.length, Math.max(share, z >= layers - 1 ? need : 0), need);
    chosen[z] = cands.slice(0, take);
    need -= take;
    if (take === 0) break;
  }
  if (need > 0) return null;

  // Trim to a multiple of 3 from the top.
  let slots = chosen.flat();
  while (slots.length % 3 !== 0) {
    let top = -1;
    for (const s of slots) top = Math.max(top, s.z);
    const idx = slots.findIndex(s => s.z === top);
    slots.splice(idx, 1);
  }
  return slots;
}

/**
 * Assign types to slots via reverse solving: repeatedly take a group of
 * currently-uncovered slots and give them the same type. This guarantees a
 * forward solution exists. Returns {types, order} or null.
 */
function assignTypes(slots, groups) {
  const remaining = new Set(slots.map((_, i) => i));
  const types = new Array(slots.length);
  const order = [];
  for (const [type, size] of groups) {
    const free = [], weights = [];
    for (const i of remaining) {
      const t = slots[i];
      let covered = false, covers = 0;
      for (const j of remaining) {
        if (j === i) continue;
        const s = slots[j];
        if (!overlaps(s, t)) continue;
        if (s.z > t.z) { covered = true; break; }
        if (s.z < t.z) covers++;
      }
      if (!covered) { free.push(i); weights.push(1 + covers * 3 + t.z * 1.5); }
    }
    if (free.length < size) return null;
    for (let k = 0; k < size; k++) {
      let total = 0;
      for (const w of weights) total += w;
      let r = Math.random() * total, idx = 0;
      while (idx < free.length - 1 && r >= weights[idx]) { r -= weights[idx]; idx++; }
      const i = free[idx];
      types[i] = type;
      remaining.delete(i);
      order.push(i);
      free.splice(idx, 1);
      weights.splice(idx, 1);
    }
  }
  return { types, order };
}

function buildGroups(N, typeCount) {
  const triples = N / 3;
  const groups = [];
  for (let k = 0; k < triples; k++) groups.push([TYPE_ORDER[k % typeCount], 3]);
  return shuffle(groups);
}

function generateLevel(L) {
  const p = levelParams(L);
  for (let attempt = 0; attempt < 60; attempt++) {
    const slots = tryLayout(p.tiles, p.layers);
    if (!slots || slots.length < 6) continue;
    const res = assignTypes(slots, buildGroups(slots.length, p.types));
    if (!res) continue;
    return { slots, types: res.types, order: res.order };
  }
  // Fallback: flat rectangle, always solvable.
  const slots = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) slots.push({ x: 2 * i, y: 2 * j, z: 0 });
  const res = assignTypes(slots, buildGroups(24, 5));
  return { slots, types: res.types, order: res.order };
}

// ============================================================
// Audio (tiny synth, no assets)
// ============================================================
const audio = {
  ctx: null,
  on: true,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type = 'sine', gain = 0.12, when = 0) {
    if (!this.on || !this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  tap() { this.tone(620, 0.07, 'triangle', 0.1); },
  match() { [660, 880, 1175].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.14, i * 0.06)); },
  bad() { this.tone(180, 0.15, 'square', 0.06); },
  helper() { this.tone(440, 0.1, 'triangle', 0.1); this.tone(560, 0.12, 'triangle', 0.1, 0.08); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.14, i * 0.11)); },
  lose() { [440, 370, 311, 262].forEach((f, i) => this.tone(f, 0.28, 'sawtooth', 0.06, i * 0.16)); },
};
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {} }

// ============================================================
// State
// ============================================================
const $ = (id) => document.getElementById(id);
const els = {
  board: $('board'), tray: $('tray'), parked: $('parked'), stage: $('stage'),
  level: $('hud-level'), remain: $('hud-remain'),
  undo: $('btn-undo'), shuffle: $('btn-shuffle'), pop: $('btn-pop'),
  cUndo: $('cnt-undo'), cShuffle: $('cnt-shuffle'), cPop: $('cnt-pop'),
  sound: $('btn-sound'), restart: $('btn-restart'),
  modal: $('modal'), mTitle: $('modal-title'), mText: $('modal-text'), mButtons: $('modal-buttons'),
};

const state = {
  level: 1,
  tiles: [],          // {id, type, x, y, z, where: 'board'|'tray'|'parked'|'gone', el}
  tray: [],           // tile ids
  parked: [],         // tile ids
  history: [],        // {id, from: 'board'|'parked'}
  helpers: { ...HELPERS_PER_LEVEL },
  over: false,
  bbox: null,
  solution: [],
  pending: null,      // matched triple awaiting its pop animation
};

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (s.level >= 1) state.level = s.level;
    if (typeof s.sound === 'boolean') audio.on = s.sound;
  } catch (_) {}
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ level: state.level, sound: audio.on })); } catch (_) {}
}

// ============================================================
// Level lifecycle
// ============================================================
function startLevel(L) {
  state.level = L;
  save();
  els.stage.innerHTML = '';
  state.tiles = [];
  state.tray = [];
  state.parked = [];
  state.history = [];
  state.helpers = helpersFor(L);
  state.over = false;
  if (state.pending) clearTimeout(state.pending.timer);
  state.pending = null;
  els.parked.classList.remove('active');
  els.tray.classList.remove('danger');

  const gen = generateLevel(L);
  gen.slots.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'tile no-anim';
    el.dataset.id = i;
    el.innerHTML = `<div class="face">${faceSVG(gen.types[i])}</div>`;
    els.stage.appendChild(el);
    state.tiles.push({ id: i, type: gen.types[i], x: s.x, y: s.y, z: s.z, where: 'board', el });
  });
  state.solution = gen.order.slice();

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = 0;
  for (const t of state.tiles) {
    minX = Math.min(minX, t.x); minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + 2); maxY = Math.max(maxY, t.y + 2);
    maxZ = Math.max(maxZ, t.z);
  }
  state.bbox = { minX, minY, maxX, maxY, maxZ };

  layoutAll(true);
  updateCovered();
  updateHUD();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const t of state.tiles) t.el.classList.remove('no-anim');
  }));
}

// ============================================================
// Layout / positioning
// ============================================================
function boardMetrics() {
  const r = els.board.getBoundingClientRect();
  const b = state.bbox;
  const wU = b.maxX - b.minX, hU = (b.maxY - b.minY) * ASPECT;
  const pad = 6;
  const availW = r.width - pad * 2 - b.maxZ * Z_SHIFT_X;
  const availH = r.height - pad * 2 - b.maxZ * Z_SHIFT_Y;
  const u = Math.max(10, Math.min(availW / wU, availH / hU, MAX_UNIT));
  const drawnW = wU * u + b.maxZ * Z_SHIFT_X;
  const drawnH = hU * u + b.maxZ * Z_SHIFT_Y;
  const originX = r.left + (r.width - drawnW) / 2 + b.maxZ * Z_SHIFT_X;
  const originY = r.top + (r.height - drawnH) / 2 + b.maxZ * Z_SHIFT_Y;
  return { u, originX, originY, tileW: 2 * u, tileH: 2 * u * ASPECT };
}

function boardPos(t, m) {
  return {
    x: m.originX + (t.x - state.bbox.minX) * m.u - t.z * Z_SHIFT_X,
    y: m.originY + (t.y - state.bbox.minY) * m.u * ASPECT - t.z * Z_SHIFT_Y,
    w: m.tileW, h: m.tileH,
  };
}

function slotPos(container, index) {
  const slot = container.children[index];
  const r = slot.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function place(t, p, z) {
  const el = t.el;
  el.style.width = p.w + 'px';
  el.style.height = p.h + 'px';
  el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
  el.style.zIndex = z;
}

function layoutAll(instant = false, trayList = state.tray) {
  const m = boardMetrics();
  for (const t of state.tiles) {
    if (instant) t.el.classList.add('no-anim');
    if (t.where === 'board') {
      place(t, boardPos(t, m), 100 + t.z * 10);
      t.el.classList.remove('in-tray');
    }
  }
  trayList.forEach((id, i) => { const t = state.tiles[id]; place(t, slotPos(els.tray, i), 500); t.el.classList.add('in-tray'); });
  state.parked.forEach((id, i) => { const t = state.tiles[id]; place(t, slotPos(els.parked, i), 400); t.el.classList.add('in-tray'); });
  if (instant) requestAnimationFrame(() => requestAnimationFrame(() => { for (const t of state.tiles) t.el.classList.remove('no-anim'); }));
}

function isFree(t) {
  if (t.where === 'parked') return true;
  if (t.where !== 'board') return false;
  for (const s of state.tiles) {
    if (s.where === 'board' && s.z > t.z && overlaps(s, t)) return false;
  }
  return true;
}

function updateCovered() {
  for (const t of state.tiles) {
    if (t.where === 'board') t.el.classList.toggle('covered', !isFree(t));
    else t.el.classList.remove('covered');
  }
}

function remainingCount() {
  return state.tiles.filter(t => t.where !== 'gone').length;
}

function updateHUD() {
  els.level.textContent = state.level;
  els.remain.textContent = remainingCount();
  els.cUndo.textContent = state.helpers.undo;
  els.cShuffle.textContent = state.helpers.shuffle;
  els.cPop.textContent = state.helpers.pop;
  els.undo.disabled = state.helpers.undo <= 0 || !state.history.some(h => state.tiles[h.id].where === 'tray');
  els.shuffle.disabled = state.helpers.shuffle <= 0 || state.tiles.filter(t => t.where === 'board').length < 2;
  els.pop.disabled = state.helpers.pop <= 0 || state.tray.length === 0 || state.parked.length > 0;
  els.sound.textContent = audio.on ? '🔊' : '🔇';
  els.tray.classList.toggle('danger', state.tray.length >= TRAY_SIZE - 1);
}

// ============================================================
// Moves
// ============================================================
function onTileTap(t) {
  if (state.over) return;
  if (t.where !== 'board' && t.where !== 'parked') return;
  if (!isFree(t)) {
    audio.bad();
    t.el.classList.remove('shake'); void t.el.offsetWidth; t.el.classList.add('shake');
    return;
  }
  flushPending();
  audio.tap(); buzz(8);
  const from = t.where;
  if (from === 'parked') state.parked.splice(state.parked.indexOf(t.id), 1);
  t.where = 'tray';
  // Insert after the last tile of the same type, else at the end.
  let idx = -1;
  state.tray.forEach((id, i) => { if (state.tiles[id].type === t.type) idx = i; });
  if (idx >= 0) state.tray.splice(idx + 1, 0, t.id); else state.tray.push(t.id);
  state.history.push({ id: t.id, from });
  t.el.style.zIndex = 600;
  if (state.parked.length === 0) els.parked.classList.remove('active');

  const same = state.tray.filter(id => state.tiles[id].type === t.type);
  if (same.length >= 3) {
    // Update state immediately (so fast taps can't corrupt the tray);
    // keep the three visible in their slots for a moment, then pop them.
    const visual = state.tray.slice();
    const matched = same.slice(0, 3);
    for (const id of matched) {
      state.tiles[id].where = 'gone';
      state.tray.splice(state.tray.indexOf(id), 1);
    }
    layoutAll(false, visual);
    state.pending = { ids: matched, timer: setTimeout(popMatched, 220) };
  } else {
    layoutAll();
    if (state.tray.length >= TRAY_SIZE) {
      state.over = true;
      setTimeout(gameOver, 350);
    }
  }
  updateCovered();
  updateHUD();
}

/** Play the pop animation for a matched triple whose state is already cleared. */
function popMatched() {
  const p = state.pending;
  if (!p) return;
  state.pending = null;
  clearTimeout(p.timer);
  for (const id of p.ids) {
    const el = state.tiles[id].el;
    const m = el.style.transform.replace(/ scale\([^)]*\)/, '');
    el.style.transform = m + ' scale(1.25)';
    el.style.zIndex = 650;
    setTimeout(() => { el.style.transform = m + ' scale(0)'; el.classList.add('gone'); }, 120);
    setTimeout(() => el.remove(), 500);
  }
  audio.match(); buzz([20, 30, 20]);
  setTimeout(() => layoutAll(), 140);
  if (remainingCount() === 0) {
    state.over = true;
    setTimeout(win, 600);
  }
}

/** If a triple is still waiting for its animation, pop it right now. */
function flushPending() {
  if (state.pending) popMatched();
}

function undo() {
  if (state.helpers.undo <= 0) return false;
  flushPending();
  let h;
  while (state.history.length) {
    const cand = state.history.pop();
    if (state.tiles[cand.id].where === 'tray') { h = cand; break; }
  }
  if (!h) { updateHUD(); return false; }
  const t = state.tiles[h.id];
  state.tray.splice(state.tray.indexOf(t.id), 1);
  t.where = h.from;
  if (h.from === 'parked') { state.parked.push(t.id); els.parked.classList.add('active'); }
  state.helpers.undo--;
  state.over = false;
  audio.helper();
  layoutAll();
  updateCovered();
  updateHUD();
  return true;
}

function popOut() {
  if (state.helpers.pop <= 0 || state.tray.length === 0 || state.parked.length > 0) return false;
  flushPending();
  const ids = state.tray.splice(0, PARK_SIZE);
  for (const id of ids) { state.tiles[id].where = 'parked'; state.parked.push(id); }
  state.helpers.pop--;
  state.over = false;
  audio.helper();
  els.parked.classList.add('active');
  setTimeout(() => { layoutAll(); updateCovered(); }, 260);
  updateHUD();
  return true;
}

function reshuffleBoard() {
  if (state.helpers.shuffle <= 0) return false;
  const boardTiles = state.tiles.filter(t => t.where === 'board');
  if (boardTiles.length < 2) return false;
  const counts = {};
  for (const t of boardTiles) counts[t.type] = (counts[t.type] || 0) + 1;
  const partial = [], full = [];
  for (const type in counts) {
    let c = counts[type];
    while (c >= 3) { full.push([type, 3]); c -= 3; }
    if (c > 0) partial.push([type, c]);
  }
  const groups = shuffle(partial).concat(shuffle(full));
  let res = null;
  for (let a = 0; a < 40 && !res; a++) res = assignTypes(boardTiles, groups);
  if (res) {
    boardTiles.forEach((t, i) => { t.type = res.types[i]; });
  } else {
    const types = shuffle(boardTiles.map(t => t.type));
    boardTiles.forEach((t, i) => { t.type = types[i]; });
  }
  for (const t of boardTiles) t.el.querySelector('.face').innerHTML = faceSVG(t.type);
  state.helpers.shuffle--;
  audio.helper(); buzz(15);
  // little flourish
  for (const t of boardTiles) { t.el.classList.remove('shake'); void t.el.offsetWidth; t.el.classList.add('shake'); }
  updateCovered();
  updateHUD();
  return true;
}

// ============================================================
// Modals
// ============================================================
function showModal(title, textStr, buttons) {
  els.mTitle.textContent = title;
  els.mText.textContent = textStr;
  els.mButtons.innerHTML = '';
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mbtn ' + (b.cls || '');
    btn.textContent = b.label;
    if (b.disabled) btn.disabled = true;
    btn.addEventListener('click', () => { audio.ensure(); hideModal(); b.onClick && b.onClick(); });
    els.mButtons.appendChild(btn);
  }
  els.modal.classList.remove('hidden');
}
function hideModal() { els.modal.classList.add('hidden'); }

function showIntro() {
  showModal('ไพ่นกกระจอก จับ 3',
    'แตะไพ่ที่ไม่มีไพ่ทับอยู่ เพื่อนำลงถาดด้านล่าง\nเมื่อมีไพ่เหมือนกันครบ 3 ใบ ไพ่จะหายไป\nระวัง! ถ้าถาดเต็ม 7 ใบ จะแพ้ทันที',
    [
      { label: `เริ่มเล่น ด่าน ${state.level}`, onClick: () => startLevel(state.level) },
      ...(state.level > 1 ? [{ label: 'เริ่มใหม่ตั้งแต่ด่าน 1', cls: 'plain', onClick: () => startLevel(1) }] : []),
    ]);
}

function win() {
  audio.win(); buzz([30, 50, 30, 50, 80]);
  const next = state.level + 1;
  state.level = next;
  save();
  showModal('เก่งมาก! 🎉', `ผ่านด่าน ${next - 1} แล้ว\nพร้อมไปด่านต่อไปหรือยัง?`, [
    { label: `ไปด่าน ${next}`, onClick: () => startLevel(next) },
  ]);
}

function gameOver() {
  audio.lose(); buzz(120);
  const buttons = [];
  if (state.helpers.pop > 0 && state.parked.length === 0) {
    buttons.push({ label: `นำไพ่ออก 3 ใบ (เหลือ ${state.helpers.pop} ครั้ง)`, onClick: () => popOut() });
  }
  if (state.helpers.undo > 0) {
    buttons.push({ label: `ย้อนกลับ 1 ใบ (เหลือ ${state.helpers.undo} ครั้ง)`, cls: 'secondary', onClick: () => undo() });
  }
  buttons.push({ label: 'เล่นด่านนี้ใหม่', cls: buttons.length ? 'plain' : '', onClick: () => startLevel(state.level) });
  showModal('ถาดเต็มแล้ว 😅', 'ไม่เป็นไร ลองใหม่ได้เสมอ', buttons);
}

function confirmRestart() {
  showModal('เริ่มด่านนี้ใหม่?', `จะเริ่มด่าน ${state.level} ใหม่ตั้งแต่ต้น`, [
    { label: 'เริ่มใหม่', onClick: () => startLevel(state.level) },
    { label: 'เล่นต่อ', cls: 'plain' },
  ]);
}

// ============================================================
// Events
// ============================================================
els.stage.addEventListener('click', (e) => {
  const el = e.target.closest('.tile');
  if (!el) return;
  audio.ensure();
  onTileTap(state.tiles[+el.dataset.id]);
});
els.undo.addEventListener('click', () => { audio.ensure(); undo(); });
els.shuffle.addEventListener('click', () => { audio.ensure(); reshuffleBoard(); });
els.pop.addEventListener('click', () => { audio.ensure(); popOut(); });
els.restart.addEventListener('click', () => { audio.ensure(); confirmRestart(); });
els.sound.addEventListener('click', () => {
  audio.on = !audio.on; audio.ensure(); save(); updateHUD();
  if (audio.on) audio.tap();
});

let resizeTimer = 0;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (state.bbox) layoutAll(true); }, 60);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Debug/test hook (harmless in production)
window.__mj = {
  state,
  tap: (id) => onTileTap(state.tiles[id]),
  start: (L) => startLevel(L),
  undo, popOut, reshuffleBoard, levelParams, helpersFor, generateLevel, assignTypes,
};

loadSave();
updateHUD();
showIntro();
})();
