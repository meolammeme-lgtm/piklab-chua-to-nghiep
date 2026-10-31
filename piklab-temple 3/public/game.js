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
const COLORS = ['#7a5a43', '#6f7d8c', '#c9902e', '#efe7d6', '#a8382c', '#4f7a5a', '#3b4f7a', '#5b4566'];
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
  sound: sget('pk_sound') !== '0', lastSent: 0, sentState: '', bellRing: -1e9, digAnim: 0, roofA: 1, gateA: 1, hallK: 0
};
let choice = { color: sget('pk_color') || COLORS[0], hat: sget('pk_hat') || 'none', name: sget('pk_name') || '' };

/* ---------------- Renderer & cảnh ---------------- */
let R = null, scene = null, dyn = null;
try { R = window.ENGINE.createRenderer(cv); } catch (e) { console.error(e); }
if (!R) { document.body.insertAdjacentHTML('beforeend', '<div class="nogl">Trình duyệt chưa hỗ trợ WebGL2. Hãy mở bằng Chrome, Safari 15+ hoặc Firefox mới.</div>'); }
else { scene = W3.build(R, L); dyn = W3.dynamicMeshes(R); }

// bài vị
const plaqueBack = R && R.mesh(new Geo().add(P.rbox(.4, .68, .06, .04, 2), '#5e180f', T(0, 0, -.01)).add(P.rbox(.46, .08, .2, .03, 1), '#e8b54a', T(0, -.36, 0)));
const plaqueQuad = R && R.mesh(new Geo().add(P.quad(.36, .63), '#ffffff', T(0, 0, .025)));
let plaques = [];
const imgCache = {};
function rebuildPlaques() {
  if (!R) return;
  const n = S.altar.length || 1, span = 4.0;
  plaques = S.altar.map((a, i) => {
    const x = 10 - span / 2 + (i + .5) * span / n, m = T(x, 1.98, 1.5, 0, 1, 1, 1, -.16);
    const pl = { m, tex: R.texture(W3.plaqueCanvas(a, null)), app: a };
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
  S.night = Math.max(0, Math.min(1, (e.glow - .3) / 1.4));
  const bg = `radial-gradient(120% 90% at 50% 35%, ${rgb(lerp3(hex2(A[7]), hex2(B[7]), k))} 0%, ${rgb(lerp3(hex2(A[8]), hex2(B[8]), k))} 100%)`;
  if (bg !== lastBg) { document.body.style.background = bg; lastBg = bg; }
  const hh = Math.floor(h), mm2 = Math.floor((h - hh) * 60);
  const icon = h < 5 || h >= 19.5 ? '🌙' : h < 7 ? '🌅' : h < 17 ? '☀️' : h < 18.8 ? '🌇' : '🌙';
  const label = `${icon} ${String(hh).padStart(2, '0')}:${String(mm2).padStart(2, '0')}${previewIdx ? ' (xem thử)' : ''}`;
  const el = $('#clockBtn'); if (el && el.textContent !== label) el.textContent = label;
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
const sfx = {
  bell() { [[110, 6, .3], [220.6, 4.5, .15], [331, 3, .08], [440.9, 2.4, .05], [598, 1.6, .035]].forEach(([f, d, v]) => tone(f, d, 'sine', v)); },
  mo() { tone(820, .12, 'triangle', .22); tone(410, .2, 'sine', .16); },
  dig() { tone(90, .18, 'triangle', .28); tone(60, .25, 'sine', .22, .05); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .6, 'triangle', .14, i * .09)); },
  soft() { tone(392, .5, 'sine', .1); tone(523, .7, 'sine', .09, .12); },
  pop() { tone(660, .08, 'square', .04); }
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

function onMsg(m) {
  switch (m.t) {
    case 'welcome': {
      const keep = welcomed && S.me ? { x: S.me.x, y: S.me.y } : null; welcomed = true;
      S.me = Object.assign(m.you, keep || {}); S.me.walk = 0; S.me.yaw = Math.PI;
      S.players.clear(); m.players.forEach(addPlayer);
      S.plots = m.plots; S.incense = m.incense; S.altar = m.altar; S.room = m.room; S.rooms = m.rooms;
      S.shopUrl = m.shopUrl; setProfile(m.profile); S.serverOffset = m.serverTime - Date.now(); S.regrowMs = (m.regrowSec || 120) * 1000;
      document.title = `${m.room.name} · ${m.templeName}`;
      renderRooms(); buildAppGrid(); rebuildPlaques();
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
      if (m.stick.wish) S.floaters.push({ x: L.bowl.x * K, y: 1.9, z: L.bowl.y * K, text: `“${m.stick.wish}”`, sub: `— ${m.stick.by} cầu Tổ ${m.stick.appName}`, t: performance.now(), life: 9000 });
      for (let i = 0; i < 18; i++) spark(L.bowl.x * K, 1.2, L.bowl.y * K, '#ffd27a');
      sfx.mo();
      break;
    }
    case 'incenseAll': S.incense = m.list; break;
    case 'plot': {
      S.plots[m.plot.id] = m.plot;
      if (m.plot.state === 'dug') { const d = L.plots[m.plot.id]; for (let i = 0; i < 24; i++) dirt(d.x * K, d.y * K); if (m.by !== 'me' && (!S.me || m.by !== S.me.id)) sfx.dig(); }
      break;
    }
    case 'bell': S.bellRing = performance.now(); sfx.bell(); ticker(`🔔 ${m.by} vừa thỉnh chuông`); break;
    case 'fed': {
      S.animalFx.push({ id: m.animal, t: performance.now() });
      if (S.me && m.by !== S.me.id) ticker(`🥬 ${m.name} vừa cho ${L.animals.find(a => a.id === m.animal).name} ăn`);
      break;
    }
    case 'feed': ticker(m.msg); break;
    case 'authError': S.authFailed = true; sset(tokenKey(), ''); S.token = ''; backToIntro(m.msg); break;
    case 'kicked': S.kicked = true; $('#conn').classList.add('hidden'); $('#resultCard').innerHTML = m.banned ? `<div class="big">🔒</div><h2>Tài khoản đã bị khoá</h2><p class="muted">${esc(m.msg)}</p>` : `<div class="big">🙏</div><h2>Bạn đã vào chùa ở nơi khác</h2><p class="muted">${esc(m.msg)} Mỗi tài khoản chỉ ở một nơi cùng lúc để tránh spam lượt đào.</p><button class="primary" onclick="location.reload()">Vào lại tại đây</button>`; if (m.banned) sset(tokenKey(), ''); $('#resultModal').classList.remove('hidden'); break;
    case 'toast': toast(m.msg); S.busy = false; break;
    case 'profile': setProfile(m.profile); if (m.msg) toast(m.msg); S.busy = false; break;
    case 'digResult': S.busy = false; setProfile(m.profile); showDigResult(m); break;
  }
}
function addPlayer(p) { p.tx = p.x; p.ty = p.y; p.walk = 0; p.yaw = Math.PI; S.players.set(p.id, p); }
function setProfile(pr) { S.profile = pr; $('#phuoc').textContent = pr.phuoc; $('#rau').textContent = pr.rau; $('#digs').textContent = `${pr.digsLeft}/${pr.digsPerDay}`; }

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
  if (Math.random() < .25) {
    const t = L.trees.filter(t => t.kind === 2)[Math.random() * 5 | 0] || L.trees[0];
    S.particles.push({ x: t.x * K + (Math.random() - .5) * 1.4, y: 2 + Math.random() * .5, z: t.y * K + (Math.random() - .5) * 1, vx: 0, vy: -.35, vz: .1, life: 9, age: 0, kind: 'petal', r: 3.5, seed: Math.random() * 7 });
  }
}

/* ---------------- Camera ---------------- */
const cam = { vp: null, eye: [0, 0, 0], f: [0, 0, -1], r: [1, 0, 0], u: [0, 1, 0], fov: 30 * Math.PI / 180, asp: 1 };
let dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
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
  S.cam.x = Math.max(3, Math.min(17, S.cam.x)); S.cam.z = Math.max(1.6, Math.min(13, S.cam.z));
  const pitch = .8 - S.hallK * .12, tgt = [S.cam.x, .3 + S.hallK * .9, S.cam.z], dist = S.dist * (1 - S.hallK * .3);
  cam.eye = [tgt[0], tgt[1] + Math.sin(pitch) * dist, tgt[2] + Math.cos(pitch) * dist];
  cam.vp = M4.mul(M4.persp(cam.fov, cam.asp, .5, 120), M4.lookAt(cam.eye, tgt, [0, 1, 0]));
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
const groundH = (x, y) => (x > 726 && x < 1274 && y > 250 && y < 500) ? .14 : (Math.abs(x - 1000) < 320 && y >= 500 && y < 525 ? .07 : 0);
function moveMe(dt) {
  const me = S.me; let dx = 0, dy = 0;
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
  if (d(L.altar) < L.altar.radius && me.y < 500) return { kind: 'incense', icon: '🪔', text: 'Thắp hương tổ nghiệp', x: 1000, y: 200, h: 1.9 };
  if (d(L.bowl) < L.bowl.radius) return { kind: 'incense', icon: '🪔', text: 'Thắp hương', x: L.bowl.x, y: L.bowl.y, h: 1.7 };
  if (d(L.bell) < L.bell.radius) return { kind: 'bell', icon: '🔔', text: 'Thỉnh chuông', x: L.bell.x, y: L.bell.y, h: 4.4 };
  let best = null, bd = 1e9;
  L.plots.forEach(p => { const dd = d(p); if (dd < L.plotRadius && dd < bd) { bd = dd; best = p; } });
  if (best) {
    const st = S.plots[best.id];
    if (st && st.state === 'ripe') return { kind: 'dig', plot: best.id, icon: '⛏️', text: S.profile && S.profile.digsLeft > 0 ? `Cuốc đất (còn ${S.profile.digsLeft} lượt)` : 'Hết lượt đào hôm nay', x: best.x, y: best.y, h: .8 };
    return { kind: 'wait', icon: '🌱', text: 'Rau đang mọc lại…', x: best.x, y: best.y, h: .8 };
  }
  for (const a of L.animals) {
    const p = a.id === 'fish' ? { x: a.x, y: a.y } : animalPos(a, t), r = a.id === 'fish' ? L.fishRadius : L.animalRadius;
    if (Math.hypot(me.x - p.x, me.y - p.y) < r) return { kind: 'feed', animal: a.id, ax: p.x, ay: p.y, icon: '🥬', text: S.profile && S.profile.rau > 0 ? `Cho ${a.name} ăn rau` : `Cần rau để cho ${a.name} ăn`, x: p.x, y: p.y, h: a.id === 'buffalo' ? 1.4 : 1.0 };
  }
  return null;
}
function doInteract() {
  const it = S.interact; if (!it || S.busy) return;
  ac();
  if (it.kind === 'incense') openIncense();
  else if (it.kind === 'bell') send({ t: 'bell' });
  else if (it.kind === 'dig') {
    if (S.profile && S.profile.digsLeft <= 0) return showDigResult({ ok: false, reason: 'limit' });
    S.busy = true; S.digAnim = performance.now(); sfx.dig(); setTimeout(sfx.dig, 300); setTimeout(sfx.dig, 600);
    const d = L.plots[it.plot]; S.me.yaw = Math.atan2(d.x - S.me.x, d.y - S.me.y);
    let n = 0; const iv = setInterval(() => { for (let i = 0; i < 5; i++) dirt(d.x * K, d.y * K); if (++n > 6) clearInterval(iv); }, 120);
    setTimeout(() => send({ t: 'dig', plot: it.plot }), 900);
    setTimeout(() => { S.busy = false; }, 6000);
  } else if (it.kind === 'feed') {
    if (!S.profile || S.profile.rau <= 0) return toast('Bạn chưa có bó rau nào — ra Vườn Farm Phước Đức cuốc đất nhé 🥬');
    send({ t: 'feed', animal: it.animal, ax: it.ax, ay: it.ay });
  } else if (it.kind === 'wait') toast('Luống này vừa được đào, đợi rau mọc lại hoặc tìm luống khác nhé 🌱');
}

/* ---------------- Dựng danh sách vẽ mỗi khung ---------------- */
function avatarItems(items, p, t, isMe) {
  const am = W3.avatarMeshes(R, p.color, p.hat), x = p.x * K, z = p.y * K, h = groundH(p.x, p.y);
  const em = S.emotes.get(p.id), age = em ? (t - em.t) / 1000 : 9;
  const bow = em && em.e === 'bow' && age < 1.6 ? Math.sin(Math.min(1, age / 1.6) * Math.PI) * .55 : 0;
  const zen = em && em.e === 'zen' && age < 3.2, wave = em && em.e === 'wave' && age < 1.5;
  const digging = isMe && S.digAnim && t - S.digAnim < 900;
  const bob = p.moving ? Math.abs(Math.sin(p.walk * 11)) * .06 : Math.sin(t / 500 + p.x) * .008;
  const tilt = bow + (digging ? Math.abs(Math.sin((t - S.digAnim) / 900 * Math.PI * 3)) * .35 : 0) + (p.moving ? .06 : 0);
  const yaw = p.yaw, sy = Math.sin(yaw), cyw = Math.cos(yaw), y0 = h + bob;
  if (zen) {
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
    if (digging) { const a = Math.sin((t - S.digAnim) / 900 * Math.PI * 3); items.push({ mesh: hoe, m: T(x + sy * .35, h + .35, z + cyw * .35, yaw, 1, 1, 1, -.4 + a * .9) }); }
  }
  if (isMe) items.push({ mesh: dyn.ring, m: T(x, h + .005, z, t / 900), em: .6, noShadow: true });
}
const hoe = R && R.mesh(new Geo().add(P.cyl(.025, .025, .7, 6), '#8a5a33', T(0, 0, 0)).add(P.rbox(.2, .05, .12, .02, 1), '#a7adb3', T(0, .7, .05)));

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
  const sticks = S.incense.slice(-16);
  const addSticks = (bx, by, bz, rad, len, n) => sticks.slice(-n).forEach((s, i) => {
    const a = s.slot * 2.39, rr = rad * (.25 + (s.slot % 7) / 9), age = Math.max(0, (now - s.t) / 180000), l = len * (1 - age * .55);
    const lx = Math.cos(a) * .1, lz = Math.sin(a) * .1, x = bx + Math.cos(a) * rr, z = bz + Math.sin(a) * rr;
    items.push({ mesh: dyn.stick, m: T(x, by, z, 0, 1, l, 1, lz, -lx), noShadow: true });
    const tip = [x + Math.sin(lx) * l, by + Math.cos(lz) * Math.cos(lx) * l, z + Math.sin(lz) * Math.cos(lx) * l], ty = tip[1];
    items.push({ mesh: dyn.tip, m: T(tip[0], ty, tip[2]), em: 1.4 + Math.sin(t / 150 + i) * .4, noShadow: true });
    if (Math.random() < .07) S.particles.push({ x: tip[0], y: ty, z: tip[2], vx: (Math.random() - .5) * .1, vy: .35 + Math.random() * .2, vz: 0, life: 3.4, age: 0, kind: 'smoke', r: 2.5 });
  });
  addSticks(L.bowl.x * K, .86, L.bowl.y * K - .05, .45, .62, 16);
  addSticks(10, 1.31, 2.0, .14, .32, 7);
  // chuông
  const ring = (performance.now() - S.bellRing) / 1000, swing = ring < 4 ? Math.sin(ring * 8) * .3 * (1 - ring / 4) : 0;
  items.push({ mesh: dyn.bell, m: T(L.bell.x * K, 2.02, L.bell.y * K, 0, 1, 1, 1, swing) });
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
    for (const l of L.lanterns) glowAt(l.x * K + (l.x < 1000 ? .36 : -.36), 1.2, l.y * K, 90, .38);
    glowAt(8.05, 1.6, 2.05, 60, .4); glowAt(11.95, 1.6, 2.05, 60, .4); glowAt(L.bowl.x * K, 1.1, L.bowl.y * K, 80, .3);
    for (let i = 0; i < 26; i++) { const fx = 2 + (i * 7.31 % 16) + Math.sin(t / 2100 + i) * .6, fz = 2.5 + (i * 3.77 % 10.5) + Math.cos(t / 1800 + i * 2) * .5, f = .5 + .5 * Math.sin(t / 340 + i * 5); glowAt(fx, .6 + Math.sin(t / 900 + i) * .3, fz, 10, .9 * f); }
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

/* ---------------- Minimap ---------------- */
function drawMinimap() {
  const Wm = mm.width, Hm = mm.height, sx = Wm / L.W, sy = Hm / L.H;
  mctx.clearRect(0, 0, Wm, Hm);
  mctx.fillStyle = '#7dbb57'; mctx.fillRect(0, 0, Wm, Hm);
  mctx.fillStyle = '#e8a073'; [[800, 490, 400, 950], [760, 520, 480, 270], [360, 540, 400, 64], [298, 360, 64, 380], [590, 880, 210, 64], [1200, 880, 200, 64]].forEach(([x, y, w, h]) => mctx.fillRect(x * sx, y * sy, w * sx, h * sy));
  mctx.fillStyle = '#b8382a'; mctx.fillRect(700 * sx, 110 * sy, 600 * sx, 380 * sy);
  mctx.fillStyle = '#8a5a35'; mctx.fillRect(L.garden.x * sx, L.garden.y * sy, L.garden.w * sx, L.garden.h * sy);
  mctx.fillStyle = '#57b8cf'; mctx.beginPath(); mctx.ellipse(L.pond.x * sx, L.pond.y * sy, L.pond.rx * sx, L.pond.ry * sy, 0, 0, 7); mctx.fill();
  const lab = (x, y, s) => { mctx.font = '700 9px "Be Vietnam Pro", sans-serif'; mctx.textAlign = 'center'; mctx.fillStyle = '#fff'; mctx.strokeStyle = 'rgba(0,0,0,.55)'; mctx.lineWidth = 2.5; mctx.strokeText(s, x * sx, y * sy); mctx.fillText(s, x * sx, y * sy); };
  lab(1000, 330, 'Chánh điện'); lab(365, 950, 'Vườn rau'); lab(1660, 1040, 'Thú cưng'); lab(330, 440, 'Gác chuông');
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
function openIncense() {
  pickedApp = pickedApp || (S.altar[0] && S.altar[0].id);
  document.querySelectorAll('#appGrid button').forEach(b => b.classList.toggle('sel', b.dataset.app === pickedApp));
  $('#incenseModal').classList.remove('hidden');
}
$('#appGrid').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pickedApp = b.dataset.app; document.querySelectorAll('#appGrid button').forEach(x => x.classList.toggle('sel', x === b)); sfx.pop(); });
$('#wishChips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) $('#wishInput').value = b.textContent; });
$('#lightBtn').onclick = () => { send({ t: 'incense', app: pickedApp, wish: $('#wishInput').value }); $('#wishInput').value = ''; closeModals(); send({ t: 'emote', e: 'bow' }); };

function showDigResult(m) {
  const card = $('#resultCard');
  if (!m.ok && m.reason === 'limit') {
    card.innerHTML = `<div class="big">🌙</div><h2>Hôm nay bạn đã cuốc đủ rồi</h2><p class="muted">Mỗi ngày bạn có ${S.profile ? S.profile.digsPerDay : 3} lượt đào. Hãy quay lại vào ngày mai — trong lúc chờ, thắp nén hương hay thỉnh hồi chuông cũng là tích phước đấy.</p><button class="primary" data-close>Đã hiểu 🙏</button>`;
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
  $('#bagBody').innerHTML = `<div class="stats3"><div><b>${p.phuoc}</b>điểm phước</div><div><b>${p.rau}</b>bó rau</div><div><b>${p.digsLeft}/${p.digsPerDay}</b>lượt đào</div></div>
    <label>Voucher đã nhận</label>` + (p.wins.length ? p.wins.slice().reverse().map(w => `<div class="bag-item"><div class="ic">🎟️</div><div style="flex:1"><b>${esc(w.title)}</b><code>${esc(w.code)}</code><br><a href="${esc(w.link || S.shopUrl)}" target="_blank" rel="noopener">Dùng tại PikLab →</a></div></div>`).join('') : '<p class="muted">Chưa có voucher nào. Ra vườn cuốc đất thử vận may nhé!</p>');
  $('#bagModal').classList.remove('hidden');
}
function closeModals() { document.querySelectorAll('.modal-wrap:not(#intro)').forEach(m => m.classList.add('hidden')); }
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModals(); else if (e.target.classList.contains('modal-wrap') && e.target.id !== 'intro') closeModals(); });
$('#bagBtn').onclick = openBag;
$('#clockBtn').onclick = () => { previewIdx = (previewIdx + 1) % PREVIEW.length; applySky(); toast(previewIdx ? `Xem thử khung giờ ${['', 'bình minh', 'buổi sáng', 'hoàng hôn', 'buổi tối'][previewIdx]}` : 'Ánh sáng theo giờ Việt Nam thực tế'); };
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
    <button class="primary ghost" id="resetDigs">Hồi lại lượt đào hôm nay</button>
    <p class="muted small">Bản đầy đủ (chạy server) có trang quản trị /admin để tạo mã thật, đặt tỉ lệ và xem thống kê truy cập.</p>`;
  $('#demoModal').classList.remove('hidden');
}
$('#demoBtn').onclick = openDemoPanel;
$('#demoBody').addEventListener('change', e => {
  const cfg = S.net.local.config;
  if (e.target.dataset.i !== undefined && e.target.files[0]) shrinkImage(e.target.files[0], url => { cfg.altar[+e.target.dataset.i].image = url; cfg.save(); S.altar = cfg.altar; rebuildPlaques(); buildAppGrid(); openDemoPanel(); toast('Đã đặt icon lên ban thờ 🪔'); });
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
    try { const i = await (await fetch('/api/public/info')).json(); $('#templeTitle').textContent = i.templeName; $('#liveInfo').textContent = `🟢 ${i.online} người đang ở chùa · ${i.rooms.length} khuôn viên đang mở`; }
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
  if (authTab === 'reg') Object.assign(body, { name: $('#nameInput').value.trim(), color: choice.color, hat: choice.hat });
  btn.disabled = true; $('#authErr').textContent = '';
  const r = await authCall(authTab === 'reg' ? 'register' : 'login', body);
  btn.disabled = false;
  if (!r.token) { $('#authErr').textContent = r.error || 'Có lỗi, vui lòng thử lại.'; return; }
  S.token = r.token; sset(tokenKey(), r.token); sset('pk_has_account', '1'); $('#pwInput').value = '';
  enterTemple();
}
function enterTemple() {
  S.authFailed = false;
  $('#intro').classList.add('hidden'); $('#hud').classList.remove('hidden');
  ac(); sfx.bell();
  connect();
  setTimeout(() => $('#hint').style.opacity = 0, 10000);
}
function backToIntro(msg) {
  try { S.net && S.net.ws && S.net.ws.close(); } catch (e) {}
  S.me = null; S.players.clear(); welcomed = false;
  $('#hud').classList.add('hidden'); $('#intro').classList.remove('hidden');
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
  if (e.target.tagName === 'INPUT') return;
  S.keys[e.code] = true;
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (document.querySelector('.modal-wrap:not(.hidden):not(#intro)')) return; doInteract(); }
  if (e.code === 'Escape') closeModals();
  if (e.code === 'Equal' || e.code === 'NumpadAdd') S.dist = Math.max(8, S.dist - 1.5);
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') S.dist = Math.min(26, S.dist + 1.5);
});
addEventListener('keyup', e => { S.keys[e.code] = false; });
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
function frame(t) {
  requestAnimationFrame(frame);
  if (!R) return;
  const rdt = Math.min(.5, (t - last) / 1000), dt = Math.min(.05, rdt); last = t;
  if (S.me) {
    moveMe(dt);
    for (const p of S.players.values()) {
      const k = Math.min(1, dt * 10), dx = p.tx - p.x, dy = p.ty - p.y;
      p.x += dx * k; p.y += dy * k; if (p.moving) { p.walk += dt; if (Math.hypot(dx, dy) > 1) p.yaw = turn(p.yaw, Math.atan2(dx, dy), dt * 10); }
    }
    const inHall = S.me.y < 560 && S.me.x > 650 && S.me.x < 1350;
    S.roofA += ((inHall ? 0 : 1) - S.roofA) * Math.min(1, rdt * 6);
    S.hallK += ((S.me.y < 520 && S.me.x > 700 && S.me.x < 1300 ? 1 : 0) - S.hallK) * Math.min(1, rdt * 3);
    S.gateA += ((S.me.y > 1150 && Math.abs(S.me.x - 1000) < 340 ? 0 : 1) - S.gateA) * Math.min(1, rdt * 6);
    S.interact = findInteract(t);
    const btn = $('#actionBtn');
    if (S.interact) { btn.classList.remove('hidden'); btn.classList.toggle('busy', S.busy); $('#actionIcon').textContent = S.interact.icon; $('#actionText').textContent = S.busy ? 'Đang cuốc đất…' : S.interact.text; }
    else btn.classList.add('hidden');
  } else { S.cam.x = 10 + Math.sin(t / 6000) * 3; S.cam.z = 6.5 + Math.cos(t / 7000) * 1.5; }
  if (!S.skyT || t - S.skyT > 1000) { S.skyT = t; applySky(); }
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
