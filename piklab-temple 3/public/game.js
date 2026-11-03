/* Chùa Tổ Nghiệp Designer — client game 3D */
(() => {
'use strict';
const L = window.LAYOUT, { M4, P, Geo, norm, cross } = window.ENGINE, W3 = window.WORLD, T = W3.T;
const $ = s => document.querySelector(s);
const cv = $('#game'), ov = $('#overlay'), octx = ov.getContext('2d');
const mm = $('#minimap'), mctx = mm.getContext('2d');
const K = .01;

/* ---------------- Trạng thái ---------------- */
// Bảng màu áo truyền thống: nâu sồng, lam, vàng nghệ, trắng ngà, đỏ son, lục, chàm, tím than
const RU = window.RULES;
const COLORS = RU.COLORS.filter(c => !c.price).map(c => c.id);   // màu cơ bản khi tạo nhân vật
const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
const sget = k => { try { return store && store.getItem(k); } catch (e) { return null; } };
const sset = (k, v) => { try { store && store.setItem(k, v); } catch (e) {} };
let pid = sget('pk_pid');
if (!pid) { pid = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'p' + Math.random().toString(36).slice(2) + Date.now().toString(36)); sset('pk_pid', pid); }
const DEMO_FORCED = window.PK_FORCE_DEMO || location.protocol === 'file:' || /[?&]demo/.test(location.search);

const S = {
  net: null, demo: false, me: null, players: new Map(), plots: [], incense: [], altar: [],
  room: null, rooms: [], profile: null, shopUrl: '#', serverOffset: 0, regrowMs: 120000,
  keys: {}, target: null, cam: { x: L.spawn.x * K, z: L.spawn.y * K - 1 }, dist: 15,
  particles: [], floaters: [], emotes: new Map(), animalFx: [], interact: null, busy: false,
  sound: sget('pk_sound') !== '0', leaves: [], tug: { offers: [], match: null }, prices: { fortune: 5, shout: 1, sweep: 2 }, says: new Map(), inMatch: null, lastSent: 0, sentState: '', bellRing: -1e9, digAnim: 0, roofA: 1, gateA: 1, hallK: 0,
  weather: { kind: 'clear', city: '', temp: null }, wxPreview: null, wxSnow: 0, wxWet: 0, halos: new Map(), farts: [], mg: null, fishFx: [], samhoiSort: 'new', stink: new Map(), poopFx: [], briefs: []
};
let choice = { color: COLORS.includes(sget('pk_color')) ? sget('pk_color') : COLORS[0], hat: ['none', 'non'].includes(sget('pk_hat')) ? sget('pk_hat') : 'none', hair: sget('pk_hair') === 'bald' ? 'bald' : 'bun', name: sget('pk_name') || '' };

/* ---------------- Renderer & cảnh ---------------- */
let R = null, scene = null, dyn = null;
/* ---- Chất lượng đồ hoạ (giảm nóng máy) ---- */
const GFX = {
  high: { name: 'Đẹp', icon: '✨', dpr: 1.75, shadow: 2048, pcf: 1, fps: 60, idleFps: 30, aa: true, blur: true, fx: 1 },
  mid:  { name: 'Cân bằng', icon: '⚖️', dpr: 1.25, shadow: 1024, pcf: 1, fps: 30, idleFps: 30, aa: true, blur: false, fx: 1 },
  low:  { name: 'Tiết kiệm pin', icon: '🔋', dpr: 1, shadow: 1024, pcf: 0, fps: 30, idleFps: 20, aa: false, blur: false, fx: .4 }
};
let gfxKey = ['high', 'mid', 'low'].includes(sget('pk_gfx')) ? sget('pk_gfx') : 'mid';
let G = GFX[gfxKey];
try { R = window.ENGINE.createRenderer(cv, { antialias: G.aa, shadow: G.shadow, pcf: G.pcf, power: gfxKey === 'high' ? 'high-performance' : 'low-power' }); } catch (e) { console.error(e); }
document.body.classList.toggle('noblur', !G.blur);
if (!R) { document.body.insertAdjacentHTML('beforeend', '<div class="nogl">Trình duyệt chưa hỗ trợ WebGL2. Hãy mở bằng Chrome, Safari 15+ hoặc Firefox mới.</div>'); }
else { scene = W3.build(R, L); dyn = W3.dynamicMeshes(R); }

// bài vị
const plaqueBack = R && R.mesh(new Geo().add(P.rbox(.4, .68, .06, .04, 2), '#5e180f', T(0, 0, -.01)).add(P.rbox(.46, .08, .2, .03, 1), '#e8b54a', T(0, -.36, 0)));
const plaqueQuad = R && R.mesh(new Geo().add(P.quad(.36, .63), '#ffffff', T(0, 0, .025)));
let plaques = [];
const HS = L.HALL.s, HM3 = M4.trs(L.HALL.ox * K, 0, L.HALL.oy * K, 0, HS, HS, HS);   // chánh điện dựng ở toạ độ gốc rồi phóng to & dời
const hw = (x, y, z) => [L.HALL.ox * K + HS * x, HS * y, L.HALL.oy * K + HS * z];
const imgCache = {};
function rebuildPlaques() {
  if (!R) return;
  const n = S.altar.length || 1, span = 4.0;
  plaques = S.altar.map((a, i) => {
    const lx = 10 - span / 2 + (i + .5) * span / n, m = M4.mul(HM3, T(lx, 1.98, 1.5, 0, 1, 1, 1, -.16));
    const pl = { m, lx, tex: R.texture(W3.plaqueCanvas(a, null)), app: a };
    if (a.image) loadImg(a.image, img => { const t = R.texture(W3.plaqueCanvas(a, img)); if (t) pl.tex = t; });
    return pl;
  });
}
function loadImg(src, cb) {
  if (imgCache[src]) { if (imgCache[src].complete && imgCache[src].naturalWidth) cb(imgCache[src]); else imgCache[src].addEventListener('load', () => cb(imgCache[src])); return; }
  const im = new Image(); if (!/^data:/.test(src)) im.crossOrigin = 'anonymous';
  im.onload = () => cb(im); im.src = src; imgCache[src] = im;
}

/* ---------------- Ánh sáng theo giờ Việt Nam ---------------- */
const SKY_KEYS = [ // giờ, màu nắng, trời, đất, phơi sáng, bão hoà, đèn, nền trên, nền dưới
  [0, [.16, .2, .36], [.12, .15, .27], [.06, .06, .09], 1.0, .62, 1.7, '#1c2232', '#0f121c'],
  [4.8, [.2, .22, .38], [.16, .18, .3], [.08, .08, .11], 1.0, .64, 1.6, '#262c42', '#141826'],
  [6.0, [1.0, .66, .5], [.42, .4, .5], [.24, .2, .2], 1.0, .72, .8, '#cdb2a8', '#7d7487'],
  [8.0, [1.28, 1.18, 1.0], [.5, .54, .6], [.32, .28, .23], 1.0, .8, .3, '#c7ccc6', '#959d99'],
  [12.0, [1.38, 1.32, 1.16], [.52, .56, .62], [.34, .3, .25], 1.0, .8, .25, '#cdd1cb', '#a0a7a2'],
  [16.0, [1.35, 1.2, .95], [.5, .51, .56], [.33, .27, .22], 1.0, .8, .3, '#d1c8b8', '#a0988b'],
  [17.6, [1.3, .88, .6], [.45, .4, .46], [.29, .22, .18], 1.0, .78, .7, '#d4b29c', '#8f7470'],
  [18.6, [.55, .4, .48], [.3, .28, .4], [.14, .12, .15], 1.0, .7, 1.25, '#5f5370', '#352f44'],
  [19.6, [.16, .2, .36], [.12, .15, .27], [.06, .06, .09], 1.0, .62, 1.7, '#1c2232', '#0f121c'],
  [24, [.16, .2, .36], [.12, .15, .27], [.06, .06, .09], 1.0, .62, 1.7, '#1c2232', '#0f121c']
];
const PREVIEW = [null, 6.3, 10, 17.4, 21];
let previewIdx = 0;
function vnHour() { const d = new Date(Date.now() + 7 * 3600e3); return d.getUTCHours() + d.getUTCMinutes() / 60; }
const lerp = (a, b, k) => a + (b - a) * k, lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const hex2 = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)), rgb = c => `rgb(${c.map(v => Math.round(v)).join(',')})`;
let lastBg = '';
function applySky() {
  const h = PREVIEW[previewIdx] != null ? PREVIEW[previewIdx] : vnHour();
  let i = 0; while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= h) i++;
  const A = SKY_KEYS[i], B = SKY_KEYS[i + 1], k = (h - A[0]) / (B[0] - A[0] || 1);
  const e = R.env;
  e.sunC = lerp3(A[1], B[1], k); e.sky = lerp3(A[2], B[2], k); e.gnd = lerp3(A[3], B[3], k);
  e.exp = lerp(A[4], B[4], k); e.sat = lerp(A[5], B[5], k); e.glow = lerp(A[6], B[6], k);
  const day = h >= 6 && h <= 18.4;
  if (day) { const a = (h - 6) / 12.4 * Math.PI; e.sun = norm([Math.cos(a) * .95, Math.max(.55, Math.sin(a) * 1.3), .3]); }
  else e.sun = norm([-.45, 1, .35]);
  // thời tiết: mây/mưa/sương làm dịu nắng, mưa làm ướt nền, tuyết phủ trắng dần
  const wk = curWeather(), WM = { clear: [1, 1, 1], cloudy: [.7, .92, .9], rain: [.5, .82, .82], storm: [.36, .7, .74], fog: [.62, .9, .72], snow: [.78, 1.02, .8] }[wk] || [1, 1, 1];
  e.sunC = e.sunC.map(v => v * WM[0]); e.sky = e.sky.map(v => v * WM[1]); e.sat *= WM[2];
  S.wxWet += ((wk === 'rain' || wk === 'storm' ? 1 : 0) - S.wxWet) * .04; S.wxSnow += ((wk === 'snow' ? 1 : 0) - S.wxSnow) * .015;
  if (S.wxPreview) { S.wxWet = wk === 'rain' || wk === 'storm' ? 1 : 0; S.wxSnow = wk === 'snow' ? 1 : 0; }
  e.wet = S.wxWet; e.snow = S.wxSnow;
  S.night = Math.max(0, Math.min(1, (e.glow - .3) / 1.4));
  const gray = WM[0] < .9 ? (1 - WM[0]) * .6 : 0, mixG = c => c.map(v => v * (1 - gray) + 150 * gray);
  const bg = `radial-gradient(120% 90% at 50% 35%, ${rgb(mixG(lerp3(hex2(A[7]), hex2(B[7]), k)))} 0%, ${rgb(mixG(lerp3(hex2(A[8]), hex2(B[8]), k)))} 100%)`;
  if (bg !== lastBg) { document.body.style.background = bg; lastBg = bg; }
  const hh = Math.floor(h), mm2 = Math.floor((h - hh) * 60);
  const icon = h < 5 || h >= 19.5 ? '🌙' : h < 7 ? '🌅' : h < 17 ? '☀️' : h < 18.8 ? '🌇' : '🌙';
  const label = `${icon} ${String(hh).padStart(2, '0')}:${String(mm2).padStart(2, '0')}${previewIdx ? ' (xem thử)' : ''}`;
  const el = $('#clockBtn'); if (el && el.textContent !== label) el.textContent = label;
}

function curWeather() { return S.wxPreview || (S.weather && S.weather.kind) || 'clear'; }
const WX_ORDER = ['rain', 'storm', 'fog', 'snow', 'cloudy', 'clear'];
function showWeatherChip() {
  const k = curWeather(), w0 = RU.WEATHER[k] || RU.WEATHER.clear, wt = S.weather || {};
  const w = k === 'clear' && S.night > .5 ? ['🌙', w0[1]] : k === 'cloudy' && S.night > .5 ? ['☁️', w0[1]] : w0;
  const narrow = innerWidth < 640;
  const txt = S.wxPreview ? `${w[0]} ${narrow ? '' : w[1] + ' '}(thử)` : narrow ? `${w[0]}${wt.temp != null ? ' ' + wt.temp + '°' : ''}` : `${w[0]} ${wt.temp != null ? wt.temp + '°' : w[1]}${wt.city ? ' · ' + wt.city : ''}`;
  const el = $('#wxBtn'); if (el && el.textContent !== txt) el.textContent = txt;
  $('#wxLayer').classList.toggle('fog', k === 'fog');
}

/* ---------------- Âm thanh ---------------- */
let AC = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function tone(freq, dur, type = 'sine', vol = .2, delay = 0) {
  if (!S.sound || !ac()) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + .05);
}
// Âm "bủm": tổng hợp ngay trong trình duyệt (không cần file). Có file public/sounds/fart.mp3 thì dùng file đó.
const FART = { file: null, buf: null, ir: null };
function fartBuffer() {
  if (FART.buf) return FART.buf;
  const sr = AC.sampleRate, n = Math.floor(sr * .95), b = AC.createBuffer(1, n, sr), d = b.getChannelData(0);
  let ph = 0, fl = 0, lp = 0, seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const t = i / sr, u = t / .95;
    const f = 118 - 62 * u + 9 * Math.sin(t * 19) + (rnd() - .5) * 14;          // giọng trầm dần, run run
    ph += f / sr; fl += (30 + 10 * Math.sin(t * 7) + (rnd() - .5) * 18) / sr;   // tần số "rung môi"
    const flap = .5 + .5 * Math.tanh(5 * Math.sin(fl * Math.PI * 2));            // đóng mở như cánh bướm
    const saw = 2 * (ph % 1) - 1, noise = rnd() * 2 - 1;
    const env = Math.min(1, t / .012) * (u < .8 ? 1 - u * .25 : (1 - u) / .2 * .8) * (1 + .25 * Math.sin(t * 3.1));
    const x = (saw * .7 + noise * .45) * flap * env;
    lp += (x - lp) * .22; d[i] = Math.tanh(lp * 2.2) * .8;                       // lọc trầm + méo nhẹ cho "ướt"
  }
  return (FART.buf = b);
}
function reverbIR() {
  if (FART.ir) return FART.ir;
  const sr = AC.sampleRate, n = Math.floor(sr * 2.4), b = AC.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6) * (i < sr * .02 ? i / (sr * .02) : 1); }
  return (FART.ir = b);
}
function loadFartFile() { if (!FART.hasFile || !ac() || FART.tried) return; FART.tried = true; fetch('sounds/fart.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(a => AC.decodeAudioData(a)).then(b => { FART.file = b; }).catch(() => {}); }
const sfx = {
  bell() { [[110, 6, .3], [220.6, 4.5, .15], [331, 3, .08], [440.9, 2.4, .05], [598, 1.6, .035]].forEach(([f, d, v]) => tone(f, d, 'sine', v)); },
  mo() { tone(820, .12, 'triangle', .22); tone(410, .2, 'sine', .16); },
  dig() { tone(90, .18, 'triangle', .28); tone(60, .25, 'sine', .22, .05); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .6, 'triangle', .14, i * .09)); },
  soft() { tone(392, .5, 'sine', .1); tone(523, .7, 'sine', .09, .12); },
  pop() { tone(660, .08, 'square', .04); },
  shout() { tone(180, .25, 'sawtooth', .05); tone(240, .2, 'square', .03, .05); },
  tick() { tone(520 + Math.random() * 80, .05, 'triangle', .05); },
  sweep() { tone(1800, .15, 'triangle', .02); tone(1400, .18, 'triangle', .02, .12); },
  fart(vol = 1) {   // trượt nhịp chuông: tiếng "bủm" kiểu meme — rung môi + vang phòng tắm
    if (!S.sound || !ac()) return;
    const out = AC.createGain(); out.gain.value = .9 * vol; out.connect(AC.destination);
    const src = AC.createBufferSource(); src.buffer = FART.file || fartBuffer();
    if (!FART.file) { const dry = AC.createGain(), wet = AC.createGain(), cv = AC.createConvolver(); cv.buffer = reverbIR(); dry.gain.value = .85; wet.gain.value = .55; src.connect(dry).connect(out); src.connect(cv).connect(wet).connect(out); }
    else src.connect(out);
    src.start();
  },
  knock(acc) { tone(acc ? 980 : 760, .09, 'triangle', .25); tone(acc ? 490 : 380, .16, 'sine', .18); },
  bead() { tone(1250 + Math.random() * 60, .05, 'sine', .07); tone(2500, .03, 'sine', .02, .01); },
  thunder() { if (!S.sound || !ac()) return; [55, 41, 62].forEach((f, i) => tone(f, 2.2, 'sawtooth', .04, i * .18)); }
};

/* ---------------- Kết nối (server thật hoặc demo) ---------------- */
let welcomed = false;
const tokenKey = () => S.demo ? 'pk_token_demo' : 'pk_token';
function startDemo() {
  const ls = window.LocalServer(onMsg);
  S.net = { send: o => ls.send(o), local: ls };
  $('#demoBtn').classList.remove('hidden');
  ls.send({ t: 'hello', token: S.token });
}
function connect() {
  if (S.demo) return startDemo();
  if (S.kicked) return;
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  S.net = { send: o => ws.readyState === 1 && ws.send(JSON.stringify(o)), ws };
  ws.onopen = () => { $('#conn').classList.add('hidden'); ws.send(JSON.stringify({ t: 'hello', token: S.token })); };
  ws.onmessage = e => onMsg(JSON.parse(e.data));
  ws.onclose = () => { if (S.kicked || S.authFailed) return; $('#conn').classList.remove('hidden'); setTimeout(connect, 2000); };
}
async function authCall(kind, body) {
  if (S.demo) return window.LocalAuth(kind, body);
  try { const r = await fetch('/api/auth/' + kind, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return await r.json(); }
  catch (e) { return { error: 'Không kết nối được tới chùa, vui lòng thử lại.' }; }
}
const send = o => S.net && S.net.send(o);

// Chờ phản hồi cho các thao tác hay bị "im lặng" (khẩu nghiệp, thả cá): quá 3 giây thì báo
function expectReply(label) { clearTimeout(S.ackT); S.ackT = setTimeout(() => toast(`Chùa chưa phản hồi việc ${label}… thử lại nhé (nếu vẫn vậy, có thể server chưa được cập nhật)`), 3000); }
function onMsg(m) {
  if (S.ackT && (['toast', 'profile', 'tired'].includes(m.t) || ((m.t === 'say' || m.t === 'fish') && S.me && m.id === S.me.id))) { clearTimeout(S.ackT); S.ackT = null; }
  switch (m.t) {
    case 'welcome': {
      const keep = welcomed && S.me ? { x: S.me.x, y: S.me.y } : null; welcomed = true;
      S.me = Object.assign(m.you, keep || {}); S.me.walk = 0; S.me.yaw = Math.PI;
      S.players.clear(); m.players.forEach(addPlayer);
      S.plots = m.plots; S.incense = m.incense; S.altar = m.altar; S.room = m.room; S.rooms = m.rooms;
      S.shopUrl = m.shopUrl; setProfile(m.profile); S.serverOffset = m.serverTime - Date.now(); S.regrowMs = (m.regrowSec || 120) * 1000;
      document.title = `${m.room.name} · ${m.templeName}`;
      S.leaves = m.leaves || []; S.tug = m.tug || { offers: [], match: null }; S.prices = m.prices || S.prices; $('#sayInput').placeholder = `Enter -${S.prices.shout || 1} phước`; S.leafRegrowMs = (m.leafRegrowSec || 45) * 1000;
      renderRooms(); buildAppGrid(); rebuildPlaques();
      if (m.weather) { S.weather = m.weather; showWeatherChip(); }
      S.briefs = m.briefs || [];
      // server và trang game phải cùng phiên bản — nếu lệch thì báo rõ thay vì im lặng
      if (m.ver !== RU.VERSION) { const el = document.createElement('div'); el.className = 'ver-warn'; el.innerHTML = `⚠️ Máy chủ đang chạy phiên bản cũ (${esc(m.ver || 'trước 2.2')}), trang game là ${RU.VERSION}. Phóng sinh, sám hối, khẩu nghiệp mọi nơi… sẽ không chạy cho tới khi <b>server.js</b> được cập nhật và deploy lại.`; document.body.appendChild(el); }
      if (!keep && S.me.y > L.GATE_Y) setTimeout(() => ticker('Bạn đang ở chợ trước cổng chùa — đi thẳng lên phía trên để vào chùa 🛕'), 1200);
      if (m.demo) ticker('Bạn đang ở bản DEMO offline · bạn đồng tu là bot mô phỏng 🛕');
      else if (m.room.num > 1 && !keep) ticker(`Chùa 1 đã đông đủ — bạn được mời sang khuôn viên ${m.room.name} 🛕`);
      break;
    }
    case 'join': addPlayer(m.p); ticker(`${m.p.name} vừa bước vào chùa`); break;
    case 'leave': S.players.delete(m.id); break;
    case 's': for (const [id, x, y, dir, mv] of m.p) { const p = S.players.get(id); if (p) { p.tx = x; p.ty = y; p.dir = dir; p.moving = !!mv; } } break;
    case 'rooms': S.rooms = m.rooms; renderRooms(); break;
    case 'emote': S.emotes.set(m.id, { e: m.e, t: performance.now() }); break;
    case 'incense': {
      S.incense.push(m.stick);
      S.emotes.set(m.by, { e: 'bow', t: performance.now() });
      const sp = stickSpot(m.stick.app);
      if (m.stick.wish) S.floaters.push({ x: sp.x, y: sp.y + .7, z: sp.z, text: `“${m.stick.wish}”`, sub: m.stick.app === 'all' ? `— ${m.stick.by} kính chư vị Tổ Nghiệp` : `— ${m.stick.by} cầu Tổ ${m.stick.appName}`, t: performance.now(), life: 9000 });
      for (let i = 0; i < 18; i++) spark(sp.x, sp.y + .1, sp.z, '#ffd27a');
      sfx.mo();
      break;
    }
    case 'incenseAll': S.incense = m.list; break;
    case 'plot': {
      S.plots[m.plot.id] = m.plot;
      if (m.plot.state === 'dug') { const d = L.plots[m.plot.id]; for (let i = 0; i < 24; i++) dirt(d.x * K, d.y * K); if (m.by !== 'me' && (!S.me || m.by !== S.me.id)) sfx.dig(); }
      break;
    }
    case 'bell': S.bellRing = performance.now(); sfx.bell(); if (m.halo) S.halos.set(m.id, performance.now()); ticker(`🔔 ${m.by} thỉnh chuông đúng nhịp — hào quang toả sáng ✨`); break;
    case 'bellFart': {
      const p = S.me && m.id === S.me.id ? S.me : S.players.get(m.id);
      if (p) { S.farts.push({ id: m.id, t: performance.now() }); const near = !S.me || Math.hypot(p.x - S.me.x, p.y - S.me.y) < 700; if (near && (!S.me || m.id !== S.me.id)) sfx.fart(.6); }
      if (!S.me || m.id !== S.me.id) ticker(`💨 ${m.by} thỉnh chuông lệch nhịp…`);
      break;
    }
    case 'bellGo': S.busy = false; clearTimeout(S.bellWaitT); setProfile(m.profile); bellRun(m); break;
    case 'bellNo': S.busy = false; clearTimeout(S.bellWaitT); mgClose(); toast(m.msg); break;
    case 'bellWait': S.busy = false; clearTimeout(S.bellWaitT); bellReady(m.msg); break;
    case 'bellResult': setProfile(m.profile); bellResult(m); break;
    case 'pose': { const p = S.me && m.id === S.me.id ? S.me : S.players.get(m.id); if (p) { p.pose = m.pose; p.seat = m.seat; if (m.x !== undefined && p !== S.me) { p.x = p.tx = m.x; p.y = p.ty = m.y; } if (m.pose === 'sit') p.yaw = Math.PI; if (m.pose === 'fish') p.yaw = 0; } break; }
    case 'stink': { if (m.ms) S.stink.set(m.id, performance.now() + m.ms); else S.stink.delete(m.id); if (m.plot !== undefined) S.poopFx.push({ plot: m.plot, t: performance.now() }); break; }
    case 'briefs': S.briefs = m.briefs || []; break;
    case 'cauBite': setProfile(m.profile); cauBite(m); break;
    case 'cauNo': cauMsg(m.msg); S.cauState = 'idle'; cauRender(); break;
    case 'cauResult': setProfile(m.profile); cauResult(m); break;
    case 'weather': S.weather = m.w; showWeatherChip(); applySky(); if (!S.wxPreview) ticker(`${(RU.WEATHER[m.w.kind] || RU.WEATHER.clear)[0]} Thời tiết ${m.w.city}: ${(RU.WEATHER[m.w.kind] || RU.WEATHER.clear)[1].toLowerCase()}`); break;
    case 'fortunePick': S.busy = false; setProfile(m.profile); openFortuneBoard(); break;
    case 'samhoi': S.samhoiList = m.list; S.samhoiMine = m.mine; if (S.xOpen === 'samhoi') renderSamhoi(); break;
    case 'samhoiNew': if (S.xOpen === 'samhoi') send({ t: 'samhoiList', sort: S.samhoiSort }); break;
    case 'penResult': setProfile(m.profile); penResult(m); break;
    case 'fish': fishFx(m); break;
    case 'fed': {
      S.animalFx.push({ id: m.animal, t: performance.now() });
      if (S.me && m.by !== S.me.id) ticker(`🥬 ${m.name} vừa cho ${L.animals.find(a => a.id === m.animal).name} ăn`);
      break;
    }
    case 'feed': ticker(m.msg); break;
    case 'authError': S.authFailed = true; sset(tokenKey(), ''); S.token = ''; backToIntro(m.msg); break;
    case 'kicked': S.kicked = true; $('#conn').classList.add('hidden'); $('#resultCard').innerHTML = m.banned ? `<div class="big">🔒</div><h2>Tài khoản đã bị khoá</h2><p class="muted">${esc(m.msg)}</p>` : `<div class="big">🙏</div><h2>Bạn đã vào chùa ở nơi khác</h2><p class="muted">${esc(m.msg)} Mỗi tài khoản chỉ ở một nơi cùng lúc để tránh spam lượt đào.</p><button class="primary" onclick="location.reload()">Vào lại tại đây</button>`; if (m.banned) sset(tokenKey(), ''); $('#resultModal').classList.remove('hidden'); break;
    case 'toast': toast(m.msg); S.busy = false; break;
    case 'profile': setProfile(m.profile); if (m.msg) toast(m.msg); S.busy = false; if (S.xOpen === 'fish') openFish(); break;
    case 'digResult': S.busy = false; setProfile(m.profile); showDigResult(m); break;
    case 'look': { const p = S.me && m.id === S.me.id ? S.me : S.players.get(m.id); if (p) { p.color = m.color; p.hat = m.hat; p.hair = m.hair; p.outfit = m.outfit; } break; }
    case 'say': S.says.set(m.id, { text: m.text, t: performance.now() }); sfx.shout(); break;
    case 'leaf': S.leaves[m.leaf.id] = m.leaf; if (m.leaf.state === 'swept') { const d = L.leaves[m.leaf.id]; for (let i = 0; i < 14; i++) S.particles.push({ x: d.x * K + (Math.random() - .5) * .4, y: .1, z: d.y * K + (Math.random() - .5) * .3, vx: (Math.random() - .5) * 2, vy: 1 + Math.random() * 1.5, vz: (Math.random() - .5) * 1.5, life: 1.2, age: 0, kind: 'spark', c: ['#c9a43a', '#b5832e', '#8fa64a'][i % 3], r: 3 }); if (m.by !== S.me.id) sfx.sweep(); } break;
    case 'fortune': S.busy = false; setProfile(m.profile); openFortuneBoard(m.no); break;
    case 'tired': S.busy = false; clearTimeout(S.bellWaitT); if (S.mg === 'bell') mgClose(); setProfile(m.profile); showTired(); break;
    case 'tugState': S.tug = m.tug; if (m.serverTime) S.serverOffset = m.serverTime - Date.now(); onTugState(); break;
    case 'tugPos': if (S.tug && S.tug.match) { S.tug.match.pos = m.pos; S.tug.match.ca = m.ca; S.tug.match.cb = m.cb; } break;
    case 'tugEnd': onTugEnd(m); break;
  }
}
function addPlayer(p) { p.tx = p.x; p.ty = p.y; p.walk = 0; p.yaw = p.pose === 'fish' ? 0 : Math.PI; if (p.stink) S.stink.set(p.id, performance.now() + p.stink); S.players.set(p.id, p); }
function setProfile(pr) {
  S.profile = pr; $('#phuoc').textContent = pr.phuoc; $('#rau').textContent = pr.rau; $('#digs').textContent = `${pr.digsLeft}/${pr.digsPerDay}`;
  S.stAt = Date.now(); showStamina();
  const acc = pr.today && pr.today.accepted;
  $('#qBtn').classList.toggle('hidden', !acc); if (acc) $('#qNo').textContent = `Quẻ số ${acc.no}`;
  if (S.me && pr.look && pr.look.color) Object.assign(S.me, pr.look);
  if (S.shopKind && !$('#shopModal').classList.contains('hidden')) openShop(S.shopKind);
  if (!$('#tugModal').classList.contains('hidden')) renderTug();
}
function curStamina() { const p = S.profile; if (!p || p.st === undefined) return 100; return Math.min(p.stMax || 100, p.st + Math.floor((Date.now() - (S.stAt || Date.now())) / RU.REGEN_MS)); }
function showStamina() { const v = curStamina(), mx = (S.profile && S.profile.stMax) || 100; $('#st').textContent = v; $('#stBar').style.width = (v / mx * 100) + '%'; document.querySelector('.stam').classList.toggle('low', v < 15); }

/* ---------------- Hạt hiệu ứng (3D, vẽ trên overlay) ---------------- */
function spark(x, y, z, c) { S.particles.push({ x, y, z, vx: (Math.random() - .5) * 2, vy: 1 + Math.random() * 2, vz: (Math.random() - .5) * 2, life: 1, age: 0, kind: 'spark', c, r: 3 }); }
function dirt(x, z) { S.particles.push({ x: x + (Math.random() - .5) * .3, y: .25, z: z + (Math.random() - .5) * .2, vx: (Math.random() - .5) * 2.4, vy: 1.5 + Math.random() * 2, vz: (Math.random() - .5) * 1.6, life: .9, age: 0, kind: 'dirt', r: 3 + Math.random() * 3 }); }
function stepParticles(dt) {
  for (const p of S.particles) {
    p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.kind === 'smoke') { p.vx += Math.sin(p.age * 2 + p.y * 3) * .25 * dt; p.r += dt * 6; }
    else if (p.kind === 'petal') { p.vx = Math.sin(p.age * 2 + p.seed) * .3; if (p.y < .02) { p.vy = 0; p.y = .02; p.vx = 0; p.vz = 0; } }
    else { p.vy -= 7 * dt; if (p.y < .05 && p.kind === 'dirt') { p.y = .05; p.vy = 0; p.vx *= .8; p.vz *= .8; } }
  }
  S.particles = S.particles.filter(p => p.age < p.life);
  if (S.particles.length > 700) S.particles.splice(0, S.particles.length - 700);
  // cánh hoa đào rơi
  if (Math.random() < .25 * G.fx) {
    const t = L.trees.filter(t => t.kind === 2)[Math.random() * 5 | 0] || L.trees[0];
    S.particles.push({ x: t.x * K + (Math.random() - .5) * 1.4, y: 2 + Math.random() * .5, z: t.y * K + (Math.random() - .5) * 1, vx: 0, vy: -.35, vz: .1, life: 9, age: 0, kind: 'petal', r: 3.5, seed: Math.random() * 7 });
  }
}

/* ---------------- Camera ---------------- */
const cam = { vp: null, eye: [0, 0, 0], f: [0, 0, -1], r: [1, 0, 0], u: [0, 1, 0], fov: 30 * Math.PI / 180, asp: 1 };
let dpr = 1;
function resize() {
  dpr = Math.min(G.dpr, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ov.width = innerWidth * dpr; ov.height = innerHeight * dpr;
  cam.asp = innerWidth / innerHeight;
  S.dist = cam.asp < .8 ? 21 : cam.asp < 1.2 ? 18 : 15;
}
addEventListener('resize', resize); resize();
function updateCamera(dt) {
  if (S.me) {
    const tx = S.me.x * K, tz = S.me.y * K - .3 - S.hallK * 1.5, k = Math.min(1, dt * 4);
    S.cam.x += (tx - S.cam.x) * k; S.cam.z += (tz - S.cam.z) * k;
  }
  S.cam.x = Math.max(3, Math.min(L.W * K - 3, S.cam.x)); S.cam.z = Math.max(1.6, Math.min(L.H * K - 2, S.cam.z));
  const pitch = .8 - S.hallK * .12, tgt = [S.cam.x, .3 + S.hallK * .9, S.cam.z], dist = S.dist * (1 - S.hallK * .2);
  cam.eye = [tgt[0], tgt[1] + Math.sin(pitch) * dist, tgt[2] + Math.cos(pitch) * dist];
  cam.vp = M4.mul(M4.persp(cam.fov, cam.asp, 1.5, 140), M4.lookAt(cam.eye, tgt, [0, 1, 0]));
  cam.f = norm([tgt[0] - cam.eye[0], tgt[1] - cam.eye[1], tgt[2] - cam.eye[2]]); cam.r = norm(cross(cam.f, [0, 1, 0])); cam.u = cross(cam.r, cam.f);
  cam.tgt = tgt;
}
function project(x, y, z) {
  const m = cam.vp, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw <= 0) return null;
  return [(cx / cw * .5 + .5) * innerWidth, (1 - (cy / cw * .5 + .5)) * innerHeight];
}
function pick(clientX, clientY) {
  const nx = clientX / innerWidth * 2 - 1, ny = 1 - clientY / innerHeight * 2, th = Math.tan(cam.fov / 2);
  const d = norm([0, 1, 2].map(i => cam.f[i] + cam.r[i] * nx * th * cam.asp + cam.u[i] * ny * th));
  if (d[1] >= -1e-4) return null;
  const t = -cam.eye[1] / d[1];
  return { x: (cam.eye[0] + d[0] * t) / K, y: (cam.eye[2] + d[2] * t) / K };
}

/* ---------------- Va chạm & di chuyển ---------------- */
function collide(x, y) { for (const s of L.solids) if (x + 12 > s.x && x - 12 < s.x + s.w && y + 4 > s.y && y - 8 < s.y + s.h) return true; return false; }
const HL = L.hall;
const HP0 = L.hp(726, 250), HP1 = L.hp(1274, 500), HP2 = L.hp(1000, 548);
const WH = L.wharf;
const groundH = (x, y) => (Math.abs(x - WH.x) < WH.w / 2 && y > L.river.y0 - 40 && y < WH.y + WH.h / 2) ? .2 : (x > HP0.x && x < HP1.x && y > HP0.y && y < HP1.y) ? .14 * HS : (Math.abs(x - L.altar.x) < 320 * HS && y >= HP1.y && y < HP2.y ? .07 * HS : 0);
function moveMe(dt) {
  const me = S.me; let dx = 0, dy = 0;
  if (S.inMatch || S.mg || me.pose === 'sit' || me.pose === 'fish') { me.moving = false; S.target = null; return; }   // đang kéo co / chơi minigame thì đứng yên
  if (S.keys.ArrowLeft || S.keys.KeyA) dx -= 1; if (S.keys.ArrowRight || S.keys.KeyD) dx += 1;
  if (S.keys.ArrowUp || S.keys.KeyW) dy -= 1; if (S.keys.ArrowDown || S.keys.KeyS) dy += 1;
  if (dx || dy) S.target = null;
  else if (S.target) { const ex = S.target.x - me.x, ey = S.target.y - me.y, d = Math.hypot(ex, ey); if (d < 6) S.target = null; else { dx = ex / d; dy = ey / d; } }
  const len = Math.hypot(dx, dy);
  me.moving = len > 0 && !S.busy;
  if (me.moving) {
    const sp = 200 * dt; dx = dx / len * sp; dy = dy / len * sp;
    const ox = me.x, oy = me.y;
    if (!collide(me.x + dx, me.y)) me.x += dx;
    if (!collide(me.x, me.y + dy)) me.y += dy;
    if (S.target && Math.hypot(me.x - ox, me.y - oy) < sp * .2) S.target = null;
    me.yaw = turn(me.yaw, Math.atan2(dx, dy), dt * 12);
    if (Math.abs(dx) > .01) me.dir = dx > 0 ? 1 : -1;
    me.walk += dt;
  }
  const now = performance.now(), st = `${me.x | 0},${me.y | 0},${me.dir},${me.moving}`;
  if (st !== S.sentState && now - S.lastSent > 80) { S.sentState = st; S.lastSent = now; send({ t: 'move', x: me.x, y: me.y, dir: me.dir, moving: me.moving }); }
}
function turn(a, b, k) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * Math.min(1, k); }

/* ---------------- Động vật ---------------- */
function animalPos(a, t) {
  const s = t / 1000, k = a.id.charCodeAt(0) + a.id.length * 13;
  return { x: a.x + Math.sin(s * .21 + k) * a.range + Math.sin(s * .53 + k * 2) * a.range * .3, y: a.y + Math.cos(s * .17 + k) * a.range * .45 };
}

/* ---------------- Tương tác ---------------- */
function findInteract(t) {
  const me = S.me, d = o => Math.hypot(me.x - o.x, me.y - o.y);
  const td = (S.profile && S.profile.today) || {};
  if (S.stink.has(me.id) && d(L.well) < 140) return { kind: 'wash', icon: '🧼', text: 'Rửa tay ở giếng cho hết ruồi', x: L.well.x, y: L.well.y, h: 1.4 };
  const seat = L.cauSeats.find(c => d(c) < 60);
  if (seat) { const occ = [...S.players.values()].find(p => p.pose === 'fish' && p.seat === seat.id); return occ ? { kind: 'wait', icon: '🎣', text: `Ghế của ${occ.name} — ngồi ghế bên cạnh câu chung nhé`, x: seat.x, y: seat.y, h: 1.0 } : { kind: 'cau', seat: seat.id, icon: '🎣', text: `Ngồi ghế câu brief (còn ${td.cauLeft !== undefined ? td.cauLeft : '?'} lượt)`, x: seat.x, y: seat.y, h: 1.0 }; }
  const cu = L.cushions.find(c => d(c) < L.cushionRadius);
  if (cu) return { kind: 'cushion', cushion: cu.id, icon: '🪷', text: 'Ngồi bồ đoàn: gõ mõ / lần tràng hạt', x: cu.x, y: cu.y, h: .9 };
  if (d(L.altar) < L.altar.radius && me.y < L.hall.y + L.hall.h) return { kind: 'incense', mode: 'app', icon: '🪔', text: 'Thắp hương riêng một vị tổ', x: L.altar.x, y: L.altar.y - 165 * HS, h: 2.8 };
  if (d(L.bowl) < L.bowl.radius) return { kind: 'incense', mode: 'all', icon: '🪔', text: 'Thắp hương chung (kính tất cả tổ)', x: L.bowl.x, y: L.bowl.y, h: 2.7 };
  if (d(L.bell) < L.bell.radius) return { kind: 'bell', icon: '🔔', text: `Thỉnh chuông${td.bellLeft !== undefined ? ` (còn ${td.bellLeft} lượt)` : ''}`, x: L.bell.x, y: L.bell.y, h: 6.0 };
  let best = null, bd = 1e9;
  L.plots.forEach(p => { const dd = d(p); if (dd < L.plotRadius && dd < bd) { bd = dd; best = p; } });
  if (best) {
    const st = S.plots[best.id];
    if (st && st.state === 'ripe') return { kind: 'dig', plot: best.id, icon: '⛏️', text: S.profile && S.profile.digsLeft > 0 ? `Cuốc đất (còn ${S.profile.digsLeft} lượt)` : 'Hết lượt đào hôm nay', x: best.x, y: best.y, h: .8 };
    return { kind: 'wait', icon: '🌱', text: 'Rau đang mọc lại…', x: best.x, y: best.y, h: .8 };
  }
  const MK = L.market;
  if (d({ x: L.samhoi.x, y: L.samhoi.y + 110 }) < 190) return { kind: 'samhoi', icon: '📜', text: 'Bảng Sám Hối: đọc & ghim lời sám hối', x: L.samhoi.x, y: L.samhoi.y, h: 2.4 };
  if (d({ x: MK.thayDo.x, y: MK.thayDo.y + 140 }) < 210) return { kind: 'pen', icon: '✒️', text: 'Học Pen Tool với Thầy Đồ', x: MK.thayDo.x, y: MK.thayDo.y - 60, h: 1.4 };
  if (d(L.release) < L.release.radius) return { kind: 'fish', icon: '🐟', text: `Thả cá phóng sinh${td.fishLeft !== undefined ? ` (còn ${td.fishLeft} lượt)` : ''}`, x: L.release.x, y: L.release.y + 30, h: .9 };
  if (d({ x: MK.fishSeller.x, y: MK.fishSeller.y + 70 }) < 170) return { kind: 'fish', icon: '🐟', text: 'Mua cá phóng sinh của Cô Ba', x: MK.fishSeller.x, y: MK.fishSeller.y, h: 1.5 };
  if (d({ x: MK.hat.x, y: MK.hat.y + 120 }) < 165) return { kind: 'shop', shop: 'hat', icon: '👒', text: 'Xem sạp nón của Cô Tư', x: MK.hat.x, y: MK.hat.y, h: 1.2 };
  if (d({ x: MK.cloth.x, y: MK.cloth.y + 120 }) < 165) return { kind: 'shop', shop: 'color', icon: '👘', text: 'Xem sạp áo của Cô Sáu', x: MK.cloth.x, y: MK.cloth.y, h: 1.2 };
  if (d({ x: MK.food.x, y: MK.food.y + 40 }) < 250) return { kind: 'shop', shop: 'food', icon: '🍜', text: 'Gọi món hồi sinh lực', x: MK.food.x - 10, y: MK.food.y - 95, h: 1.7 };
  if (d({ x: MK.barber.x, y: MK.barber.y + 50 }) < 160) return { kind: 'shop', shop: 'hair', icon: '✂️', text: 'Cắt tóc / cạo trọc', x: MK.barber.x - 60, y: MK.barber.y - 20, h: 1.6 };
  if (d({ x: MK.fortune.x, y: MK.fortune.y + 120 }) < 180) return { kind: 'fortune', icon: '🎋', text: td.accepted ? `Xem quẻ hôm nay (số ${td.accepted.no})` : td.fortuneLeft === 0 ? 'Chọn quẻ để đón nhận' : `Xin quẻ (${S.prices.fortune} phước · còn ${td.fortuneLeft !== undefined ? td.fortuneLeft : 3} lượt)`, x: MK.fortune.x, y: MK.fortune.y, h: 3.1 };
  if (inTugZone()) return { kind: 'tug', icon: '🪢', text: S.inMatch ? 'Đang kéo co!' : 'Sân kéo co: thách đấu / nhận kèo', x: MK.tug.x, y: MK.tug.y - 60, h: 1.4 };
  let lb = null, ld = 1e9;
  L.leaves.forEach(l => { const st = S.leaves[l.id], dd = d(l); if (st && st.state === 'full' && dd < L.leafRadius && dd < ld) { ld = dd; lb = l; } });
  if (lb) return { kind: 'sweep', leaf: lb.id, icon: '🧹', text: `Quét lá đa (+${S.prices.sweep} phước)`, x: lb.x, y: lb.y, h: .7 };
  for (const a of L.animals) {
    const p = a.id === 'fish' ? { x: a.x, y: a.y } : animalPos(a, t), r = a.id === 'fish' ? L.fishRadius : L.animalRadius;
    if (Math.hypot(me.x - p.x, me.y - p.y) < r) return { kind: 'feed', animal: a.id, ax: p.x, ay: p.y, icon: '🥬', text: S.profile && S.profile.rau > 0 ? `Cho ${a.name} ăn rau` : `Cần rau để cho ${a.name} ăn`, x: p.x, y: p.y, h: a.id === 'buffalo' ? 1.4 : 1.0 };
  }
  return null;
}
function doInteract() {
  const it = S.interact; if (!it || S.busy) return;
  ac();
  if (it.kind === 'incense') openIncense(it.mode);
  else if (it.kind === 'bell') bellOpen();
  else if (it.kind === 'cushion') chantOpen(it.cushion);
  else if (it.kind === 'dig') {
    if (S.profile && S.profile.digsLeft <= 0) return showDigResult({ ok: false, reason: 'limit' });
    S.busy = true; S.digAnim = performance.now(); sfx.dig(); setTimeout(sfx.dig, 300); setTimeout(sfx.dig, 600);
    const d = L.plots[it.plot]; S.me.yaw = Math.atan2(d.x - S.me.x, d.y - S.me.y);
    let n = 0; const iv = setInterval(() => { for (let i = 0; i < 5; i++) dirt(d.x * K, d.y * K); if (++n > 6) clearInterval(iv); }, 120);
    setTimeout(() => send({ t: 'dig', plot: it.plot }), 900);
    setTimeout(() => { S.busy = false; }, 6000);
  } else if (it.kind === 'feed') {
    if (!S.profile || S.profile.rau <= 0) return toast('Bạn chưa có bó rau nào — ra Vườn Rau Phước Đức cuốc đất nhé 🥬');
    send({ t: 'feed', animal: it.animal, ax: it.ax, ay: it.ay });
  } else if (it.kind === 'wait') toast(it.icon === '🎣' ? it.text : 'Luống này vừa được đào, đợi rau mọc lại hoặc tìm luống khác nhé 🌱');
  else if (it.kind === 'shop') openShop(it.shop);
  else if (it.kind === 'tug') { if (!S.inMatch) openTug(); }
  else if (it.kind === 'samhoi') openSamhoi();
  else if (it.kind === 'pen') openPen();
  else if (it.kind === 'fish') openFish();
  else if (it.kind === 'wash') { send({ t: 'wash' }); sfx.sweep(); }
  else if (it.kind === 'cau') cauOpen(it.seat);
  else if (it.kind === 'fortune') {
    const td = S.profile.today || {};
    if (td.accepted || td.fortuneLeft === 0) return openFortuneBoard();
    if (S.profile.phuoc < S.prices.fortune) return toast(`Xin quẻ cần ${S.prices.fortune} phước. Quét lá đa hay thắp hương để tích thêm nhé.`);
    S.busy = true; sfx.mo(); setTimeout(sfx.mo, 250); setTimeout(sfx.mo, 500);
    setTimeout(() => send({ t: 'fortune' }), 900); setTimeout(() => { S.busy = false; }, 5000);
  } else if (it.kind === 'sweep') {
    const lf = L.leaves[it.leaf]; S.me.yaw = Math.atan2(lf.x - S.me.x, lf.y - S.me.y);
    S.busy = true; S.sweepAnim = performance.now(); sfx.sweep();
    setTimeout(() => send({ t: 'sweep', leaf: it.leaf }), 800); setTimeout(() => { S.busy = false; }, 4000);
  }
}
function inTugZone() { const t = L.market.tug; return S.me && Math.abs(S.me.x - t.x) < t.w / 2 + 60 && Math.abs(S.me.y - t.y) < t.h / 2 + 60; }

/* ---------------- Cửa hàng, quán ăn, cắt tóc, tủ đồ ---------------- */
const HAT_ICON = { none: '➖', non: '👒', quaithao: '🎐', khan: '🧣', khanvan: '🧕', beanie: '🧢', headphone: '🎧' };
const HAIR_ICON = { bun: '🧑', short: '💇', bald: '👨‍🦲', long: '👩‍🦰', braid: '👧', ponytail: '👱‍♀️', bob: '💁', curly: '👨‍🦱', mohawk: '🤘' };
const OUTFIT_ICON = { trang: '🥋', baba: '👚', aodai: '👘', nguthan: '🧥', tuthan: '👗', nhatbinh: '👑' };
function openShop(kind) {
  const p = S.profile; if (!p) return; S.shopKind = kind;
  const look = p.look || {}, own = Object.assign({ hats: [], colors: [], outfits: [] }, p.items);
  const sec = t => `<h4 class="shop-sec">${t}</h4>`;
  let title = '', sub = '', html = '', foot = `Bạn có <b>${p.phuoc}</b> phước · sinh lực <b>${curStamina()}</b>/${p.stMax || 100}`;
  const item = (attrs, icon, name, note, cls) => `<button class="it ${cls || ''}" ${attrs}>${icon}<b>${esc(name)}</b><small>${note}</small></button>`;
  if (kind === 'hat' || kind === 'wardrobe') {
    const hats = kind === 'hat' ? RU.HATS : RU.HATS.filter(h => own.hats.includes(h.id));
    if (kind === 'wardrobe') html += sec('Nón · khăn');
    html += hats.map(h => { const o = own.hats.includes(h.id), on = look.hat === h.id; return item(`data-${o ? 'eq' : 'buy'}="hat" data-id="${h.id}"`, `<span class="ic">${HAT_ICON[h.id]}</span>`, h.name, on ? 'Đang đội' : o ? 'Đã có · bấm để đội' : h.price + ' phước', (o ? 'own ' : '') + (on ? 'on ' : '') + (!o && p.phuoc < h.price ? 'poor' : '')); }).join('');
    title = kind === 'hat' ? '👒 Gánh nón Cô Tư' : '👘 Tủ đồ của bạn';
    sub = kind === 'hat' ? '“Nón mới về đây cháu ơi, đội vào là sáng cả chùa!”' : 'Đồ đã mua có thể thay bất cứ lúc nào, không mất phước.';
    if (look.hair === 'bald' && kind === 'hat') foot = 'Đầu trọc đội gì cũng hợp! · ' + foot;
  }
  if (kind === 'color' || kind === 'wardrobe') {
    const cols = kind === 'color' ? RU.COLORS : RU.COLORS.filter(c => own.colors.includes(c.id)), outs = kind === 'color' ? RU.OUTFITS : RU.OUTFITS.filter(o => own.outfits.includes(o.id));
    // kiểu áo truyền thống (mặc cùng màu vải đang chọn)
    html += sec(kind === 'color' ? 'Kiểu áo truyền thống' : 'Kiểu áo');
    html += outs.map(o => { const ow = own.outfits.includes(o.id), on = (look.outfit || 'trang') === o.id; return item(`data-${ow ? 'eq' : 'buy'}="outfit" data-id="${o.id}"`, `<span class="ic">${OUTFIT_ICON[o.id]}</span>`, o.name, on ? 'Đang mặc' : ow ? 'Đã có · bấm để mặc' : `${o.price} phước · ${o.note}`, (ow ? 'own ' : '') + (on ? 'on ' : '') + (!ow && p.phuoc < o.price ? 'poor' : '')); }).join('');
    html += sec(kind === 'color' ? 'Màu vải' : 'Màu áo');
    html += cols.map(c => { const o = own.colors.includes(c.id), on = look.color === c.id; return item(`data-${o ? 'eq' : 'buy'}="color" data-id="${c.id}"`, `<span class="ic"><span class="sw" style="background:${c.id}"></span></span>`, c.name, on ? 'Đang mặc' : o ? 'Đã có · bấm để mặc' : c.price + ' phước', (o ? 'own ' : '') + (on ? 'on ' : '') + (!o && p.phuoc < c.price ? 'poor' : '')); }).join('');
    if (kind === 'color') { title = '👘 Hàng áo Cô Sáu'; sub = '“Áo tràng, bà ba, áo dài, ngũ thân, tứ thân, nhật bình… chọn kiểu rồi chọn màu vải nha cưng!”'; }
  }
  if (kind === 'hair') {
    title = '✂️ Cắt Tóc Vỉa Hè'; sub = '“Ngồi xuống đây chú cắt cho, cạo trọc thì bỏ luôn mũ nón nhé!”';
    html = RU.HAIRS.map(h => item(`data-hair="${h.id}"`, `<span class="ic">${HAIR_ICON[h.id]}</span>`, h.name, look.hair === h.id ? 'Kiểu hiện tại' : `${h.price} phước · ${h.note}`, (look.hair === h.id ? 'on ' : '') + (p.phuoc < h.price ? 'poor' : ''))).join('');
  }
  if (kind === 'food') {
    title = '🍜 Quán Ăn Vỉa Hè'; sub = 'Mọi hoạt động đều tốn sinh lực. Ăn một món để có sức chơi tiếp!';
    html = RU.FOODS.map(f => item(`data-food="${f.id}"`, `<span class="ic">${f.icon}</span>`, f.name, `${f.price} phước · +${f.st} sinh lực`, p.phuoc < f.price ? 'poor' : '')).join('');
  }
  $('#shopTitle').textContent = title; $('#shopSub').textContent = sub; $('#shopBody').innerHTML = html; $('#shopFoot').innerHTML = foot;
  $('#shopModal').classList.remove('hidden');
}
$('#shopBody').addEventListener('click', e => {
  const b = e.target.closest('button.it'); if (!b) return; sfx.pop();
  if (b.dataset.buy) send({ t: 'buy', kind: b.dataset.buy, id: b.dataset.id });
  else if (b.dataset.eq) send({ t: 'equip', kind: b.dataset.eq, id: b.dataset.id });
  else if (b.dataset.hair) send({ t: 'haircut', id: b.dataset.hair });
  else if (b.dataset.food) send({ t: 'eat', id: b.dataset.food });
});
// Xin quẻ: mỗi ngày xin tối đa 3 quẻ, rồi chọn 1 quẻ để "đón nhận" — áp dụng cả ngày
function openFortuneBoard(newNo) {
  const td = (S.profile && S.profile.today) || { drawn: [], fortuneLeft: 0 }, acc = td.accepted;
  if (newNo) sfx.soft();
  let h = `<div class="big">🎋</div>`;
  if (acc) {
    h += `<p class="eyebrow">Quẻ bạn đã đón nhận hôm nay</p><h2>Quẻ số ${acc.no}</h2><div class="q-list"><div class="q-item on"><p>${esc(acc.text)}</p></div></div>
      <p class="muted small">Quẻ áp dụng tới hết ngày (giờ Việt Nam). Mai lại đến am xin quẻ mới nhé.</p>`;
  } else {
    const cur = newNo && td.drawn.find(q => q.no === newNo);
    h += cur ? `<p class="eyebrow">Bạn vừa xin được</p><h2>Quẻ số ${cur.no}</h2>` : `<p class="eyebrow">Am Xin Quẻ</p><h2>Chọn quẻ để đón nhận</h2>`;
    h += `<p class="muted small">Hôm nay bạn xin được ${td.drawn.length}/${td.drawn.length + td.fortuneLeft} quẻ. Chọn <b>một</b> quẻ để đón nhận — quẻ đó theo bạn suốt cả ngày.</p>`;
    h += `<div class="q-list">${td.drawn.slice().reverse().map(q => `<div class="q-item ${q.no === newNo ? 'on' : ''}"><b>Quẻ số ${q.no}</b><p>${esc(q.text)}</p><button class="mini-btn" data-accept-q="${q.no}">🙏 Con xin đón nhận quẻ này</button></div>`).join('')}</div>`;
    if (td.fortuneLeft > 0) h += `<button class="primary ghost" id="againFortune">Xin thêm quẻ (${S.prices.fortune} phước · còn ${td.fortuneLeft} lượt)</button>`;
  }
  h += `<button class="tuvi" disabled>🔮 Xem tử vi theo ngày giờ sinh — sắp ra mắt</button><p class="muted small">Quẻ chỉ mang tính giải trí</p><button class="primary ghost" data-close>Đóng</button>`;
  $('#resultCard').innerHTML = h;
  const ag = $('#againFortune');
  if (ag) ag.onclick = () => { if (S.profile.phuoc < S.prices.fortune) return toast('Không đủ phước để xin thêm quẻ rồi.'); closeModals(); S.busy = true; sfx.mo(); setTimeout(sfx.mo, 250); setTimeout(() => send({ t: 'fortune' }), 700); setTimeout(() => { S.busy = false; }, 5000); };
  $('#resultModal').classList.remove('hidden');
}
$('#resultCard').addEventListener('click', e => {
  const b = e.target.closest('[data-accept-q]'); if (!b) return;
  send({ t: 'fortuneAccept', no: +b.dataset.acceptQ }); sfx.bell(); closeModals();
  for (let i = 0; i < 30; i++) spark(S.me.x * K, 1.4, S.me.y * K, ['#ffd27a', '#ff8a5c', '#fff'][i % 3]);
});
$('#qBtn').onclick = () => openFortuneBoard();

/* ---------------- Khung lớn dùng chung (sám hối, thầy đồ, phóng sinh) ---------------- */
function xShow(kind, html) { S.xOpen = kind; $('#xCard').innerHTML = html; $('#xModal').classList.remove('hidden'); }

/* ---- Bảng sám hối: ẩn danh, giữ 48 giờ, thả 🙏 đồng cảm ---- */
function openSamhoi() {
  S.samhoiList = S.samhoiList || null;
  xShow('samhoi', `<button class="x" data-close>✕</button>
    <div class="x-head"><div><h2>📜 Bảng Sám Hối Nghề Nghiệp</h2><p class="muted">Thú nhận ẩn danh. Mọi người thả 🙏 đồng cảm. Lời sám hối tự gỡ sau 48 giờ.</p></div>
    <div class="x-tabs"><button data-sort="hot">🔥 Nhiều đồng cảm</button><button data-sort="new">🕒 Mới nhất</button><button data-sort="mine">🙋 Của tôi</button></div></div>
    <div class="sh-mine" id="shMine"></div>
    <div class="sh-board" id="shBoard"><p class="muted">Đang tải…</p></div>
    <form class="sh-form" id="shForm" onsubmit="return false"><input id="shInput" maxlength="${RU.SAMHOI.max}" placeholder="Con xin sám hối… (tối đa ${RU.SAMHOI.max} ký tự, đừng ghi tên khách hàng)" autocomplete="off"><button class="primary" type="submit">📌 Ghim lên bảng · ${S.prices.samhoi || RU.SAMHOI.price} phước</button></form>`);
  renderSamhoi(); send({ t: 'samhoiList', sort: S.samhoiSort });
}
const PIN = ['#c0392b', '#2f6fb3', '#2f7d4a', '#e0a020'], NOTE = ['#fffaf0', '#fff1b8', '#f3e2d0', '#fdf3e7'];
function renderSamhoi() {
  if (S.xOpen !== 'samhoi') return;
  document.querySelectorAll('.x-tabs button').forEach(b => b.classList.toggle('on', b.dataset.sort === S.samhoiSort));
  const mi = S.samhoiMine, me2 = $('#shMine');
  if (me2) me2.innerHTML = mi ? (mi.count ? `🙋 Bạn đang có <b>${mi.count}</b> lời sám hối trên bảng, nhận tổng cộng <b>${mi.prays}</b> 🙏 đồng cảm.` : '🙋 Bạn chưa ghim lời sám hối nào (trong 48 giờ qua).') : '';
  const L2 = S.samhoiList, el = $('#shBoard'); if (!el || !L2) return;
  el.innerHTML = L2.length ? L2.map((n, i) => `<div class="sh-note" style="background:${NOTE[i % 4]};transform:rotate(${((i * 37) % 5 - 2) * .6}deg)"><i class="pin" style="background:${PIN[i % 4]}"></i>
    <p>${esc(n.text)}</p><div class="sh-foot"><button class="pray ${n.prayed ? 'on' : ''}" data-pray="${n.id}" ${n.mine || n.prayed ? 'disabled' : ''} title="${n.mine ? 'Lời của bạn' : 'Đồng cảm'}">🙏 ${n.n}</button><span>${n.mine ? 'của bạn · ' : ''}còn ${n.left} giờ</span></div></div>`).join('')
    : `<p class="muted" style="grid-column:1/-1;text-align:center;padding:40px 0;color:#f3e2c4">${S.samhoiSort === 'mine' ? 'Bạn chưa có lời sám hối nào đang được ghim. Viết một lời ở ô bên dưới nhé 🙏' : 'Bảng còn trống. Hãy là người đầu tiên thú nhận “tội lỗi” nghề nghiệp 🙏'}</p>`;
}
$('#xCard').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.sort) { S.samhoiSort = b.dataset.sort; renderSamhoi(); send({ t: 'samhoiList', sort: S.samhoiSort }); }
  else if (b.dataset.pray) { b.disabled = true; sfx.soft(); send({ t: 'samhoiPray', id: b.dataset.pray, sort: S.samhoiSort }); }
});
$('#xCard').addEventListener('submit', e => {
  if (e.target.id === 'shForm') { const v = $('#shInput').value.trim(); if (v.length < 4) return toast('Viết thêm chút nữa nhé 🙏'); send({ t: 'samhoiPost', text: v, sort: S.samhoiSort }); $('#shInput').value = ''; sfx.mo(); }
  if (e.target.id === 'fishForm') fishGo();
});

/* ---- Lớp Thầy Đồ Bezier: bài tập Pen Tool ---- */
const PEN_W = 900, PEN_H = 520;
const pen = { lesson: 0, anchors: [], closed: false, drag: null, cusp: false };
function openPen() {
  const pr = S.profile || {}, cur = pr.penLesson || 0, td = pr.today || {};
  pen.lesson = Math.min(cur, RU.PEN_LESSONS.length - 1); pen.anchors = []; pen.closed = false;
  xShow('pen', `<button class="x" data-close>✕</button>
    <div class="pen-wrap"><div class="pen-main">
      <div class="x-head"><div><h2 id="penTitle"></h2><p class="muted small" id="penTip"></p></div>
        <select id="penSel">${RU.PEN_LESSONS.map((l, i) => `<option value="${i}" ${i > cur ? 'disabled' : ''}>Bài ${i + 1}: ${esc(l.name)}${i > cur ? ' 🔒' : ''}</option>`).join('')}</select></div>
      <canvas id="penCv" width="${PEN_W}" height="${PEN_H}"></canvas>
      <div class="pen-bar"><div class="pen-meter"><span>Độ khớp</span><b id="penPct">0%</b><i><u id="penFill"></u></i></div>
        <label class="pen-cusp"><input type="checkbox" id="penCusp"> Góc nhọn (Alt)</label>
        <button class="primary ghost" id="penUndo">↶ Lùi điểm</button><button class="primary ghost" id="penReset">⟲ Vẽ lại</button><button class="primary" id="penSend">Nộp bài cho thầy</button></div>
    </div>
    <div class="pen-side"><div class="teacher">👴</div><h3>Thầy Đồ Bezier</h3><div id="penSay" class="pen-say">“Click để đặt điểm neo, nhấn giữ rồi kéo để ra tay nắm. Khớp từ ${RU.PEN.pass}% trở lên thì đạt.”</div>
      <p class="muted small">10 bài từ dễ đến khó. Mỗi ngày nộp ${S.prices.penPerDay || RU.PEN.perDay} lần (còn <b id="penLeft">${td.penLeft !== undefined ? td.penLeft : '?'}</b>). Đạt được +${S.prices.penReward || RU.PEN.reward} phước và mở bài tiếp theo.</p></div></div>`);
  $('#penSel').value = pen.lesson; penLesson();
  const cv = $('#penCv');
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * PEN_W, (e.clientY - r.top) / r.height * PEN_H]; };
  cv.onpointerdown = e => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId); const [x, y] = pt(e);
    if (pen.closed) return;
    const A = pen.anchors;
    if (A.length >= 2 && Math.hypot(x - A[0][0], y - A[0][1]) < 16) { pen.closed = true; sfx.pop(); return penDraw(); }   // khép hình
    A.push([x, y, 0, 0]); pen.drag = { i: A.length - 1, cusp: pen.cusp || e.altKey }; sfx.tick(); penDraw();
  };
  cv.onpointermove = e => {
    if (!pen.drag) return; const [x, y] = pt(e), a = pen.anchors[pen.drag.i];
    a[2] = x - a[0]; a[3] = y - a[1];
    if (pen.drag.cusp || e.altKey) { if (a.length < 6) a.push(0, 0); } else if (a.length === 6) a.length = 4;
    penDraw();
  };
  cv.onpointerup = () => { pen.drag = null; penDraw(); };
  $('#penSel').onchange = e => { pen.lesson = +e.target.value; pen.anchors = []; pen.closed = false; penLesson(); };
  $('#penCusp').onchange = e => { pen.cusp = e.target.checked; };
  $('#penUndo').onclick = () => { if (pen.closed) pen.closed = false; else pen.anchors.pop(); penDraw(); };
  $('#penReset').onclick = () => { pen.anchors = []; pen.closed = false; penDraw(); };
  $('#penSend').onclick = () => {
    if (pen.anchors.length < 2) return toast('Đặt ít nhất 2 điểm neo đã con ơi.');
    if ((S.profile.today || {}).penLeft === 0) return penSay('Hôm nay nộp đủ bài rồi. Mai thầy chấm tiếp!', false);
    $('#penSend').disabled = true; send({ t: 'penSubmit', lesson: pen.lesson, anchors: pen.anchors.map(a => a.map(v => Math.round(v * 10) / 10)), closed: pen.closed });
    setTimeout(() => { const b = $('#penSend'); if (b) b.disabled = false; }, 2500);
  };
}
function penLesson() { const L2 = RU.PEN_LESSONS[pen.lesson]; $('#penTitle').textContent = `✒️ Bài ${pen.lesson + 1}: ${L2.name}`; $('#penTip').textContent = L2.tip + ` (gợi ý: ${L2.anchors} điểm neo)`; penDraw(); }
function penDraw() {
  const cv = $('#penCv'); if (!cv) return; const c = cv.getContext('2d'), L2 = RU.PEN_LESSONS[pen.lesson];
  c.clearRect(0, 0, PEN_W, PEN_H); c.fillStyle = '#fffdf7'; c.fillRect(0, 0, PEN_W, PEN_H);
  c.strokeStyle = '#f0e6d2'; c.lineWidth = 1; for (let x = 0; x <= PEN_W; x += 30) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, PEN_H); c.stroke(); } for (let y = 0; y <= PEN_H; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(PEN_W, y); c.stroke(); }
  const path = segs => { c.beginPath(); segs.forEach((g, i) => { if (i === 0) c.moveTo(g[0][0], g[0][1]); c.bezierCurveTo(g[1][0], g[1][1], g[2][0], g[2][1], g[3][0], g[3][1]); }); };
  // bài 1 có sẵn đường Bezier (segs); các bài sau là đường cong toán học → vẽ theo dãy điểm mẫu (pts)
  if (L2.segs) path(L2.segs); else { c.beginPath(); L2.pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (L2.closed) c.closePath(); }
  c.strokeStyle = 'rgba(200,160,100,.28)'; c.lineWidth = 34; c.lineCap = c.lineJoin = 'round'; c.stroke();
  c.setLineDash([10, 8]); c.strokeStyle = '#a07a4a'; c.lineWidth = 2.5; c.stroke(); c.setLineDash([]);
  c.font = '600 15px "Be Vietnam Pro", sans-serif'; c.fillStyle = '#8a6a45'; c.fillText('Đường mẫu (nét đứt) · Nét của bạn (xanh)', 18, 26);
  const A = pen.anchors;
  if (A.length >= 2) { path(RU.penSegs(A, pen.closed)); c.strokeStyle = '#2f6fb3'; c.lineWidth = 4; c.stroke(); }
  A.forEach((a, i) => {
    const o = [a[0] + a[2], a[1] + a[3]], ih = a.length >= 6 ? [a[0] + a[4], a[1] + a[5]] : [a[0] - a[2], a[1] - a[3]];
    if (a[2] || a[3]) { c.strokeStyle = '#2f6fb3'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ih[0], ih[1]); c.lineTo(a[0], a[1]); c.lineTo(o[0], o[1]); c.stroke(); for (const h of [o, ih]) { c.fillStyle = '#2f6fb3'; c.beginPath(); c.arc(h[0], h[1], 5, 0, 7); c.fill(); } }
    c.fillStyle = i === 0 && A.length >= 2 && !pen.closed ? '#ffe8a8' : '#fff'; c.strokeStyle = '#2f6fb3'; c.lineWidth = 2; c.fillRect(a[0] - 6, a[1] - 6, 12, 12); c.strokeRect(a[0] - 6, a[1] - 6, 12, 12);
  });
  const sc = A.length >= 2 ? RU.penScore(pen.lesson, A, pen.closed) : 0;
  $('#penPct').textContent = sc + '%'; $('#penFill').style.width = sc + '%'; $('#penFill').style.background = sc >= RU.PEN.pass ? '#2f7d4a' : sc >= 60 ? '#d9a33a' : '#c0583a';
}
function penSay(text, ok) { const el = $('#penSay'); if (!el) return; el.className = 'pen-say ' + (ok ? 'ok' : ok === false ? 'bad' : ''); el.innerHTML = text; }
function penResult(m) {
  const td = (S.profile && S.profile.today) || {}; if ($('#penLeft')) $('#penLeft').textContent = td.penLeft;
  if (m.limit) return penSay('“Hôm nay nộp đủ bài rồi. Về luyện thêm, mai thầy chấm tiếp!”', false);
  const PRAISE = ['Được, có tiến bộ.', 'Nét này mượt như lụa Hà Đông!', 'Tay nắm chuẩn, thầy duyệt.'], SCOLD = ['Kéo tay nắm như kéo co thế à?', 'Điểm neo nhiều như kiến!', 'Nét này run như deadline sát nút.'];
  if (m.pass) {
    sfx.win(); const nx = (S.profile.penLesson || 0);
    penSay(`<b>Đạt (${m.score}%)</b> · “${PRAISE[Math.random() * 3 | 0]} Thưởng con ${m.gain} phước${nx > m.lesson ? `. Đã mở bài ${nx + 1}, học tiếp nhé` : ''}.”`, true);
    if (nx > m.lesson) { const sel = $('#penSel'); if (sel) { sel.options[nx].disabled = false; sel.options[nx].textContent = `Bài ${nx + 1}: ${RU.PEN_LESSONS[nx].name}`; } }
  } else { sfx.soft(); penSay(`<b>Trượt (${m.score}% &lt; ${RU.PEN.pass}%)</b> · “${SCOLD[Math.random() * 3 | 0]} Về chép phạt 100 lần chữ C!”`, false); }
}

/* ---- Phóng sinh: mua cá Cô Ba bằng sinh lực (cá vào giỏ), ra mép bến thả xuống sông để nhận phước ---- */
const NPC_SAY = [{ id: 'coBa', x: L.market.fishSeller.x, y: L.market.fishSeller.y, name: 'Cô Ba' }];
let fishKind = 'chep';
let coBaLast = -1;
function coBaLine() { let i; do i = Math.random() * RU.COBA_SAYS.length | 0; while (i === coBaLast && RU.COBA_SAYS.length > 1); coBaLast = i; return RU.COBA_SAYS[i]; }
const fishBag = () => (S.profile && S.profile.fishBag) || {};
function openFish() {
  const bag = fishBag(), inBag = RU.FISH.reduce((a, f) => a + (bag[f.id] || 0), 0), st = (S.profile && S.profile.st) || 0;
  const td = (S.profile && S.profile.today) || {}, atWharf = Math.hypot(S.me.x - L.release.x, S.me.y - L.release.y) < L.release.radius + 40;
  if (atWharf && !(bag[fishKind] > 0)) { const f = RU.FISH.find(x => bag[x.id] > 0); if (f) fishKind = f.id; }   // ở bến: chọn sẵn loại cá đang có trong giỏ
  const wish = $('#fishWish') ? $('#fishWish').value : '', has = bag[fishKind] > 0, full = inBag >= RU.FISH_RULES.bagMax, cur = RU.FISH.find(x => x.id === fishKind);
  const card = f => `<button data-fish="${f.id}" class="${f.id === fishKind ? 'sel' : ''}" ${atWharf && !(bag[f.id] > 0) ? 'disabled' : ''}><b>${f.icon}</b>${esc(f.name)}<small>${atWharf ? '' : `${f.st} sinh lực · `}+${f.reward} phước khi thả</small><small class="bag">Trong giỏ: ${bag[f.id] || 0}</small></button>`;
  xShow('fish', `<button class="x" data-close>✕</button>
    <div class="fish-wrap"><div><h2>${atWharf ? '🐟 Thả cá phóng sinh' : '🐟 Mua cá của Cô Ba'}</h2>
      <p class="muted">${atWharf ? 'Chọn con cá trong giỏ, gửi một lời cầu nguyện rồi thả xuống sông để nhận phước.' : 'Mua cá bằng <b>sinh lực</b>, cá được bỏ vào giỏ. Mang ra mép bến thả xuống sông mới được cộng <b>phước</b>.'}</p>
      <div class="fish-grid">${RU.FISH.map(card).join('')}</div>
      ${atWharf ? '' : `<button class="primary ghost" id="fishBuyBtn" ${full || st < cur.st ? 'disabled' : ''}>${full ? `Giỏ đã đủ ${RU.FISH_RULES.bagMax} con` : st < cur.st ? `Chưa đủ sinh lực (cần ${cur.st})` : `Mua 1 ${esc(cur.name)} · −${cur.st} sinh lực`}</button>`}
      ${atWharf && !inBag ? '<p class="fish-empty"><b>Giỏ trống</b> — chưa có cá để phóng sinh. Ghé thúng cá của Cô Ba ngay cạnh bến để mua trước nhé.</p>' : `<form id="fishForm" onsubmit="return false"><input id="fishWish" maxlength="70" placeholder="Cầu cho file in ra đúng màu Pantone 🙏" autocomplete="off" value="${esc(wish)}">
      <button class="primary" type="submit" id="fishBtn" ${td.fishLeft === 0 || !has ? 'disabled' : ''}>${td.fishLeft === 0 ? 'Hôm nay đã phóng sinh đủ' : !has ? `Giỏ chưa có ${esc(cur.name)}` : atWharf ? `Thả ${esc(cur.name)} xuống sông` : `Ra bến thả ${esc(cur.name)}`}</button></form>`}
      <p class="muted small">Còn ${td.fishLeft !== undefined ? td.fishLeft : '?'} lượt thả hôm nay · giỏ đựng tối đa ${RU.FISH_RULES.bagMax} con (đang có ${inBag})</p></div>
    <div class="fish-art"><div class="fish-bubble">${esc(coBaLine())}</div><div class="fish-scene">🛶 · · · 👒🧺 · · · 🐟</div>
      <p><b>Sự kiện vui (10%):</b> vừa thả xong, Cô Ba có thể lấy vợt vớt luôn con cá lên thúng. Bạn vẫn được phước, còn cá… quay lại hàng bán tiếp 🤣</p></div></div>`);
  $('#xCard').querySelectorAll('[data-fish]').forEach(b => b.onclick = () => { fishKind = b.dataset.fish; sfx.pop(); openFish(); });
  const buy = $('#fishBuyBtn'); if (buy) buy.onclick = () => { buy.disabled = true; send({ t: 'fishBuy', kind: fishKind }); expectReply('mua cá'); };
}
function fishGo() {
  const f = RU.FISH.find(x => x.id === fishKind); if (!f) return;
  if (!(fishBag()[f.id] > 0)) return toast(`Giỏ chưa có ${f.name} — mua của Cô Ba trước nhé 🐟`);
  const wish = $('#fishWish').value.trim(); closeModals();
  const atWharf = Math.hypot(S.me.x - L.release.x, S.me.y - L.release.y) < L.release.radius + 40;
  if (atWharf) { send({ t: 'fishRelease', kind: f.id, wish }); expectReply('thả cá'); }
  else { S.pendingFish = { kind: f.id, wish, leg: 1 }; S.target = { x: L.wharf.x, y: L.river.y0 - 60 }; ticker(`🐟 Mang ${f.name} trong giỏ ra mép bến thả…`); }
}
function fishFx(m) {
  const p = S.me && m.id === S.me.id ? S.me : S.players.get(m.id), now = performance.now();
  const x0 = (p ? p.x : L.release.x) * K, z0 = (p ? p.y : L.release.y) * K, x1 = x0 + (Math.random() < .5 ? -1 : 1) * (1.1 + Math.random() * .6), z1 = (L.release.y + 30 + Math.random() * 50) * K;
  S.fishFx.push({ t: now, dur: 900, life: 900, x0, z0, y0: .9, x1, z1, y1: .03, arc: 1.0 });
  if (p) { p.yaw = 0; S.emotes.set(m.id, { e: 'pray', t: now }); }
  sfx.pop(); setTimeout(() => tone(300, .25, 'sine', .05), 850);
  if (m.wish) S.floaters.push({ x: x1, y: .8, z: z1, text: `“${m.wish}”`, sub: `— ${m.name} phóng sinh`, t: now, life: 8000 });
  if (m.scooped) {
    const bx = L.market.fishSeller.x * K - .6, bz = L.market.fishSeller.y * K + .2;
    setTimeout(() => { S.fishFx.push({ t: performance.now(), dur: 1100, life: 1100, x0: x1, z0: z1, y0: .05, x1: bx, z1: bz, y1: .3, arc: 1.3 }); S.says.set('coBa', { text: 'Há há há! Ngon, lại có cá bán! 🤣', t: performance.now() }); sfx.shout(); }, 1500);
    ticker(`🐟 Cô Ba vừa vớt lại cá của ${m.name} 🤣`);
  } else if (!S.me || m.id !== S.me.id) ticker(`🐟 ${m.name} vừa phóng sinh một con cá`);
}

/* ---------------- Âm thanh nền: chim, dế, mưa, chợ, sông (tổng hợp, không cần file) ---------------- */
const AMB = { on: false, layers: {} };
function noiseBuf(sec = 2) { const n = AC.sampleRate * sec, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { last = last * .6 + (Math.random() * 2 - 1) * .4; d[i] = last; } return b; }
function ambLayer(name, type, freq, q) {
  const src = AC.createBufferSource(); src.buffer = AMB.noise; src.loop = true;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || .7;
  const g = AC.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(AMB.out); src.start();
  AMB.layers[name] = g; return g;
}
function ambStart() {
  if (AMB.on || !ac()) return; AMB.on = true; AMB.noise = noiseBuf(3);
  AMB.out = AC.createGain(); AMB.out.gain.value = .9; AMB.out.connect(AC.destination);
  ambLayer('rain', 'highpass', 900, .5); ambLayer('river', 'bandpass', 420, .8); ambLayer('market', 'bandpass', 650, 1.4); ambLayer('wind', 'lowpass', 260, .5);
  setInterval(ambTick, 500); ambEvents();
}
function ambMix() {
  const me = S.me, k = curWeather(), night = S.night || 0, on = S.sound && me && !document.hidden;
  const rainy = k === 'rain' ? .32 : k === 'storm' ? .5 : 0, inMarket = me && me.y > L.GATE_Y, nearRiver = me ? Math.max(0, 1 - Math.abs(me.y - L.river.y0) / 700) : 0;
  return { rain: on ? rainy : 0, river: on ? nearRiver * .18 : 0, market: on && inMarket && night < .6 ? .05 : 0, wind: on ? (k === 'fog' || k === 'snow' ? .08 : .025) : 0, birds: on && night < .4 && rainy === 0, crickets: on && night > .55 && rainy === 0, chatter: on && inMarket && night < .6 };
}
function ambTick() { const mx = ambMix(); for (const n of ['rain', 'river', 'market', 'wind']) AMB.layers[n].gain.setTargetAtTime(mx[n], AC.currentTime, 1.2); }
function ambEvents() {
  const loop = (fn, a, b) => { const go = () => { try { fn(); } catch (e) {} setTimeout(go, a + Math.random() * b); }; setTimeout(go, a); };
  loop(() => { if (!ambMix().birds) return; const f0 = 2200 + Math.random() * 1800, n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) { const t = AC.currentTime + i * .11, o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (1.2 + Math.random() * .4), t + .07); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.025, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .09); o.connect(g).connect(AMB.out); o.start(t); o.stop(t + .1); } }, 1800, 4500);
  loop(() => { if (!ambMix().crickets) return; const t0 = AC.currentTime, f = 4200 + Math.random() * 600; for (let i = 0; i < 6; i++) { const t = t0 + i * .055, o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.012, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .04); o.connect(g).connect(AMB.out); o.start(t); o.stop(t + .05); } }, 600, 1400);
  loop(() => { if (!ambMix().chatter) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(140 + Math.random() * 120, t); o.frequency.linearRampToValueAtTime(110 + Math.random() * 160, t + .35); f.type = 'bandpass'; f.frequency.value = 700 + Math.random() * 500; f.Q.value = 3; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.012, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + .4); o.connect(f).connect(g).connect(AMB.out); o.start(t); o.stop(t + .45); }, 500, 1500);
}

/* ---------------- Bãi câu brief: ngồi ghế, quăng câu, giật đúng lúc, giữ brief trong vùng xanh ---------------- */
const RAR = id => RU.RARITY.find(r => r.id === id) || RU.RARITY[0];
function cauOpen(seat) { S.cauSeat = seat; S.cauState = 'idle'; S.cauLast = null; S.cauLockUntil = 0; S.mg = 'cau'; send({ t: 'cauSit', seat }); const st = L.cauSeats[seat]; S.me.x = st.x; S.me.y = st.y; S.me.pose = 'fish'; S.me.yaw = 0; cauRender(); }
function cauMsg(t) { const el = $('#cauMsg'); if (el) el.innerHTML = t; }
// Giữ kết quả mẻ câu trên màn hình và khoá nút quăng 1,6 giây: đang đà bấm Space cũng không quăng tiếp (mất kết quả) ngay
const CAU_LOCK_MS = 1600;
function cauKeep(html) {
  S.cauLast = html; S.cauFresh = true; S.cauLockUntil = performance.now() + CAU_LOCK_MS;
  clearTimeout(S.cauLockT); S.cauLockT = setTimeout(() => { if (S.mg === 'cau' && S.cauState === 'idle') cauRender(); }, CAU_LOCK_MS + 30);
}
function cauRender() {
  if (S.mg !== 'cau') return;
  const td = (S.profile && S.profile.today) || {}, st = S.cauState, locked = st === 'idle' && performance.now() < (S.cauLockUntil || 0);
  mgShow(`<button class="x" data-mgclose>✕</button><h2>🎣 Bãi Câu Brief</h2>
    <p class="muted small">Quăng câu, chờ phao chìm thì <b>giật ngay</b> (Space / chạm). Khi brief vùng vẫy, <b>giữ</b> Space (hoặc giữ chuột) để kéo vùng xanh theo brief cho tới khi đầy thanh.</p>
    <div class="cau-stage" id="cauStage">${st === 'reel' ? '<div class="cau-track"><i class="cau-zone" id="cauZone"></i><b class="cau-fish" id="cauFish">📄</b></div><div class="cau-prog"><u id="cauProg"></u></div>' : `<div class="cau-water"><span class="cau-bob ${st === 'wait' ? 'bob' : st === 'bite' ? 'dip' : ''}">${st === 'idle' ? '🎣' : '🔴'}</span></div>`}</div>
    <p id="cauMsg" class="muted">${st === 'idle' ? `Còn ${td.cauLeft !== undefined ? td.cauLeft : '?'} lượt hôm nay · mỗi lần ${RU.CAU.cost} sinh lực` : st === 'wait' ? 'Chờ brief cắn câu…' : st === 'bite' ? '<b style="color:#b0402a">CẮN CÂU! GIẬT NGAY!</b>' : ''}</p>
    ${S.cauLast ? `<div class="cau-last${S.cauFresh ? ' fresh' : ''}"><span>Mẻ vừa rồi</span>${S.cauLast}</div>` : ''}
    <button class="mg-big-btn" id="cauBtn" ${st === 'wait' || locked ? 'disabled' : ''}>${st === 'idle' ? (S.cauLast ? 'Quăng câu tiếp 🎣' : 'Quăng câu 🎣') : st === 'wait' ? 'Đang chờ…' : st === 'bite' ? 'GIẬT! (Space)' : 'GIỮ ĐỂ KÉO (Space)'}</button>
    <div class="cau-foot"><button class="linkbtn" id="cauBook">📒 Sổ sưu tầm brief</button><span class="muted small">Phổ thông · Trung bình · Hiếm · Cực hiếm</span></div>`);
  S.cauFresh = false;
  const btn = $('#cauBtn');
  btn.onpointerdown = e => { e.preventDefault(); cauPress(true); }; btn.onpointerup = btn.onpointerleave = () => cauPress(false);
  $('#cauBook').onclick = () => openBriefBook(true);
}
function cauPress(down) {
  const st = S.cauState;
  if (down && st === 'idle' && performance.now() < (S.cauLockUntil || 0)) return;   // vừa có kết quả: chưa cho quăng tiếp
  if (down && st === 'idle') { S.cauState = 'casting'; sfx.sweep(); send({ t: 'cauCast' }); setTimeout(() => { if (S.cauState === 'casting') { S.cauState = 'idle'; cauRender(); } }, 4000); return; }
  if (down && st === 'bite') { const hook = performance.now() - S.cauBiteT; clearTimeout(S.cauMissT); if (hook > RU.CAU.hookMs) return cauFail('late'); sfx.knock(true); S.cauHook = Math.round(hook); cauReel(); return; }
  if (st === 'reel') S.cauHold = down;
}
function cauBite(m) {
  if (S.mg !== 'cau') return;
  S.cauState = 'wait'; S.cauRar = m.rarity; cauRender(); sfx.pop();
  S.cauWaitT = setTimeout(() => {
    if (S.cauState !== 'wait') return;
    S.cauState = 'bite'; S.cauBiteT = performance.now(); cauRender(); tone(880, .12, 'square', .06); tone(660, .12, 'square', .05, .12);
    S.cauMissT = setTimeout(() => { if (S.cauState === 'bite') cauFail('late'); }, RU.CAU.hookMs + 50);
  }, m.delay);
}
function cauReel() {
  S.cauState = 'reel'; cauRender();
  const R = RAR(S.cauRar), hard = R.hold;   // brief càng hiếm càng giãy mạnh
  let fish = .5, fv = 0, zone = .5, zv = 0, prog = .3, last = performance.now(), tgt = .5, tgtT = 0;
  const zw = .26 - (hard - 1) * .025, el = $('#cauFish'), ze = $('#cauZone'), pe = $('#cauProg');
  el.textContent = { thuong: '📄', kha: '📃', hiem: '📜', sieu: '🌟' }[R.id] || '📄';
  ze.style.width = (zw * 100) + '%';
  const loop = () => {
    if (S.cauState !== 'reel' || S.mg !== 'cau') return;
    const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
    if (now > tgtT) { tgt = Math.random(); tgtT = now + (900 - hard * 140) * (.5 + Math.random()); }
    fv += (tgt - fish) * dt * 6 * hard - fv * dt * 3; fish = Math.max(0, Math.min(1, fish + fv * dt));
    zv += (S.cauHold ? 2.6 : -2.2) * dt; zv *= .9; zone = Math.max(zw / 2, Math.min(1 - zw / 2, zone + zv * dt * 2.2));
    const inside = Math.abs(fish - zone) < zw / 2;
    prog = Math.max(0, Math.min(1, prog + (inside ? .32 : -.22 * hard / 1.5) * dt));
    el.style.left = (fish * 100) + '%'; ze.style.left = ((zone - zw / 2) * 100) + '%'; ze.classList.toggle('on', inside); pe.style.width = (prog * 100) + '%';
    if (prog >= 1) return cauDone(true);
    if (prog <= 0) return cauDone(false);
    requestAnimationFrame(loop);
  };
  cauMsg(`Brief <b style="color:${R.color}">${R.name}</b> đang giãy! Giữ vùng xanh trùm lên brief…`);
  requestAnimationFrame(loop);
}
function cauDone(ok) { S.cauState = 'sent'; S.cauHold = false; send({ t: 'cauReel', ok, hook: S.cauHook }); if (!ok) cauFail('escape', true); }
function cauFail(reason, sent) {
  if (!sent) { S.cauState = 'sent'; send({ t: 'cauReel', ok: false, hook: 9999 }); }
  sfx.soft(); S.cauState = 'idle';
  cauKeep(`<span class="cau-miss">${{ late: '😵 Giật chậm quá, brief đã bơi sang agency khác!', early: 'Giật sớm quá, brief hoảng sợ bỏ đi.', escape: '💨 Brief vùng vẫy thoát mất — khách đổi ý rồi.' }[reason] || 'Hụt mất rồi!'}</span>`); cauRender();
}
function cauResult(m) {
  if (!m.ok) { if (S.cauState === 'sent') { S.cauState = 'idle'; cauKeep('<span class="cau-miss">💨 Brief vùng vẫy thoát mất — khách đổi ý rồi.</span>'); cauRender(); } return; }
  const b = m.brief, R = RAR(b.rarity); S.cauState = 'idle'; sfx.win();
  cauKeep(`<span class="cau-catch" style="border-color:${R.color}">${esc(b.icon)} <b>${esc(b.name)}</b> <i style="color:${R.color}">${R.name}</i>${m.first ? ' <em>MỚI!</em>' : ` ×${m.count}`}<br><small>“${esc(b.desc)}”</small><br><small>+${m.gain} phước</small></span>`); cauRender();
}
function openBriefBook(fromCau) {
  const own = (S.profile && S.profile.briefs) || {}, list = S.briefs || [], got = list.filter(b => own[b.id]).length;
  const html = `<button class="x" ${fromCau ? 'id="bookBack"' : 'data-close'}>✕</button><div class="x-head"><div><h2>📒 Sổ Sưu Tầm Brief</h2><p class="muted">Đã sưu tầm <b>${got}/${list.length}</b> loại brief. Câu ở Bãi Câu Brief ngoài chợ — admin sẽ thả thêm brief mới.</p></div></div>
    ${RU.RARITY.map(R => { const g = list.filter(b => b.rarity === R.id); if (!g.length) return ''; return `<h3 class="bb-h" style="color:${R.color}">${R.name} · ${g.filter(b => own[b.id]).length}/${g.length}</h3><div class="bb-grid">${g.map(b => own[b.id] ? `<div class="bb-card" style="border-color:${R.color}"><b>${esc(b.icon)}</b><span>${esc(b.name)}</span><small>“${esc(b.desc)}”</small><i>×${own[b.id]}</i></div>` : `<div class="bb-card lock"><b>❔</b><span>???</span><small>Chưa câu được</small></div>`).join('')}</div>`; }).join('')}
    ${fromCau ? '<button class="primary" id="bookBack2">← Quay lại câu tiếp</button>' : ''}`;
  if (fromCau) { mgShow(html); const back = () => cauRender(); $('#bookBack').onclick = back; $('#bookBack2').onclick = back; }
  else xShow('book', html);
}

/* ---------------- Minigame 2D phủ lên cảnh (cảnh 3D tạm vẽ chậm) ---------------- */
function mgShow(html) { $('#mgCard').innerHTML = html; $('#mgModal').classList.remove('hidden'); }
function mgClose() { const k = S.mg; S.mg = null; if (S.mgStop) { S.mgStop(); S.mgStop = null; } $('#mgModal').classList.add('hidden'); return k; }
$('#mgModal').addEventListener('click', e => { if (e.target.id === 'mgModal' || e.target.closest('[data-mgclose]')) { e.stopPropagation(); mgQuit(); } }, true);
function mgQuit() {
  const k = mgClose();
  if (k === 'mo' || k === 'beads') send({ t: 'chantEnd', done: false });
  if (k === 'cau') { clearTimeout(S.cauWaitT); clearTimeout(S.cauMissT); if (S.cauState === 'reel' || S.cauState === 'bite' || S.cauState === 'wait') send({ t: 'cauReel', ok: false, hook: 9999 }); S.cauState = null; S.cauHold = false; send({ t: 'cauLeave' }); S.me.pose = ''; }
  if (k === 'bell' && S.bellG && !S.bellG.sent) { S.bellG.sent = true; send(performance.now() < S.bellG.start ? { t: 'bellCancel' } : { t: 'bellHit', e: -1 }); }
}

/* ---- Thỉnh chuông: bấm đúng lúc kim vào vùng vàng ---- */
function bellOpen() {
  const td = (S.profile && S.profile.today) || {};
  if (td.bellLeft === 0) return toast('Hôm nay bạn đã thỉnh đủ chuông rồi. Mai quay lại nhé 🔔');
  S.mg = 'bell';
  mgShow(`<button class="x" data-mgclose>✕</button><div class="big">🔔</div><h2>Thỉnh Chuông</h2>
    <p class="muted">Bấm <kbd>Space</kbd> / nút bên dưới khi kim chạy vào <b>vùng vàng</b>. Đúng nhịp: <b>+${S.prices.bellReward || 3} phước</b> và hào quang. Lệch nhịp thì… chuông không kêu mà bạn kêu 💨 (−${S.prices.bellPenalty || 1} phước).</p>
    <div class="mg-bar"><i class="zone" style="left:${50 - RU.BELL.zone * 50}%;width:${RU.BELL.zone * 100}%"></i><i class="needle" id="bellNeedle" style="left:0%"></i></div>
    <p id="bellMsg" class="muted">Còn ${td.bellLeft !== undefined ? td.bellLeft : '?'} lượt hôm nay · mỗi lượt ${RU.COST.bell} sinh lực</p>
    <button class="mg-big-btn" id="bellBtn">Bắt đầu thỉnh 🔔</button>`);
  $('#bellBtn').onclick = bellPress;
}
function bellPress() {
  const g = S.bellG;
  if (!g || g.done) {
    if (S.busy) return; S.busy = true; S.bellG = null; $('#bellMsg').textContent = 'Đang chuẩn bị…'; $('#bellBtn').disabled = true; send({ t: 'bellStart' });
    // phòng khi mất kết nối / không có phản hồi: sau 4 giây cho bấm lại, không treo
    clearTimeout(S.bellWaitT); S.bellWaitT = setTimeout(() => { S.busy = false; if (S.mg === 'bell' && !S.bellG) bellReady('Chưa nghe chùa phản hồi — bấm thỉnh lại nhé'); }, 4000);
    return;
  }
  if (g.sent) return;
  const e = performance.now() - g.start; if (e < 0) return;
  g.sent = true; g.e = e; send({ t: 'bellHit', e: Math.round(e) });
  $('#bellBtn').disabled = true;
}
function bellReady(msg) {
  if (S.mg !== 'bell') return;
  const b = $('#bellBtn'), td = (S.profile && S.profile.today) || {};
  if (b) { b.disabled = td.bellLeft === 0; b.textContent = td.bellLeft === 0 ? 'Hết lượt hôm nay' : 'Thỉnh chuông 🔔'; }
  if (msg && $('#bellMsg')) $('#bellMsg').textContent = msg;
}
function bellRun(m) {
  if (S.mg !== 'bell') return send({ t: 'bellCancel' });   // đã đóng bảng trong lúc chờ → xin hoàn lượt
  const g = S.bellG = { start: performance.now() + m.countdown, period: m.period, sent: false, done: false };
  const btn = $('#bellBtn'), nd = $('#bellNeedle'), msg = $('#bellMsg');
  btn.disabled = false; btn.textContent = 'THỈNH! (Space)'; msg.textContent = 'Chuẩn bị…';
  const loop = () => {
    if (S.bellG !== g || S.mg !== 'bell') return;
    const e = performance.now() - g.start;
    if (e >= 0 && !g.sent) { nd.style.left = (RU.bellPos(e, g.period) * 100) + '%'; msg.textContent = 'Canh nhịp… bấm khi kim vào vùng vàng'; }
    if (e > RU.BELL.maxMs - 500 && !g.sent) { g.sent = true; send({ t: 'bellHit', e: Math.round(e) }); }
    if (!g.done) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
function bellResult(m) {
  const g = S.bellG; if (g) g.done = true;
  if (S.mg !== 'bell') return;
  const nd = $('#bellNeedle'); if (nd) nd.style.left = (m.pos * 100) + '%';
  const td = (S.profile && S.profile.today) || {};
  if (m.hit) { $('#bellMsg').innerHTML = `<b style="color:#b8860b">BOONG… đúng nhịp!</b> +${m.gain} phước · hào quang toả sáng ✨`; sfx.win(); }
  else { $('#bellMsg').innerHTML = `<b style="color:#b0402a">Pừừừ… 💨 lệch nhịp rồi!</b> ${m.loss ? '−' + m.loss + ' phước' : ''} · cả chùa đều nghe thấy 😅`; sfx.fart(1); }
  const btn = $('#bellBtn'); btn.disabled = td.bellLeft === 0; btn.textContent = td.bellLeft === 0 ? 'Hết lượt hôm nay' : `Thỉnh tiếp (còn ${td.bellLeft} lượt)`;
}

/* ---- Bồ đoàn: gõ mõ theo nhịp / lần tràng hạt ---- */
const SUTRA = ['Nam mô Ctrl S Bồ Tát', 'nguyện file gốc không hỏng', 'nguyện máy không treo lúc xuất', 'nguyện khách chốt bản đầu', 'nguyện font không bị lỗi', 'nguyện deadline nhẹ nhàng', 'nguyện màu in như màu màn hình', 'nguyện layer luôn có tên', 'nguyện Undo không hết lượt', 'nguyện ổ cứng còn trống', 'nguyện lương về đúng hẹn', 'Nam mô A Di Đà Phật'];
function chantOpen(cid) {
  const td = (S.profile && S.profile.today) || {}, c = L.cushions[cid];
  S.mg = 'cushion'; S.chantCushion = c;
  mgShow(`<button class="x" data-mgclose>✕</button><div class="big">🪷</div><h2>Ngồi bồ đoàn</h2><p class="muted">Tĩnh tâm một chút. Mỗi lượt hoàn thành được <b>+${S.prices.chant || 2} phước</b>.</p>
    <div class="mg-choice"><button data-k="mo" ${td.moLeft === 0 ? 'disabled' : ''}><b class="mo-ic">${MO_SVG}</b>Gõ mõ tụng kinh<small>Gõ đúng nhịp ${RU.CHANT.mo.every}/10 tiếng · còn ${td.moLeft !== undefined ? td.moLeft : '?'} lượt</small></button>
    <button data-k="beads" ${td.beadsLeft === 0 ? 'disabled' : ''}><b>📿</b>Lần tràng hạt<small>Lăn chuột từng hạt, đủ ${RU.CHANT.beads.every} hạt · còn ${td.beadsLeft !== undefined ? td.beadsLeft : '?'} lượt</small></button></div>`);
  $('#mgCard').querySelector('.mg-choice').onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; ac(); chantStart(b.dataset.k); };
}
function chantStart(kind) {
  const c = S.chantCushion; S.mg = kind;
  S.me.x = c.x; S.me.y = c.y; S.me.yaw = Math.PI; S.me.pose = 'sit';
  send({ t: 'chantStart', kind });
  if (kind === 'mo') moGame(); else beadsGame();
}
function chantFinish(kind, n) { mgClose(); send({ t: 'chantEnd', done: true, n }); S.me.pose = ''; }
// Cái mõ gỗ sơn son: thân tròn, miệng xẻ ngang, mắt cá chạm hai bên, đặt trên đệm đỏ
const MO_SVG = `<svg viewBox="0 0 120 110" aria-hidden="true"><defs><radialGradient id="moG" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#d0743c"/><stop offset=".55" stop-color="#9c3f1c"/><stop offset="1" stop-color="#5a1f0b"/></radialGradient></defs>
  <ellipse cx="60" cy="97" rx="48" ry="10" fill="#9e2b22"/><ellipse cx="60" cy="94" rx="46" ry="8" fill="#c0392b"/>
  <ellipse cx="60" cy="56" rx="45" ry="39" fill="url(#moG)" stroke="#4a1808" stroke-width="2"/>
  <path d="M24 64 Q60 86 96 64" fill="none" stroke="#2a0c04" stroke-width="8" stroke-linecap="round"/><path d="M28 61 Q60 79 92 61" fill="none" stroke="#e6a35a" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
  <circle cx="33" cy="45" r="6" fill="#5a1f0b" stroke="#e2b04a" stroke-width="2"/><circle cx="87" cy="45" r="6" fill="#5a1f0b" stroke="#e2b04a" stroke-width="2"/>
  <path d="M44 30 q8 -8 16 0 q8 -8 16 0 M50 40 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="#e2b04a" stroke-width="1.6" opacity=".8"/>
  <ellipse cx="46" cy="32" rx="12" ry="6" fill="#fff" opacity=".18"/></svg>`;
const DUI_SVG = `<svg viewBox="0 0 90 40" aria-hidden="true"><rect x="22" y="17" width="66" height="6" rx="3" fill="#8a5a33"/><ellipse cx="16" cy="20" rx="15" ry="13" fill="#6b3a1c"/><ellipse cx="12" cy="16" rx="6" ry="4" fill="#fff" opacity=".2"/></svg>`;
function moGame() {
  const BEAT = 1300, N = 10, need = RU.CHANT.mo.every, LEAD = 1600, WIN = 210;
  mgShow(`<button class="x" data-mgclose>✕</button><h2>Gõ mõ tụng kinh</h2>
    <p class="muted small">Vòng vàng nở dần ra. Khi nó <b>chạm vòng ngoài</b> thì bấm <kbd>Space</kbd> (hoặc chạm vào mõ) để gõ. Cần ${need}/${N} tiếng đúng nhịp.</p>
    <div class="sutra" id="sutra"></div>
    <div class="mo-stage" id="moStage"><i class="mo-out"></i><i class="mo-in" id="moIn"></i><span class="mo-wood" id="moWood">${MO_SVG}</span><span class="mo-dui" id="moDui">${DUI_SVG}</span><b class="mo-fx" id="moFx"></b></div>
    <p id="moMsg"><b>0</b>/${need} tiếng đúng nhịp</p>`);
  const t0 = performance.now() + LEAD, hits = new Set(); let good = 0, run = true, lastTap = 0, flash = 0;
  const inn = $('#moIn'), wood = $('#moWood'), dui = $('#moDui'), fx = $('#moFx'), msg = $('#moMsg'), sut = $('#sutra');
  const tap = () => {
    const now = performance.now(); if (now - lastTap < 220) return; lastTap = now;
    const k = Math.round((now - t0) / BEAT), off = Math.abs(now - (t0 + k * BEAT));
    dui.classList.remove('hit'); void dui.offsetWidth; dui.classList.add('hit');
    wood.classList.add('hit'); setTimeout(() => wood.classList.remove('hit'), 90);
    const ok = k >= 1 && k <= N && off < WIN && !hits.has(k);
    if (ok) { hits.add(k); good++; sfx.knock(k % 4 === 1); fx.textContent = off < 90 ? 'Chuẩn!' : 'Cốc!'; fx.className = 'mo-fx ok'; }
    else { sfx.knock(false); fx.textContent = (now - t0) < (Math.max(1, k) * BEAT) ? 'Sớm quá' : 'Trễ rồi'; fx.className = 'mo-fx bad'; }
    setTimeout(() => { fx.className = 'mo-fx'; }, 450);
    msg.innerHTML = `<b>${good}</b>/${need} tiếng đúng nhịp`;
  };
  S.mgTap = tap; $('#moStage').onpointerdown = e => { e.preventDefault(); tap(); };
  const loop = () => {
    if (!run) return;
    const e = performance.now() - t0, k = Math.ceil(e / BEAT), ph = e < 0 ? Math.max(0, 1 + e / BEAT) : ((e % BEAT) + BEAT) % BEAT / BEAT;
    // vòng trong nở từ 70px tới 176px (= vòng ngoài) đúng lúc tới nhịp
    const sz = 70 + 106 * (e < -BEAT ? 0 : ph);
    inn.style.width = inn.style.height = sz + 'px';
    inn.classList.toggle('near', ph > .86 && e > -BEAT * .2);
    sut.innerHTML = e < 0 ? '<span class="muted">Chuẩn bị… vòng vàng đang nở</span>' : `<span class="on">${esc(SUTRA[Math.min(SUTRA.length - 1, Math.max(0, k))])}</span>`;
    if (e > N * BEAT + 400) {
      run = false;
      if (good >= need) { msg.innerHTML = `<b>Viên mãn!</b> ${good}/${N} tiếng đúng nhịp 🙏`; setTimeout(() => chantFinish('mo', good), 900); }
      else { msg.innerHTML = `Mới ${good}/${need} tiếng đúng nhịp — tâm còn động, thử lại nhé`; setTimeout(() => { if (S.mg === 'mo') moGame(); }, 1600); }
      return;
    }
    requestAnimationFrame(loop);
  };
  S.mgStop = () => { run = false; S.mgTap = null; };
  requestAnimationFrame(loop);
}
// Lần tràng hạt: lăn chuột (mỗi nấc một hạt), điện thoại thì chạm. Vội quá hạt không tính.
function beadsGame() {
  const N = RU.CHANT.beads.every, GAP = 450, STEP = 360 / N, R0 = 92;
  let beads = ''; for (let i = 0; i < N; i++) { const a = (90 + i * STEP) * Math.PI / 180; beads += `<i style="left:${105 + Math.cos(a) * R0}px;top:${105 + Math.sin(a) * R0}px"></i>`; }
  mgShow(`<button class="x" data-mgclose>✕</button><h2>📿 Lần tràng hạt</h2>
    <p class="muted small"><b>Lăn chuột</b> để lần qua từng hạt (điện thoại: chạm vào chuỗi hạt). Thong thả theo hơi thở — lăn vội quá hạt sẽ không tính.</p>
    <div class="beads-wrap" id="beadsWrap"><div class="beads" id="beads">${beads}</div><div class="breath" id="breath">Hít vào…</div><span class="bead-hand">🤲</span></div>
    <p id="bdMsg"><b>0</b>/${N} hạt</p>`);
  let n = 0, last = 0, acc = 0, done = false;
  const ring = $('#beads'), els = [...ring.children], br = $('#breath'), msg = $('#bdMsg');
  const step = () => {
    if (done) return;
    const now = performance.now();
    if (now - last < GAP) { br.textContent = 'Chậm lại…'; br.classList.add('warn'); return; }
    br.classList.remove('warn'); last = now;
    els[n].classList.add('done'); n++; sfx.bead();
    ring.style.transform = `rotate(${-n * STEP}deg)`;
    br.textContent = n % 2 ? 'Thở ra…' : 'Hít vào…';
    msg.innerHTML = `<b>${n}</b>/${N} hạt`;
    if (n >= N) { done = true; msg.innerHTML = '<b>Trọn một chuỗi</b> · tâm an 🙏'; S.mgTap = null; setTimeout(() => chantFinish('beads', n), 800); }
  };
  const wheel = e => { e.preventDefault(); acc += Math.abs(e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY); if (acc >= 60) { acc = 0; step(); } };
  const wrap = $('#mgModal');
  wrap.addEventListener('wheel', wheel, { passive: false });
  S.mgTap = step; $('#beadsWrap').onpointerdown = e => { if (e.pointerType !== 'mouse') { e.preventDefault(); step(); } };
  S.mgStop = () => { S.mgTap = null; wrap.removeEventListener('wheel', wheel); };
}

function showTired() {
  $('#resultCard').innerHTML = `<div class="big">😮‍💨</div><h2>Hết sinh lực rồi!</h2><p class="muted">Ra <b>Quán Ăn Vỉa Hè</b> ở khu chợ trước cổng chùa làm bát phở, bánh mì cho lại sức. Hoặc nghỉ ngơi một lúc: sinh lực tự hồi 1 điểm mỗi 90 giây.</p>
    <button class="primary" id="goFood">Chỉ đường tới quán ăn 🍜</button><button class="primary ghost" data-close>Để sau</button>`;
  $('#goFood').onclick = () => { closeModals(); S.target = { x: L.market.food.x, y: L.market.food.y + 110 }; };
  $('#resultModal').classList.remove('hidden');
}

/* ---------------- Kéo co ---------------- */
function openTug() { renderTug(); $('#tugModal').classList.remove('hidden'); }
function renderTug() {
  const tg = S.tug || { offers: [] }, p = S.profile || { phuoc: 0 }, mine = (tg.offers || []).find(o => o.id === S.me.id);
  let h = '';
  if (tg.match) h += `<p class="muted">Đang có trận: <b>${esc(tg.match.aName)}</b> ⚔️ <b>${esc(tg.match.bName)}</b> · cược ${tg.match.bet} phước</p>`;
  const others = (tg.offers || []).filter(o => o.id !== S.me.id);
  h += '<label>Kèo đang chờ</label>' + (others.length ? others.map(o => `<div class="tug-offer"><span>🪢 <b>${esc(o.name)}</b> cược <b>${o.bet}</b> phước</span><button class="mini-btn" data-accept="${o.id}" ${p.phuoc < o.bet ? 'disabled title="Không đủ phước"' : ''}>Nhận kèo</button></div>`).join('') : '<p class="muted">Chưa ai thách đấu. Ra kèo trước đi!</p>');
  h += mine ? `<label>Kèo của bạn</label><div class="tug-offer"><span>Đang chờ người nhận kèo <b>${mine.bet}</b> phước…</span><button class="mini-btn" data-cancel="1">Huỷ</button></div>`
    : `<label>Ra kèo thách đấu · bạn có ${p.phuoc} phước</label><div class="bets">${RU.TUG_BETS.map(b => `<button data-bet="${b}" ${p.phuoc < b ? 'disabled' : ''}>${b} 🍀</button>`).join('')}</div>`;
  h += `<p class="muted small" style="text-align:left">Mỗi trận tốn ${RU.COST.tug} sinh lực. Thắng nhận cả phần cược của đối thủ, hoà thì hoàn lại.${S.demo ? ' Bản demo: một bạn đồng tu (bot) sẽ nhận kèo sau vài giây.' : ''}</p>`;
  $('#tugBody').innerHTML = h;
}
$('#tugBody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.bet) send({ t: 'tugOffer', bet: +b.dataset.bet });
  else if (b.dataset.accept) send({ t: 'tugAccept', id: b.dataset.accept });
  else if (b.dataset.cancel) send({ t: 'tugCancel' });
});
function onTugState() {
  if (!$('#tugModal').classList.contains('hidden')) renderTug();
  const mt = S.tug && S.tug.match;
  if (mt && S.me && (mt.a === S.me.id || mt.b === S.me.id) && (!S.inMatch || S.inMatch.startAt !== mt.startAt)) {
    S.inMatch = mt; closeModals();
    const t = L.market.tug; S.me.x = t.x + (mt.a === S.me.id ? -150 : 150); S.me.y = t.y; S.target = null;
    send({ t: 'move', x: S.me.x, y: S.me.y, dir: 1, moving: false });
    $('#tugA').textContent = mt.aName; $('#tugB').textContent = mt.bName; $('#tugBet').textContent = `cược ${mt.bet} phước`;
    $('#tugHud').classList.remove('hidden'); $('#tugCount').textContent = 'Bấm Ctrl+Z, Z hoặc Space thật nhanh khi có hiệu lệnh'; S.tugLast = 0; sfx.bell();
  }
}
function pressTug() {
  const mt = S.inMatch; if (!mt) return;
  // Không tự chặn theo đồng hồ máy mình (có thể lệch) — server quyết định, dung sai như nhau cho cả hai bên
  const now = Date.now() + S.serverOffset, pn = performance.now(); if (now < mt.startAt - 400) return;
  if (pn - (S.tugLast || 0) < RU.TUG.minGap) return; S.tugLast = pn;
  send({ t: 'tug' }); sfx.tick();
  const b = $('#tugBtn'); b.style.transform = 'scale(.95)'; setTimeout(() => b.style.transform = '', 60);
}
$('#tugBtn').addEventListener('pointerdown', e => { e.preventDefault(); pressTug(); });
function onTugEnd(m) {
  const me = S.me && S.me.id, mine = S.inMatch && (S.inMatch.a === me || S.inMatch.b === me);
  if (mine) {
    const meA = m.a === me, myN = meA ? m.ca : m.cb, opN = meA ? m.cb : m.ca;
    if (myN !== undefined) $('#tugCount').textContent = `Bạn kéo ${myN} lần · đối thủ ${opN} lần`;
    $('#tugMsg').textContent = !m.winner ? 'Hoà! Hoàn lại phước cược' : m.winner === me ? `🎉 Thắng! +${m.bet * 2} phước` : `😵 Thua mất ${m.bet} phước`;
    if (m.winner === me) sfx.win(); else sfx.soft();
    setTimeout(() => { $('#tugHud').classList.add('hidden'); S.inMatch = null; }, 2600);
  }
  ticker(m.winner ? `🪢 ${m.wName} kéo thắng ${m.lName}${m.forfeit ? ' (đối thủ bỏ chạy)' : ''} · +${m.bet * 2} phước` : '🪢 Trận kéo co hoà!');
}
function updateTugHud() {
  const mt = S.inMatch; if (!mt) return;
  const live = S.tug && S.tug.match && S.tug.match.startAt === mt.startAt ? S.tug.match : mt;
  const now = Date.now() + S.serverOffset;
  $('#tugKnot').style.left = (50 + Math.max(-1, Math.min(1, live.pos / RU.TUG.win)) * 50) + '%';
  if (S.tug && S.tug.match && S.tug.match.startAt === mt.startAt) {
    const lv = S.tug.match, meA = lv.a === S.me.id;
    if (lv.ca !== undefined) $('#tugCount').textContent = `Bạn: ${meA ? lv.ca : lv.cb} lần · Đối thủ: ${meA ? lv.cb : lv.ca} lần`;
    if (now < mt.startAt) $('#tugMsg').textContent = Math.ceil((mt.startAt - now) / 1000);
    else $('#tugMsg').textContent = `KÉO!!! ${Math.max(0, Math.ceil((mt.endAt - now) / 1000))}s`;
  }
}

/* ---------------- Bãi khẩu nghiệp ---------------- */
$('#sayBar').addEventListener('submit', e => { e.preventDefault(); const v = $('#sayInput').value.trim(); if (!v) { $('#sayInput').blur(); return; } send({ t: 'say', text: v }); expectReply('khẩu nghiệp'); $('#sayInput').value = ''; $('#sayInput').blur(); });
$('#sayInput').addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; e.target.blur(); } });

/* ---------------- Dựng danh sách vẽ mỗi khung ---------------- */
function avatarItems(items, p, t, isMe) {
  const am = W3.avatarMeshes(R, p.color, p.hat, p.hair, p.outfit), x = p.x * K, z = p.y * K, h = groundH(p.x, p.y);
  const em = S.emotes.get(p.id), age = em ? (t - em.t) / 1000 : 9;
  const bow = em && em.e === 'bow' && age < 1.6 ? Math.sin(Math.min(1, age / 1.6) * Math.PI) * .55 : 0;
  const zen = em && em.e === 'zen' && age < 3.2, wave = em && em.e === 'wave' && age < 1.5;
  const digging = isMe && S.digAnim && t - S.digAnim < 900;
  const bob = p.moving ? Math.abs(Math.sin(p.walk * 11)) * .06 : Math.sin(t / 500 + p.x) * .008;
  const sweeping = isMe && S.sweepAnim && t - S.sweepAnim < 900;
  const tilt = bow + (digging ? Math.abs(Math.sin((t - S.digAnim) / 900 * Math.PI * 3)) * .35 : 0) + (p.moving ? .06 : 0) + (sweeping ? .25 : 0) - (S.tug && S.tug.match && (S.tug.match.a === p.id || S.tug.match.b === p.id) ? .32 + Math.sin(t / 60) * .04 : 0);
  const mt = S.tug && S.tug.match, tugging = mt && (mt.a === p.id || mt.b === p.id);
  if (tugging) { p.yaw = mt.a === p.id ? Math.PI / 2 : -Math.PI / 2; }
  const yaw = p.yaw, sy = Math.sin(yaw), cyw = Math.cos(yaw), y0 = h + bob;
  if (p.pose === 'fish') {   // ngồi ghế câu, cầm cần chĩa ra hồ
    const sy0 = h + .22; items.push({ mesh: am.sitBody, m: T(x, sy0, z, 0) }); items.push({ mesh: am.head, m: T(x, sy0 + .78, z, 0) });
    const mine = isMe && S.cauState, dip = mine === 'bite' ? .08 + Math.sin(t / 60) * .05 : mine === 'reel' ? .05 + Math.sin(t / 45) * .06 : 0;
    const bx = x + .15, bz = z + 1.53, by = .04 + Math.sin(t / 420 + x) * .015 - dip;
    items.push({ mesh: dyn.rod, m: T(x + .15, sy0 + .35, z + .1), noShadow: true });
    items.push({ mesh: dyn.line, m: T(bx, by, bz, 0, 1, sy0 + .35 + .92 - by, 1), noShadow: true });
    if (!isMe || mine) items.push({ mesh: dyn.bobber, m: T(bx, by, bz), noShadow: true });
  } else if (zen || p.pose === 'sit') {
    items.push({ mesh: am.sitBody, m: T(x, h, z, yaw) });
    items.push({ mesh: am.head, m: T(x, h + .78, z, yaw) });
  } else {
    const pray = em && (em.e === 'pray' || em.e === 'bow') && age < 2.6;
    const joined = pray || (isMe && S.busy && !digging);
    items.push({ mesh: am.body, m: T(x, y0, z, yaw, 1, 1, 1, tilt) });
    // chỉ vẽ MỘT đôi tay: buông hai bên hoặc chắp trước ngực
    items.push({ mesh: joined ? am.armsPray : am.armsSide, m: T(x, y0, z, yaw, 1, 1, 1, tilt) });
    const hx = x + sy * Math.sin(tilt) * .86, hy = y0 + Math.cos(tilt) * .86, hz = z + cyw * Math.sin(tilt) * .86;
    items.push({ mesh: am.head, m: T(hx, hy, hz, yaw + (wave ? Math.sin(t / 90) * .25 : 0), 1, 1, 1, tilt * 1.1) });
    const sw = p.moving ? Math.sin(p.walk * 11) * .12 : 0;
    for (const s of [-1, 1]) { const lx = s * .11, lz = sw * s; items.push({ mesh: dyn.feet, m: T(x + cyw * lx + sy * lz, h, z - sy * lx + cyw * lz, yaw) }); }
    if (sweeping) { const a = Math.sin((t - S.sweepAnim) / 900 * Math.PI * 4); items.push({ mesh: dyn.broom, m: T(x + sy * .45 + cyw * a * .2, h, z + cyw * .45 - sy * a * .2, yaw, 1, 1, 1, .5, a * .5) }); }
    if (digging) { const a = Math.sin((t - S.digAnim) / 900 * Math.PI * 3); items.push({ mesh: hoe, m: T(x + sy * .35, h + .35, z + cyw * .35, yaw, 1, 1, 1, -.4 + a * .9) }); }
  }
  if (isMe) items.push({ mesh: dyn.ring, m: T(x, h + .005, z, t / 900), em: .6, noShadow: true });
}
const hoe = R && R.mesh(new Geo().add(P.cyl(.025, .025, .7, 6), '#8a5a33', T(0, 0, 0)).add(P.rbox(.2, .05, .12, .02, 1), '#a7adb3', T(0, .7, .05)));

function stickSpot(app) {
  const pl = app !== 'all' && plaques.find(p => p.app.id === app);
  if (pl) { const w = hw(pl.lx, 1.3, 2.08); return { x: w[0], y: w[1], z: w[2] }; }
  return { x: L.bowl.x * K, y: 1.1 * L.bowl.s, z: L.bowl.y * K };
}
function frameItems(t) {
  const items = [scene.world, scene.decal, scene.water, scene.glow];
  items.push(...scene.texItems);
  plaques.forEach(p => { items.push({ mesh: plaqueBack, m: p.m }); items.push({ mesh: plaqueQuad, m: p.m, tex: p.tex, em: .22 }); });
  if (S.roofA > .02) items.push({ mesh: scene.roof.mesh, alpha: S.roofA >= .99 ? undefined : S.roofA });
  if (S.gateA > .03) items.push({ mesh: scene.gate.mesh, alpha: S.gateA >= .99 ? undefined : S.gateA }, Object.assign({}, scene.gateSign, { alpha: S.gateA >= .99 ? undefined : S.gateA }));
  // luống rau
  const now = Date.now() + S.serverOffset;
  L.plots.forEach(p => {
    const st = S.plots[p.id]; if (!st) return;
    const x = p.x * K, z = p.y * K - .05;
    if (st.state === 'ripe') items.push({ mesh: dyn.cabbage, m: T(x, .2, z, 0, 1, 1 + Math.sin(t / 700 + x * 3) * .03, 1) });
    else { const k = Math.max(0, Math.min(1, 1 - (st.regrowAt - now) / S.regrowMs)); items.push({ mesh: dyn.hole, m: T(x, 0, z) }); items.push({ mesh: dyn.sprout, m: T(x, .2 * (1 - k), z, 0, 1, .4 + k * 1.4, 1) }); }
  });
  // nhang
  // mỗi nén hương = một bó 3 que xoè nhẹ; lư hương chung to nên que dày & dài hơn cho dễ thấy
  const addSticks = (sticks, bx, by, bz, rad, len, n, w = 1, bundle = 1) => sticks.slice(-n).forEach((s, i) => {
    const a = s.slot * 2.39, rr = rad * (.2 + (s.slot % 7) / 10), age = Math.max(0, (now - s.t) / 180000), l = len * (1 - age * .55);
    const x0 = bx + Math.cos(a) * rr, z0 = bz + Math.sin(a) * rr, fresh = Math.max(0, 1 - (now - s.t) / 4000);
    for (let j = 0; j < bundle; j++) {
      const sp = bundle > 1 ? (j - 1) * .13 : 0, lx = Math.cos(a) * .1 + Math.cos(a + 1.57) * sp, lz = Math.sin(a) * .1 + Math.sin(a + 1.57) * sp;
      const x = x0 + Math.cos(a + 1.57) * sp * .05, z = z0 + Math.sin(a + 1.57) * sp * .05;
      items.push({ mesh: dyn.stick, m: T(x, by, z, 0, w, l, w, lz, -lx), noShadow: true });
      const tip = [x + Math.sin(lx) * l, by + Math.cos(lz) * Math.cos(lx) * l, z + Math.sin(lz) * Math.cos(lx) * l];
      const ts = w * (1 + fresh * .8);
      items.push({ mesh: dyn.tip, m: T(tip[0], tip[1], tip[2], 0, ts, ts, ts), em: 1.6 + fresh * 2 + Math.sin(t / 150 + i + j) * .4, noShadow: true });
      if (Math.random() < .05 * G.fx * (1 + fresh * 3)) S.particles.push({ x: tip[0], y: tip[1], z: tip[2], vx: (Math.random() - .5) * .1, vy: .35 + Math.random() * .2, vz: 0, life: 3.4, age: 0, kind: 'smoke', r: 2.5 * Math.min(2, w) });
    }
  });
  addSticks(S.incense.filter(s => s.app === 'all'), L.bowl.x * K, .86 * L.bowl.s, L.bowl.y * K - .05, .45 * L.bowl.s, .66 * L.bowl.s, 16, 1.6, 3);
  plaques.forEach(pl => { const w = hw(pl.lx, 1.235, 2.08); addSticks(S.incense.filter(s => s.app === pl.app.id), w[0], w[1], w[2], .06 * HS, .26 * HS, 4, 1.4, 1); });
  // ụ lá đa
  L.leaves.forEach(l => { const st = S.leaves[l.id]; if (st && st.state === 'full') items.push({ mesh: dyn.leafPile, m: T(l.x * K, 0, l.y * K, l.id * 1.3, 1.6, 1.4, 1.6) }); });
  // dây kéo co
  const mt = S.tug && S.tug.match;
  if (mt) {
    const pa = S.me && S.me.id === mt.a ? S.me : S.players.get(mt.a), pb = S.me && S.me.id === mt.b ? S.me : S.players.get(mt.b);
    if (pa && pb) {
      const ax = pa.x * K + .25, az = pa.y * K, bx = pb.x * K - .25, bz = pb.y * K, dx = ax - bx, dz = az - bz, len = Math.hypot(dx, dz);
      items.push({ mesh: dyn.rope, m: T(bx, .5, bz, Math.atan2(dz, -dx), len, 1, 1) });   // mesh dây đã nằm ngang theo trục -x
      const k = .5 - Math.max(-1, Math.min(1, mt.pos / RU.TUG.win)) * .35;
      items.push({ mesh: dyn.flag, m: T(bx + dx * k, .5, bz + dz * k) });
    }
  }
  // chuông
  const ring = (performance.now() - S.bellRing) / 1000, swing = ring < 4 ? Math.sin(ring * 8) * .3 * (1 - ring / 4) : 0;
  items.push({ mesh: dyn.bell, m: T(L.bell.x * K, 2.02 * L.bell.s, L.bell.y * K, 0, L.bell.s, L.bell.s, L.bell.s, swing) });
  // động vật
  for (const a of L.animals) {
    if (a.id === 'fish') {
      const fed = S.animalFx.some(f => f.id === 'fish' && t - f.t < 3000);
      for (let i = 0; i < 6; i++) {
        const sp = (fed ? 1.6 : .35) * (i % 2 ? 1 : -1), ang = t / 1000 * sp + i * 1.1, rx = L.pond.rx * K * (.75 - i * .07), rz = L.pond.ry * K * (.7 - i * .06);
        const fx = L.pond.x * K + Math.cos(ang) * rx, fz = L.pond.y * K + Math.sin(ang) * rz, yaw = Math.atan2(-Math.sin(ang) * rx * Math.sign(sp), Math.cos(ang) * rz * Math.sign(sp));
        items.push({ mesh: i % 3 === 0 ? dyn.fishW : dyn.fish, m: T(fx, .02 + Math.sin(t / 300 + i) * .01, fz, yaw + Math.sin(t / 150 + i) * .15), noShadow: true });
      }
      continue;
    }
    const p = animalPos(a, t), p2 = animalPos(a, t + 120), yaw = Math.atan2(p2.x - p.x, p2.y - p.y);
    const happy = S.animalFx.some(f => f.id === a.id && t - f.t < 2500), hop = happy ? Math.abs(Math.sin(t / 110)) * .18 : Math.abs(Math.sin(t / 160)) * .02;
    items.push({ mesh: dyn[a.id], m: T(p.x * K, hop, p.y * K, yaw) });
  }
  // cá phóng sinh: nhảy vòng cung từ tay người thả xuống sông (hoặc bị Cô Ba vớt lại)
  S.fishFx = S.fishFx.filter(f => t - f.t < f.life);
  for (const f of S.fishFx) {
    const k = Math.min(1, (t - f.t) / f.dur); if (k >= 1) { if (!f.splashed) { f.splashed = true; for (let i = 0; i < 16; i++) S.particles.push({ x: f.x1, y: .1, z: f.z1, vx: (Math.random() - .5) * 1.6, vy: 1 + Math.random() * 1.6, vz: (Math.random() - .5) * 1.2, life: .9, age: 0, kind: 'spark', c: '#d8eef5', r: 3 }); } continue; }
    const x = f.x0 + (f.x1 - f.x0) * k, z = f.z0 + (f.z1 - f.z0) * k, y = f.y0 + (f.y1 - f.y0) * k + Math.sin(k * Math.PI) * f.arc;
    items.push({ mesh: dyn.fish, m: T(x, y, z, Math.atan2(f.x1 - f.x0, f.z1 - f.z0) + Math.PI / 2, 1.6, 1.6, 1.6, 0, k * 6), noShadow: true });
  }
  // ruồi bay quanh người đào phải cức + cục cức ở luống
  for (const [id, until] of S.stink) {
    if (t > until) { S.stink.delete(id); continue; }
    const p = S.me && id === S.me.id ? S.me : S.players.get(id); if (!p) continue;
    const hy = groundH(p.x, p.y) + 1.2;
    for (let i = 0; i < 5; i++) { const a = t / (260 + i * 37) + i * 1.3, rr = .32 + .08 * Math.sin(t / 300 + i); items.push({ mesh: dyn.fly, m: T(p.x * K + Math.cos(a) * rr, hy + Math.sin(t / 170 + i * 2) * .18, p.y * K + Math.sin(a) * rr, -a, 1.8, 1.8, 1.8), noShadow: true }); }
  }
  S.poopFx = S.poopFx.filter(f => t - f.t < 5000);
  for (const f of S.poopFx) { const d = L.plots[f.plot]; if (d) items.push({ mesh: dyn.poop, m: T(d.x * K + .25, .02 + Math.max(0, .3 - (t - f.t) / 1500), d.y * K, 0, 1.4, 1.4, 1.4) }); }
  // người chơi
  for (const p of S.players.values()) avatarItems(items, p, t, false);
  if (S.me) avatarItems(items, S.me, t, true);
  // vòng chạm
  if (S.tapFx && t - S.tapFx.t < 600) { const k = (t - S.tapFx.t) / 600; items.push({ mesh: dyn.ring, m: T(S.tapFx.x * K, .03, S.tapFx.y * K, 0, .4 + k * .6, 1, .4 + k * .6), alpha: 1 - k, em: .8, noShadow: true }); }
  return items;
}

/* ---------------- Overlay 2D (tên, lời nguyện, khói…) ---------------- */
function drawOverlay(t) {
  octx.setTransform(dpr, 0, 0, dpr, 0, 0); octx.clearRect(0, 0, innerWidth, innerHeight);
  if (S.night > .05) { // quầng sáng đèn lồng, nến và đom đóm ban đêm
    octx.globalCompositeOperation = 'lighter';
    const sc = 15 / S.dist, glowAt = (x, y, z, r, a) => { const p = project(x, y, z); if (!p) return; const rr = r * sc, g = octx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr); g.addColorStop(0, `rgba(255,170,90,${a * S.night})`); g.addColorStop(1, 'rgba(255,140,60,0)'); octx.fillStyle = g; octx.fillRect(p[0] - rr, p[1] - rr, rr * 2, rr * 2); };
    glowAt(...hw(7.92, 1.6, 2.05), 80, .4); glowAt(...hw(12.08, 1.6, 2.05), 80, .4); glowAt(L.bowl.x * K, 1.5, L.bowl.y * K, 100, .3);
    const fly = curWeather() === 'clear' || curWeather() === 'cloudy' ? 1 : 0;
    for (let i = 0; i < Math.round(26 * G.fx * fly); i++) { const fx = 2 + (i * 7.31 % (L.W * K - 4)) + Math.sin(t / 2100 + i) * .6, fz = 2.5 + (i * 3.77 % (L.GATE_Y * K - 4)) + Math.cos(t / 1800 + i * 2) * .5, f = .5 + .5 * Math.sin(t / 340 + i * 5); glowAt(fx, .6 + Math.sin(t / 900 + i) * .3, fz, 10, .9 * f); }
    octx.globalCompositeOperation = 'source-over';
  }
  // hạt
  for (const p of S.particles) {
    const s = project(p.x, p.y, p.z); if (!s) continue; const k = p.age / p.life, sc = 15 / S.dist;
    if (p.kind === 'smoke') octx.fillStyle = `rgba(250,248,240,${.4 * (1 - k)})`;
    else if (p.kind === 'dirt') octx.fillStyle = `rgba(120,80,45,${1 - k * .6})`;
    else if (p.kind === 'petal') { octx.fillStyle = `rgba(247,170,198,${Math.min(1, (1 - k) * 3)})`; octx.beginPath(); octx.ellipse(s[0], s[1], 4 * sc, 2.2 * sc, p.age * 3 + p.seed, 0, 7); octx.fill(); continue; }
    else octx.fillStyle = p.c;
    octx.beginPath(); octx.arc(s[0], s[1], p.r * sc, 0, 7); octx.fill();
  }
  // hào quang (thỉnh chuông đúng nhịp) và mây 💨 (lệch nhịp)
  const who = id => S.me && id === S.me.id ? S.me : S.players.get(id);
  for (const [id, t0] of S.halos) {
    const p = who(id), age = (t - t0) / 1000; if (!p || age > 8) { S.halos.delete(id); continue; }
    const s = project(p.x * K, groundH(p.x, p.y) + .7, p.y * K); if (!s) continue;
    const sc = 15 / S.dist, a = Math.min(1, age * 3, (8 - age) / 2), r = (40 + Math.sin(t / 200) * 3) * sc;
    octx.globalCompositeOperation = 'lighter';
    const g = octx.createRadialGradient(s[0], s[1], r * .2, s[0], s[1], r * 1.6); g.addColorStop(0, `rgba(255,220,120,${.55 * a})`); g.addColorStop(1, 'rgba(255,200,80,0)');
    octx.fillStyle = g; octx.beginPath(); octx.arc(s[0], s[1], r * 1.6, 0, 7); octx.fill();
    const top = project(p.x * K, groundH(p.x, p.y) + 1.36, p.y * K); if (top) { octx.strokeStyle = `rgba(255,230,150,${.95 * a})`; octx.lineWidth = 3 * sc; octx.beginPath(); octx.ellipse(top[0], top[1], r * .42, r * .14, 0, 0, 7); octx.stroke(); }
    for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2 + t / 1500; octx.strokeStyle = `rgba(255,214,110,${.5 * a})`; octx.lineWidth = 1.5; octx.beginPath(); octx.moveTo(s[0] + Math.cos(an) * r * .8, s[1] + Math.sin(an) * r * .8); octx.lineTo(s[0] + Math.cos(an) * r * 1.35, s[1] + Math.sin(an) * r * 1.35); octx.stroke(); }
    octx.globalCompositeOperation = 'source-over';
  }
  S.farts = S.farts.filter(f => t - f.t < 2600);
  for (const f of S.farts) {
    const p = who(f.id); if (!p) continue; const k = (t - f.t) / 2600, sc = 15 / S.dist;
    const s = project(p.x * K - Math.sin(p.yaw) * .3, groundH(p.x, p.y) + .45 + k * .5, p.y * K - Math.cos(p.yaw) * .3); if (!s) continue;
    octx.globalAlpha = 1 - k;
    for (let i = 0; i < 4; i++) { octx.fillStyle = i % 2 ? 'rgba(170,190,110,.55)' : 'rgba(200,210,150,.5)'; octx.beginPath(); octx.arc(s[0] + (i - 1.5) * 9 * sc * (1 + k), s[1] - i * 4 * sc, (9 + k * 16) * sc, 0, 7); octx.fill(); }
    octx.font = `${Math.round(22 * sc)}px serif`; octx.textAlign = 'center'; octx.fillText('💨', s[0] + 18 * sc, s[1] - 10 * sc - k * 20); octx.globalAlpha = 1;
  }
  drawWeather(t);
  const label = (text, x, y, z, opt = {}) => {
    const s = project(x, y, z); if (!s) return;
    octx.font = `${opt.w || 600} ${opt.size || 12}px "Be Vietnam Pro", system-ui, sans-serif`; octx.textAlign = 'center'; octx.textBaseline = 'middle';
    const w = octx.measureText(text).width + 14;
    octx.fillStyle = opt.bg || 'rgba(40,24,14,.62)'; const hh = (opt.size || 12) + 8;
    octx.beginPath(); octx.roundRect ? octx.roundRect(s[0] - w / 2, s[1] - hh / 2, w, hh, hh / 2) : octx.rect(s[0] - w / 2, s[1] - hh / 2, w, hh); octx.fill();
    octx.fillStyle = opt.fg || '#fff4dd'; octx.fillText(text, s[0], s[1] + .5);
    return s;
  };
  const all = [...S.players.values()]; if (S.me) all.push(S.me);
  for (const p of all) {
    const isMe = p === S.me, h = groundH(p.x, p.y);
    const s = label(p.name, p.x * K, h + 1.48 + (p.hat === 'non' ? .12 : 0), p.y * K, { bg: isMe ? 'rgba(232,170,60,.92)' : undefined, fg: isMe ? '#3a1d08' : undefined, w: isMe ? 700 : 600, size: 11.5 });
    const em = S.emotes.get(p.id), age = em ? (t - em.t) / 1000 : 9;
    if (em && age < 2.6 && s) {
      const icon = { pray: '🙏', bow: '🙇', heart: '💛', wave: '👋', zen: '🧘' }[em.e], y = s[1] - 30 - age * 8;
      octx.globalAlpha = Math.min(1, (2.6 - age) * 2); octx.fillStyle = '#fffaf0'; octx.beginPath(); octx.arc(s[0], y, 16, 0, 7); octx.fill();
      octx.font = '18px serif'; octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillText(icon, s[0], y + 1); octx.globalAlpha = 1;
    }
  }
  // lời khẩu nghiệp (bong bóng thoại) — kể cả NPC như Cô Ba
  for (const p of all.concat(NPC_SAY)) {
    const sv = S.says.get(p.id); if (!sv) continue;
    const age = (t - sv.t) / 1000; if (age > 6) { S.says.delete(p.id); continue; }
    const s = project(p.x * K, groundH(p.x, p.y) + 1.75, p.y * K); if (!s) continue;
    octx.font = '700 13px "Be Vietnam Pro", sans-serif'; octx.textAlign = 'center'; octx.textBaseline = 'middle';
    const words = sv.text.split(' '), lines = []; let cur = '';
    for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (octx.measureText(tst).width > 190 && cur) { lines.push(cur); cur = w; } else cur = tst; }
    if (cur) lines.push(cur);
    const bw = Math.min(210, Math.max(...lines.map(l => octx.measureText(l).width)) + 22), bh = lines.length * 17 + 14, by = s[1] - 30 - bh + Math.min(0, age * 3);
    octx.globalAlpha = age > 5 ? 6 - age : 1;
    octx.fillStyle = '#fffdf6'; octx.strokeStyle = '#c0392b'; octx.lineWidth = 2;
    octx.beginPath(); octx.roundRect ? octx.roundRect(s[0] - bw / 2, by, bw, bh, 10) : octx.rect(s[0] - bw / 2, by, bw, bh); octx.fill(); octx.stroke();
    octx.beginPath(); octx.moveTo(s[0] - 7, by + bh - 1); octx.lineTo(s[0], by + bh + 9); octx.lineTo(s[0] + 7, by + bh - 1); octx.fill();
    octx.fillStyle = '#2a1d12'; lines.forEach((l, i) => octx.fillText(l, s[0], by + 14 + i * 17));
    octx.globalAlpha = 1;
  }
  // tên người bán hàng
  for (const key of ['hat', 'cloth', 'food', 'barber', 'fortune', 'thayDo', 'fishSeller']) {
    const v = L.market[key]; if (Math.hypot(v.x * K - S.cam.x, v.y * K - S.cam.z) > 7) continue;
    label(v.name, v.x * K, key === 'fortune' ? 3.3 : key === 'food' ? 2.55 : key === 'barber' ? 2.0 : key === 'thayDo' ? 2.45 : key === 'fishSeller' ? 1.85 : 2.35, v.y * K, { size: 10.5, bg: 'rgba(120,45,30,.82)', fg: '#ffe9bf' });
  }
  // động vật: tên + tim
  for (const a of L.animals) {
    const p = a.id === 'fish' ? { x: a.x, y: a.y + 60 } : animalPos(a, t), hh = a.id === 'buffalo' ? 1.35 : a.id === 'fish' ? .3 : .85;
    const s = project(p.x * K, hh, p.y * K); if (!s) continue;
    octx.font = '600 10.5px "Be Vietnam Pro", sans-serif'; octx.textAlign = 'center'; octx.lineWidth = 3; octx.strokeStyle = 'rgba(40,24,14,.55)'; octx.strokeText(a.name, s[0], s[1]); octx.fillStyle = '#fff6e0'; octx.fillText(a.name, s[0], s[1]);
    S.animalFx.filter(f => f.id === a.id && t - f.t < 2500).forEach(f => { const k = (t - f.t) / 2500; octx.globalAlpha = 1 - k; octx.font = '18px serif'; ['💛', '🥬', '💛'].forEach((ic, i) => octx.fillText(ic, s[0] + (i - 1) * 20, s[1] - 18 - k * 46 - i * 5)); octx.globalAlpha = 1; });
  }
  // đồng hồ rau mọc
  const now = Date.now() + S.serverOffset;
  L.plots.forEach(p => { const st = S.plots[p.id]; if (st && st.state === 'dug') { const left = Math.ceil((st.regrowAt - now) / 1000); if (left > 0) label(`🌱 ${left}s`, p.x * K, .55, p.y * K + .2, { size: 10, bg: 'rgba(60,35,15,.55)' }); } });
  // lời nguyện
  S.floaters = S.floaters.filter(f => t - f.t < f.life);
  for (const f of S.floaters) {
    const k = (t - f.t) / f.life, s = project(f.x, f.y + k * 1.6, f.z); if (!s) continue;
    octx.globalAlpha = k < .1 ? k * 10 : k > .75 ? (1 - k) * 4 : 1; octx.textAlign = 'center';
    octx.font = 'italic 700 16px "Noto Serif", Georgia, serif'; octx.lineWidth = 4; octx.strokeStyle = 'rgba(60,25,10,.7)'; octx.strokeText(f.text, s[0], s[1]); octx.fillStyle = '#fff3cf'; octx.fillText(f.text, s[0], s[1]);
    octx.font = '600 11.5px "Be Vietnam Pro", sans-serif'; octx.strokeText(f.sub, s[0], s[1] + 18); octx.fillStyle = '#ffd36b'; octx.fillText(f.sub, s[0], s[1] + 18);
    octx.globalAlpha = 1;
  }
  // điểm tương tác
  if (S.interact) {
    const it = S.interact, s = project(it.x * K, it.h + Math.sin(t / 250) * .06, it.y * K);
    if (s) { octx.fillStyle = 'rgba(255,246,222,.96)'; octx.strokeStyle = '#e0a640'; octx.lineWidth = 2.5; octx.beginPath(); octx.arc(s[0], s[1], 18, 0, 7); octx.fill(); octx.stroke(); octx.font = '18px serif'; octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillText(it.icon, s[0], s[1] + 1); }
  }
}

/* ---------------- Thời tiết (vẽ 2D trên overlay — rất nhẹ) ---------------- */
const drops = [];
function drawWeather(t) {
  const k = curWeather(), Wd = innerWidth, Hd = innerHeight;
  const want = k === 'rain' ? 140 : k === 'storm' ? 230 : k === 'snow' ? 120 : 0, n = Math.round(want * (G.fx < 1 ? .5 : 1));
  while (drops.length < n) drops.push({ x: Math.random() * Wd, y: Math.random() * Hd, v: .6 + Math.random() * .6, s: Math.random() });
  if (drops.length > n) drops.length = n;
  if (!n) return;
  const dt = Math.min(.1, (t - (S.wxT || t)) / 1000); S.wxT = t;
  if (k === 'snow') {
    octx.fillStyle = 'rgba(255,255,255,.85)';
    for (const d of drops) { d.y += (28 + d.v * 30) * dt; d.x += Math.sin(t / 900 + d.s * 9) * 18 * dt; if (d.y > Hd) { d.y = -5; d.x = Math.random() * Wd; } octx.beginPath(); octx.arc(d.x, d.y, 1.4 + d.s * 2, 0, 7); octx.fill(); }
  } else {
    const wind = k === 'storm' ? -.32 : -.15;
    octx.strokeStyle = k === 'storm' ? 'rgba(200,215,235,.42)' : 'rgba(210,225,240,.36)'; octx.lineWidth = 1.1; octx.beginPath();
    for (const d of drops) { const sp = (k === 'storm' ? 1300 : 950) * d.v; d.y += sp * dt; d.x += sp * wind * dt; if (d.y > Hd) { d.y = -20; d.x = Math.random() * (Wd + 200); } if (d.x < -20) d.x += Wd + 40; const L2 = 10 + d.v * 10; octx.moveTo(d.x, d.y); octx.lineTo(d.x - wind * L2, d.y - L2); }
    octx.stroke();
    if (k === 'storm' && Math.random() < .003) { const el = $('#wxLayer'); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 90); setTimeout(() => { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 60); }, 180); setTimeout(sfx.thunder, 700); }
  }
}
$('#wxBtn').onclick = () => {
  const i = S.wxPreview ? WX_ORDER.indexOf(S.wxPreview) : -1;
  S.wxPreview = i + 1 < WX_ORDER.length ? WX_ORDER[i + 1] : null;
  applySky(); showWeatherChip();
  const w = S.weather || {};
  toast(S.wxPreview ? `Xem thử thời tiết: ${RU.WEATHER[S.wxPreview][1]}` : `Thời tiết thật${w.city ? ' tại ' + w.city : ''}: ${(RU.WEATHER[w.kind] || RU.WEATHER.clear)[1]}${w.temp != null ? ', ' + w.temp + '°C' : ''}`);
};

/* ---------------- Minimap ---------------- */
let mmT = 0;
function drawMinimap() {
  const now = performance.now(); if (now - mmT < 200) return; mmT = now;   // bản đồ nhỏ: 5 lần/giây là đủ
  const Wm = mm.width, Hm = mm.height, sx = Wm / L.W, sy = Hm / L.H;
  mctx.clearRect(0, 0, Wm, Hm);
  mctx.fillStyle = '#7dbb57'; mctx.fillRect(0, 0, Wm, Hm);
  mctx.fillStyle = '#a99e8c'; for (const [x0, y0, x1, y1] of L.paths) mctx.fillRect(x0 * sx, y0 * sy, (x1 - x0) * sx, (y1 - y0) * sy);
  mctx.fillStyle = '#b8382a'; mctx.fillRect(L.hall.x * sx, L.hall.y * sy, L.hall.w * sx, L.hall.h * sy);
  mctx.fillStyle = '#8a5a35'; mctx.fillRect(L.garden.x * sx, L.garden.y * sy, L.garden.w * sx, L.garden.h * sy);
  mctx.strokeStyle = '#6d4a2a'; mctx.lineWidth = 1; mctx.strokeRect(L.pen.x * sx, L.pen.y * sy, L.pen.w * sx, L.pen.h * sy);
  mctx.fillStyle = '#57b8cf'; mctx.beginPath(); mctx.ellipse(L.pond.x * sx, L.pond.y * sy, L.pond.rx * sx, L.pond.ry * sy, 0, 0, 7); mctx.fill();
  const lab = (x, y, s) => { mctx.font = '700 9px "Be Vietnam Pro", sans-serif'; mctx.textAlign = 'center'; mctx.fillStyle = '#fff'; mctx.strokeStyle = 'rgba(0,0,0,.55)'; mctx.lineWidth = 2.5; mctx.strokeText(s, x * sx, y * sy); mctx.fillText(s, x * sx, y * sy); };
  const MK = L.market;
  mctx.fillStyle = '#d9c08a'; mctx.fillRect((MK.tug.x - MK.tug.w / 2) * sx, (MK.tug.y - MK.tug.h / 2) * sy, MK.tug.w * sx, MK.tug.h * sy);
  mctx.fillStyle = '#5f9fb0'; mctx.fillRect(0, L.river.y0 * sy, Wm, Hm - L.river.y0 * sy);
  mctx.fillStyle = '#9b6b3a'; mctx.fillRect((L.wharf.x - L.wharf.w / 2) * sx, (L.river.y0 - 40) * sy, L.wharf.w * sx, (L.wharf.y + L.wharf.h / 2 - L.river.y0 + 40) * sy);
  mctx.fillStyle = '#c49a64'; mctx.fillRect((L.samhoi.x - L.samhoi.w / 2) * sx, (L.samhoi.y - 15) * sy, L.samhoi.w * sx, 30 * sy);
  mctx.fillStyle = '#e0b072'; mctx.fillRect((MK.thayDo.x - 150) * sx, (MK.thayDo.y - 110) * sy, 300 * sx, 200 * sy);
  mctx.fillStyle = '#9b6b3a'; L.cauSeats.forEach(s => mctx.fillRect(s.x * sx - 2, s.y * sy - 2, 4, 4));   // ghế câu bên bờ sông
  mctx.fillStyle = '#9a5444'; mctx.fillRect(0, L.GATE_Y * sy, (L.gate.x - 75) * sx, 4); mctx.fillRect((L.gate.x + 75) * sx, L.GATE_Y * sy, (L.W - L.gate.x - 75) * sx, 4);
  mctx.fillStyle = '#4f7f3f'; mctx.beginPath(); mctx.arc(MK.banyan.x * sx, MK.banyan.y * sy, 10, 0, 7); mctx.fill();
  mctx.fillStyle = '#ffd56b'; [L.bell, MK.fortune, L.bowl].forEach(o => { mctx.beginPath(); mctx.arc(o.x * sx, o.y * sy, 3, 0, 7); mctx.fill(); });
  lab(L.hall.x + L.hall.w / 2, L.hall.y + L.hall.h / 2, 'Chánh điện'); lab(L.garden.x + L.garden.w / 2, L.garden.y + L.garden.h / 2, 'Vườn rau'); lab(L.pen.x + L.pen.w / 2, L.pen.y + L.pen.h - 60, 'Thú cưng');
  lab(L.bell.x, L.bell.y - 70, 'Gác chuông'); lab(MK.fortune.x, MK.fortune.y - 70, 'Xin quẻ'); lab(L.bowl.x, L.bowl.y + 110, 'Lư hương');
  lab(MK.banyan.x, MK.banyan.y - 50, 'Cây đa'); lab((MK.hat.x + MK.cloth.x) / 2, MK.hat.y - 70, 'Hàng rong'); lab(MK.food.x, MK.food.y - 70, 'Quán ăn'); lab(MK.barber.x + 40, MK.barber.y + 80, 'Cắt tóc');
  lab(MK.tug.x, MK.tug.y + 10, 'Kéo co'); lab(MK.thayDo.x, MK.thayDo.y + 20, 'Thầy đồ'); lab(MK.cau.x, MK.cau.y - 22, 'Câu brief'); lab(L.samhoi.x, L.samhoi.y - 40, 'Sám hối'); lab(L.wharf.x + 300, L.river.y0 + 120, 'Sông · phóng sinh');
  mctx.fillStyle = '#fff'; for (const p of S.players.values()) { mctx.beginPath(); mctx.arc(p.x * sx, p.y * sy, 2.2, 0, 7); mctx.fill(); }
  if (S.me) { mctx.fillStyle = '#ffcf5a'; mctx.strokeStyle = '#3a1d08'; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.arc(S.me.x * sx, S.me.y * sy, 4.5, 0, 7); mctx.fill(); mctx.stroke(); }
}

/* ---------------- UI ---------------- */
function toast(msg) { const el = document.createElement('div'); el.textContent = msg; $('#toast').appendChild(el); setTimeout(() => el.remove(), 3200); }
function ticker(msg) { const el = document.createElement('div'); el.className = 't'; el.textContent = msg; const tk = $('#ticker'); tk.appendChild(el); while (tk.children.length > 2) tk.firstChild.remove(); setTimeout(() => el.remove(), 4500); }
function renderRooms() {
  if (!S.room) return;
  const cur = S.rooms.find(r => r.id === S.room.id) || { online: 1, capacity: S.room.capacity };
  $('#roomName').textContent = S.room.name + (S.demo ? ' · Demo' : ''); $('#roomCount').textContent = cur.online; $('#roomCap').textContent = cur.capacity;
  $('#roomList').innerHTML = '<div class="muted" style="color:#d9c3a0;padding:4px 8px 8px">Các khuôn viên đang mở</div>' + S.rooms.map(r => `<div class="r ${r.id === S.room.id ? 'me' : ''}"><span>🛕 ${r.name}${r.id === S.room.id ? ' (bạn)' : ''}</span><b>${r.online}/${r.capacity}</b></div><div class="bar"><i style="width:${Math.min(100, r.online / r.capacity * 100)}%"></i></div>`).join('') + '<div class="muted" style="color:#a99377;padding:6px 8px 2px;font-size:11px">Khi một chùa đủ người, khuôn viên mới sẽ tự mở.</div>';
}
const WISHES = ['Khách duyệt bản đầu tiên', 'Không crash khi render', 'Deadline lùi 1 tuần', 'In ra đúng màu', 'Không bị “làm logo to hơn”', 'Lương về đúng hẹn'];
let pickedApp = null;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function buildAppGrid() {
  $('#appGrid').innerHTML = S.altar.map(a => `<button data-app="${esc(a.id)}"><span class="stripe" style="background:${esc(a.color)}"></span>${a.image ? `<img src="${esc(a.image)}" alt="">` : `<span class="ab">${esc(a.short || a.name.slice(0, 2))}</span>`}<span class="an">${esc(a.name)}</span></button>`).join('');
  $('#wishChips').innerHTML = WISHES.map(w => `<button>${w}</button>`).join('');
}
let incMode = 'app';
function openIncense(mode) {
  incMode = mode || 'app';
  $('#appGrid').classList.toggle('hidden', incMode === 'all');
  $('#incTitle').textContent = incMode === 'all' ? '🪔 Thắp hương chung' : '🪔 Thắp hương tổ nghiệp';
  $('#incSub').textContent = incMode === 'all' ? 'Nén hương ở lư hương giữa sân kính dâng tất cả chư vị Tổ Nghiệp. Muốn cầu riêng một vị, hãy vào chánh điện thắp ở bát hương trước bài vị.' : 'Chọn vị tổ bạn muốn cầu — nén hương sẽ cắm vào bát hương trước bài vị đó';
  pickedApp = pickedApp || (S.altar[0] && S.altar[0].id);
  document.querySelectorAll('#appGrid button').forEach(b => b.classList.toggle('sel', b.dataset.app === pickedApp));
  $('#incenseModal').classList.remove('hidden');
}
$('#appGrid').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pickedApp = b.dataset.app; document.querySelectorAll('#appGrid button').forEach(x => x.classList.toggle('sel', x === b)); sfx.pop(); });
$('#wishChips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) $('#wishInput').value = b.textContent; });
$('#lightBtn').onclick = () => { send({ t: 'incense', app: incMode === 'all' ? 'all' : pickedApp, wish: $('#wishInput').value }); $('#wishInput').value = ''; closeModals(); send({ t: 'emote', e: 'bow' }); };

function showDigResult(m) {
  const card = $('#resultCard');
  if (!m.ok && m.reason === 'limit') {
    card.innerHTML = `<div class="big">🌙</div><h2>Hôm nay bạn đã cuốc đủ rồi</h2><p class="muted">Mỗi ngày bạn có ${S.profile ? S.profile.digsPerDay : 3} lượt đào. Hãy quay lại vào ngày mai — trong lúc chờ, thắp nén hương hay thỉnh hồi chuông cũng là tích phước đấy.</p><button class="primary" data-close>Đã hiểu 🙏</button>`;
  } else if (m.poop) {
    sfx.fart(.7);
    card.innerHTML = `<div class="big">💩</div><h2>Ối! Đào phải… cức</h2><p class="muted">Không biết con gì “gửi” ở luống này. Lần này không có rau, còn ruồi thì bám theo bạn rồi đó 🪰. Ra <b>giếng làng</b> trong vườn rau rửa tay cho sạch nhé!</p>
      <button class="primary" id="goWell">Ra giếng rửa tay 🧼</button><button class="primary ghost" data-close>Kệ, đi tiếp 😅</button>`;
    setTimeout(() => { const b = $('#goWell'); if (b) b.onclick = () => { closeModals(); S.target = { x: L.well.x - 70, y: L.well.y + 40 }; }; }, 0);
  } else if (m.win) {
    sfx.win(); for (let i = 0; i < 40; i++) spark(S.me.x * K, 1.2, S.me.y * K, ['#ffd27a', '#ff8a5c', '#fff'][i % 3]);
    const a = m.award;
    card.innerHTML = `<div class="big">🎁</div><p class="eyebrow">Đào trúng quà rồi!</p><h2>${esc(a.title)}</h2><p class="muted">${esc(a.description || 'Dùng mã khi thanh toán tại hệ sinh thái PikLab.')}</p>
      <div class="code-box"><code>${esc(a.code)}</code><button id="copyCode">Sao chép</button></div>
      <p class="muted small">Mã đã được lưu trong 🎒 Túi đồ của bạn.</p>
      <a class="shop" href="${esc(a.link || S.shopUrl)}" target="_blank" rel="noopener">Dùng ngay tại PikLab →</a>
      <button class="primary" data-close>Tuyệt vời!</button>`;
    $('#copyCode').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(a.code); $('#copyCode').textContent = 'Đã chép ✓'; };
  } else {
    sfx.soft();
    card.innerHTML = `<div class="big">🥬</div><h2>Bạn nhận được 1 bó rau</h2><p class="muted">Lần này đất chưa giấu voucher, nhưng rau sạch thì có! Hãy mang sang <b>Vườn Thú Cưng</b> phía đông cho Mèo Mướp, Cún Vàng, Gà Ri hay đàn cá chép ăn để tích phước nhé.</p>
      <div class="stats3"><div><b>${S.profile.rau}</b>bó rau</div><div><b>${S.profile.phuoc}</b>điểm phước</div><div><b>${S.profile.digsLeft}</b>lượt đào còn lại</div></div>
      <button class="primary" data-close>Mang rau đi cho thú ăn →</button>`;
  }
  $('#resultModal').classList.remove('hidden');
}
function openBag() {
  const p = S.profile; if (!p) return;
  $('#bagBody').innerHTML = `<div class="stats3"><div><b>${p.phuoc}</b>điểm phước</div><div><b>${curStamina()}</b>sinh lực</div><div><b>${p.rau}</b>bó rau</div></div>
    <button class="primary ghost" id="wardrobeBtn">👘 Mở tủ đồ (thay nón, áo đã mua)</button>
    <button class="primary ghost" id="briefBookBtn">📒 Sổ sưu tầm brief</button>
    <label>Voucher đã nhận</label>` + (p.wins.length ? p.wins.slice().reverse().map(w => `<div class="bag-item"><div class="ic">🎟️</div><div style="flex:1"><b>${esc(w.title)}</b><code>${esc(w.code)}</code><br><a href="${esc(w.link || S.shopUrl)}" target="_blank" rel="noopener">Dùng tại PikLab →</a></div></div>`).join('') : '<p class="muted">Chưa có voucher nào. Ra vườn cuốc đất thử vận may nhé!</p>');
  $('#bagModal').classList.remove('hidden');
  $('#wardrobeBtn').onclick = () => { closeModals(); openShop('wardrobe'); };
  $('#briefBookBtn').onclick = () => { closeModals(); openBriefBook(); };
}
function closeModals() { if (S.mg) mgQuit(); S.xOpen = null; document.querySelectorAll('.modal-wrap:not(#intro)').forEach(m => m.classList.add('hidden')); }
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModals(); else if (e.target.classList.contains('modal-wrap') && e.target.id !== 'intro') closeModals(); });
$('#bagBtn').onclick = openBag;
$('#clockBtn').onclick = () => { previewIdx = (previewIdx + 1) % PREVIEW.length; applySky(); toast(previewIdx ? `Xem thử khung giờ ${['', 'bình minh', 'buổi sáng', 'hoàng hôn', 'buổi tối'][previewIdx]}` : 'Ánh sáng theo giờ Việt Nam thực tế'); };
function setGfx(k) {
  const needReload = GFX[k].aa !== G.aa;
  gfxKey = k; G = GFX[k]; sset('pk_gfx', k);
  R.setShadow(G.shadow, G.pcf); resize(); document.body.classList.toggle('noblur', !G.blur);
  $('#gfxBtn').textContent = G.icon + ' ' + G.name;
  toast(`Đồ hoạ: ${G.name}${needReload ? ' · khử răng cưa áp dụng hết sau khi tải lại trang' : ''}`);
}
$('#gfxBtn').textContent = G.icon + ' ' + G.name;
$('#gfxBtn').onclick = () => setGfx({ high: 'mid', mid: 'low', low: 'high' }[gfxKey]);
$('#roomBtn').onclick = () => $('#roomList').classList.toggle('hidden');
$('#actionBtn').onclick = doInteract;
const updSound = () => { $('#soundBtn').textContent = S.sound ? '🔔' : '🔕'; };
$('#soundBtn').onclick = () => { S.sound = !S.sound; sset('pk_sound', S.sound ? '1' : '0'); updSound(); if (S.sound) sfx.soft(); }; updSound();
document.querySelectorAll('.emote').forEach(b => b.onclick = () => send({ t: 'emote', e: b.dataset.e }));

/* ---------------- Bảng cài đặt DEMO ---------------- */
function shrinkImage(file, cb) {
  const fr = new FileReader();
  fr.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 192 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/png')); }; im.src = fr.result; };
  fr.readAsDataURL(file);
}
function openDemoPanel() {
  const cfg = S.net.local.config;
  $('#demoBody').innerHTML = `
    <label>Icon trên ban thờ (chọn ảnh PNG/SVG/JPG từ máy bạn)</label>
    <div class="icon-rows">${cfg.altar.map((a, i) => `<div class="icon-row"><span class="ic">${a.image ? `<img src="${esc(a.image)}">` : esc(a.short)}</span><b>${esc(a.name)}</b><label class="file">Chọn ảnh<input type="file" accept="image/*" data-i="${i}"></label>${a.image ? `<button class="mini" data-clear="${i}">Xoá</button>` : ''}</div>`).join('')}</div>
    <label>Tỉ lệ trúng voucher (demo)</label>
    ${cfg.vouchers.map((v, i) => `<div class="icon-row"><b style="flex:1">${esc(v.title)}</b><input type="number" min="0" max="100" step="0.5" value="${v.rate}" data-rate="${i}" style="width:80px"> %</div>`).join('')}
    <p class="muted small" style="text-align:left">Không trúng: ${(100 - cfg.vouchers.reduce((s, v) => s + (+v.rate || 0), 0)).toFixed(1)}% → nhận bó rau</p>
    <label>Thời tiết (bản thật: admin chọn trong trang quản trị)</label>
    <div class="icon-row"><select id="dWxCity">${RU.CITIES.map(c => `<option value="${c.id}" ${S.net.local.config.wx().city === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
    <select id="dWxMode"><option value="auto">Theo dự báo thật</option>${Object.entries(RU.WEATHER).map(([k, v]) => `<option value="${k}" ${S.net.local.config.wx().mode === 'manual' && S.net.local.config.wx().manual === k ? 'selected' : ''}>${v[0]} ${v[1]}</option>`).join('')}</select></div>
    <button class="primary ghost" id="resetDigs">Hồi lại lượt đào, chuông, quẻ hôm nay</button>
    <p class="muted small">Bản đầy đủ (chạy server) có trang quản trị /admin để tạo mã thật, đặt tỉ lệ và xem thống kê truy cập.</p>`;
  $('#demoModal').classList.remove('hidden');
}
$('#demoBtn').onclick = openDemoPanel;
$('#demoBody').addEventListener('change', e => {
  const cfg = S.net.local.config;
  if (e.target.dataset.i !== undefined && e.target.files[0]) shrinkImage(e.target.files[0], url => { cfg.altar[+e.target.dataset.i].image = url; cfg.save(); S.altar = cfg.altar; rebuildPlaques(); buildAppGrid(); openDemoPanel(); toast('Đã đặt icon lên ban thờ 🪔'); });
  if (e.target.id === 'dWxCity' || e.target.id === 'dWxMode') { const md = $('#dWxMode').value; S.net.local.config.setWx({ city: $('#dWxCity').value, mode: md === 'auto' ? 'auto' : 'manual', manual: md === 'auto' ? 'clear' : md }); S.wxPreview = null; }
  if (e.target.dataset.rate !== undefined) { cfg.vouchers[+e.target.dataset.rate].rate = Math.max(0, Math.min(100, +e.target.value || 0)); cfg.save(); openDemoPanel(); }
});
$('#demoBody').addEventListener('click', e => {
  const cfg = S.net.local.config;
  if (e.target.dataset.clear !== undefined) { cfg.altar[+e.target.dataset.clear].image = ''; cfg.save(); S.altar = cfg.altar; rebuildPlaques(); buildAppGrid(); openDemoPanel(); }
  if (e.target.id === 'resetDigs') cfg.reset();
});

/* ---------------- Màn hình vào (đăng ký / đăng nhập) ---------------- */
$('#colorPick').innerHTML = COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" class="${c === choice.color ? 'sel' : ''}"></button>`).join('');
$('#colorPick').onclick = e => { const b = e.target.closest('button'); if (!b) return; choice.color = b.dataset.c; document.querySelectorAll('#colorPick button').forEach(x => x.classList.toggle('sel', x === b)); };
$('#hairPick').onclick = e => { const b = e.target.closest('button'); if (!b) return; choice.hair = b.dataset.hair; document.querySelectorAll('#hairPick button').forEach(x => x.classList.toggle('sel', x === b)); };
document.querySelectorAll('#hairPick button').forEach(x => x.classList.toggle('sel', x.dataset.hair === choice.hair));
$('#hatPick').onclick = e => { const b = e.target.closest('button'); if (!b) return; choice.hat = b.dataset.h; document.querySelectorAll('#hatPick button').forEach(x => x.classList.toggle('sel', x === b)); };
document.querySelectorAll('#hatPick button').forEach(x => x.classList.toggle('sel', x.dataset.h === choice.hat));
let authTab = 'reg';
function setTab(t) {
  authTab = t; document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('#regOnly').classList.toggle('hidden', t !== 'reg'); $('#authErr').textContent = '';
  $('#pwInput').autocomplete = t === 'reg' ? 'new-password' : 'current-password';
  $('#enterBtn').textContent = t === 'reg' ? 'Tạo tài khoản & vào chùa 🙏' : 'Đăng nhập & vào chùa 🙏';
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
function showView(v) { ['vLoading', 'vBack', 'vAuth'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
async function initIntro() {
  if (DEMO_FORCED) S.demo = true;
  else {
    try { const i = await (await fetch('/api/public/info')).json(); FART.hasFile = !!i.fartFile; $('#templeTitle').textContent = i.templeName; $('#liveInfo').textContent = `🟢 ${i.online} người đang ở chùa · ${i.rooms.length} khuôn viên đang mở`; }
    catch (e) { S.demo = true; }
  }
  if (S.demo) $('#liveInfo').textContent = 'Bản demo offline · tài khoản lưu trên máy này · bạn đồng tu là bot mô phỏng';
  S.token = sget(tokenKey()) || '';
  if (S.token) {
    const r = await authCall('me', { token: S.token });
    if (r.account) { $('#backName').textContent = r.account.name; $('#backAv').style.background = r.account.color; return showView('vBack'); }
    sset(tokenKey(), ''); S.token = '';
  }
  setTab(sget('pk_has_account') ? 'login' : 'reg'); showView('vAuth');
}
async function submitAuth() {
  const btn = $('#enterBtn'); if (btn.disabled) return;
  const body = { email: $('#emailInput').value.trim(), password: $('#pwInput').value };
  if (authTab === 'reg') Object.assign(body, { name: $('#nameInput').value.trim(), color: choice.color, hat: choice.hat, hair: choice.hair });
  btn.disabled = true; $('#authErr').textContent = '';
  const r = await authCall(authTab === 'reg' ? 'register' : 'login', body);
  btn.disabled = false;
  if (!r.token) { $('#authErr').textContent = r.error || 'Có lỗi, vui lòng thử lại.'; return; }
  S.token = r.token; sset(tokenKey(), r.token); sset('pk_has_account', '1'); $('#pwInput').value = '';
  enterTemple();
}
function enterTemple() {
  S.authFailed = false;
  $('#intro').classList.add('hidden'); $('#hud').classList.remove('hidden'); $('#sayBar').classList.remove('hidden');
  ac(); sfx.bell(); loadFartFile(); ambStart();
  connect();
  setTimeout(() => $('#hint').style.opacity = 0, 10000);
}
function backToIntro(msg) {
  try { S.net && S.net.ws && S.net.ws.close(); } catch (e) {}
  S.me = null; S.players.clear(); welcomed = false;
  $('#hud').classList.add('hidden'); $('#intro').classList.remove('hidden'); $('#sayBar').classList.add('hidden');
  setTab('login'); showView('vAuth'); $('#authErr').textContent = msg || '';
}
$('#enterBtn').onclick = submitAuth;
$('#vAuth').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); submitAuth(); } });
$('#backEnter').onclick = enterTemple;
$('#backSwitch').onclick = async () => { await authCall('logout', { token: S.token }); sset(tokenKey(), ''); S.token = ''; setTab('login'); showView('vAuth'); };
$('#logoutBtn').onclick = async () => { await authCall('logout', { token: S.token }); sset(tokenKey(), ''); location.reload(); };
initIntro();

/* ---------------- Điều khiển ---------------- */
addEventListener('keydown', e => {
  if (S.inMatch && (e.code === 'KeyZ' || e.code === 'Space')) { e.preventDefault(); if (!e.repeat) pressTug(); return; }   // Ctrl/⌘+Z, Z hay Space đều được — tránh chênh lệch giữa Mac và Windows
  if (e.code === 'Escape' && e.target.tagName === 'INPUT' && e.target.id !== 'sayInput') { e.target.blur(); closeModals(); return; }
  if (e.target.tagName === 'INPUT') return;
  if (S.mg) {   // trong minigame: Space / Enter / E là nút bấm chính
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); if (e.repeat) return; if (S.mg === 'bell') bellPress(); else if (S.mg === 'cau') cauPress(true); else if (S.mgTap) S.mgTap(); }
    if (e.code === 'Escape') mgQuit();
    return;
  }
  S.keys[e.code] = true;
  if (e.code === 'Enter' && !document.querySelector('.modal-wrap:not(.hidden):not(#intro)')) { e.preventDefault(); S.keys = {}; $('#sayInput').focus(); return; }   // Enter: gõ khẩu nghiệp (vẫn chạm/click để đi được)
  if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); if (document.querySelector('.modal-wrap:not(.hidden):not(#intro)')) return; doInteract(); }
  if (e.code === 'Escape') closeModals();
  if (e.code === 'Equal' || e.code === 'NumpadAdd') S.dist = Math.max(8, S.dist - 1.5);
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') S.dist = Math.min(26, S.dist + 1.5);
});
addEventListener('keyup', e => { S.keys[e.code] = false; if (S.mg === 'cau' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) cauPress(false); });
addEventListener('blur', () => { S.keys = {}; });
const pointers = new Map(); let pinch0 = 0, dist0 = 15;
cv.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = S.dist; return; }
  if (!S.me) return; ac();
  const w = pick(e.clientX, e.clientY); if (!w) return;
  if (S.interact && Math.hypot(w.x - S.interact.x, w.y - S.interact.y) < 90) return doInteract();
  S.target = w; S.tapFx = { x: w.x, y: w.y, t: performance.now() };
});
cv.addEventListener('pointermove', e => { if (!pointers.has(e.pointerId)) return; pointers.set(e.pointerId, [e.clientX, e.clientY]); if (pointers.size === 2 && pinch0) { const [a, b] = [...pointers.values()]; S.dist = Math.max(8, Math.min(26, dist0 * pinch0 / Math.hypot(a[0] - b[0], a[1] - b[1]))); S.target = null; } });
const pup = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = 0; };
cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); S.dist = Math.max(8, Math.min(26, S.dist + e.deltaY * .01)); }, { passive: false });
mm.addEventListener('pointerdown', e => { const r = mm.getBoundingClientRect(); S.target = { x: (e.clientX - r.left) / r.width * L.W, y: (e.clientY - r.top) / r.height * L.H }; S.tapFx = { x: S.target.x, y: S.target.y, t: performance.now() }; });

/* ---------------- Vòng lặp ---------------- */
let last = performance.now();
let lastDraw = 0;
function frame(t) {
  requestAnimationFrame(frame);
  if (!R) return;
  // Giới hạn FPS: không cần vẽ 120 lần/giây trên màn hình 120Hz
  const busy = S.me && (S.me.moving || S.target || S.inMatch || S.busy);
  const fps = !S.me ? 15 : S.mg ? 8 : busy ? G.fps : G.idleFps;   // minigame 2D đang mở → cảnh nền chỉ vẽ 8 khung/giây
  if (t - lastDraw < 1000 / fps - 2) return;
  lastDraw = t;
  const rdt = Math.min(.5, (t - last) / 1000), dt = Math.min(.05, rdt); last = t;
  if (S.me) {
    moveMe(dt);
    for (const p of S.players.values()) {
      const k = Math.min(1, dt * 10), dx = p.tx - p.x, dy = p.ty - p.y;
      p.x += dx * k; p.y += dy * k; if (p.moving) { p.walk += dt; if (Math.hypot(dx, dy) > 1) p.yaw = turn(p.yaw, Math.atan2(dx, dy), dt * 10); }
    }
    const inHall = S.me.y < HL.y + HL.h + 70 && S.me.x > HL.x - 50 && S.me.x < HL.x + HL.w + 50;
    S.roofA += ((inHall ? 0 : 1) - S.roofA) * Math.min(1, rdt * 6);
    S.hallK += ((S.me.y < HL.y + HL.h + 20 && S.me.x > HL.x && S.me.x < HL.x + HL.w ? 1 : 0) - S.hallK) * Math.min(1, rdt * 3);
    S.gateA += ((S.me.y > L.GATE_Y - 300 && S.me.y < L.GATE_Y + 25 && Math.abs(S.me.x - L.gate.x) < 340 ? 0 : 1) - S.gateA) * Math.min(1, rdt * 6);
    if (!S.stT || t - S.stT > 2000) { S.stT = t; showStamina(); }
    updateTugHud();
    S.interact = findInteract(t);
    { const fs = L.market.fishSeller;   // Cô Ba rao hàng khi có người đi ngang sạp (9–16 giây một câu)
      if (Math.hypot(S.me.x - fs.x, S.me.y - fs.y - 70) < 450 && !S.says.has('coBa') && t > (S.coBaNext || 0)) { S.says.set('coBa', { text: coBaLine(), t: performance.now() }); S.coBaNext = t + 9000 + Math.random() * 7000; } }
    if (S.pendingFish) {   // tự đi: tới đầu bến rồi ra mép bến, tới nơi thì thả
      const pf = S.pendingFish;
      if (pf.leg === 1 && Math.hypot(S.me.x - L.wharf.x, S.me.y - (L.river.y0 - 60)) < 40) { pf.leg = 2; S.target = { x: L.release.x, y: L.release.y - 10 }; }
      else if (Math.hypot(S.me.x - L.release.x, S.me.y - L.release.y) < 45) { send({ t: 'fishRelease', kind: pf.kind, wish: pf.wish }); expectReply('thả cá'); S.pendingFish = null; S.target = null; }
      else if (!S.target) { S.pendingFish = null; toast('Chưa ra tới mép bến — đi ra bến rồi bấm thả cá nhé 🐟'); }
    }
    const btn = $('#actionBtn');
    if (S.interact && !S.inMatch) { btn.classList.remove('hidden'); btn.classList.toggle('busy', S.busy); $('#actionIcon').textContent = S.interact.icon; $('#actionText').textContent = S.busy ? (S.interact.kind === 'sweep' ? 'Đang quét lá…' : S.interact.kind === 'fortune' ? 'Đang xóc ống xăm…' : 'Đang cuốc đất…') : S.interact.text; }
    else btn.classList.add('hidden');
  } else { S.cam.x = L.altar.x * K + Math.sin(t / 6000) * 3; S.cam.z = 7.1 + Math.cos(t / 7000) * 1.5; }
  if (!S.skyT || t - S.skyT > 1000) { S.skyT = t; applySky(); showWeatherChip(); }
  updateCamera(S.me ? dt : 1);
  stepParticles(dt);
  if (!S.noRender) { R.render(frameItems(t), cam, cam.tgt, Math.max(7, S.dist * .8)); drawOverlay(t); }
  drawMinimap();
}
window.PK = S;
requestAnimationFrame(frame);
// ban thờ hiển thị ngay ở màn hình chào
if (R) { S.altar = (() => { try { const a = JSON.parse(sget('pk_demo_altar')); if (a && DEMO_FORCED) return a; } catch (e) {} return [['ps', 'Photoshop', 'Ps', '#31A8FF'], ['ai', 'Illustrator', 'Ai', '#FF9A00'], ['pr', 'Premiere Pro', 'Pr', '#9999FF'], ['ae', 'After Effects', 'Ae', '#9999FF'], ['bl', 'Blender', 'Bl', '#EA7600'], ['fg', 'Figma', 'Fg', '#A259FF'], ['cv', 'Canva', 'Cv', '#00C4CC'], ['cc', 'CapCut', 'Cc', '#EDEDED'], ['id', 'InDesign', 'Id', '#FF3366'], ['lr', 'Lightroom', 'Lr', '#31A8FF']].map(([id, name, short, color]) => ({ id, name, short, color, image: '' })); })(); rebuildPlaques(); }
})();
