/* Chùa Tổ Nghiệp Designer — client game (canvas 2D, không framework) */
(() => {
'use strict';
const L = window.LAYOUT;
const $ = s => document.querySelector(s);
const cv = $('#game'), ctx = cv.getContext('2d');
const mm = $('#minimap'), mctx = mm.getContext('2d');

/* ---------------- Trạng thái ---------------- */
const COLORS = ['#c0392b', '#d35400', '#8e44ad', '#2c7a7b', '#b7791f', '#2f855a', '#2b6cb0', '#6b4f3a'];
const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
const sget = k => { try { return store && store.getItem(k); } catch (e) { return null; } };
const sset = (k, v) => { try { store && store.setItem(k, v); } catch (e) {} };
let pid = sget('pk_pid');
if (!pid) { pid = (crypto.randomUUID ? crypto.randomUUID() : 'p' + Math.random().toString(36).slice(2) + Date.now().toString(36)); sset('pk_pid', pid); }

const S = {
  ws: null, connected: false, me: null, players: new Map(), plots: [], incense: [], altar: [],
  room: null, rooms: [], profile: null, shopUrl: '#', serverOffset: 0,
  keys: {}, target: null, cam: { x: L.spawn.x, y: L.spawn.y }, zoom: 1,
  particles: [], floaters: [], emotes: new Map(), animalFx: [], interact: null, busy: false,
  sound: sget('pk_sound') !== '0', lastSent: 0, sentState: '', bellRing: 0, digAnim: 0
};
let choice = { color: sget('pk_color') || COLORS[0], hat: sget('pk_hat') || 'none', name: sget('pk_name') || '' };

/* ---------------- Âm thanh (WebAudio tổng hợp) ---------------- */
let AC = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
function tone(freq, dur, type = 'sine', vol = .2, delay = 0) {
  if (!S.sound || !ac()) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + .05);
}
const sfx = {
  bell() { [[110, 6, .32], [220.6, 4.5, .16], [331, 3, .08], [440.9, 2.4, .06], [598, 1.6, .04]].forEach(([f, d, v]) => tone(f, d, 'sine', v)); },
  mo() { tone(820, .12, 'triangle', .25); tone(410, .2, 'sine', .18); },
  dig() { tone(90, .18, 'triangle', .3); tone(60, .25, 'sine', .25, .05); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .6, 'triangle', .15, i * .09)); },
  soft() { tone(392, .5, 'sine', .12); tone(523, .7, 'sine', .1, .12); },
  pop() { tone(660, .08, 'square', .05); }
};

/* ---------------- Kết nối ---------------- */
function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  S.ws = ws;
  ws.onopen = () => { S.connected = true; $('#conn').classList.add('hidden'); ws.send(JSON.stringify({ t: 'hello', pid, name: choice.name, color: choice.color, hat: choice.hat })); };
  ws.onmessage = e => onMsg(JSON.parse(e.data));
  ws.onclose = () => { S.connected = false; if (S.me) { $('#conn').classList.remove('hidden'); setTimeout(connect, 2000); } };
}
const send = o => S.ws && S.ws.readyState === 1 && S.ws.send(JSON.stringify(o));

function onMsg(m) {
  switch (m.t) {
    case 'welcome': {
      const keep = S.me && S.me.x ? { x: S.me.x, y: S.me.y } : null;
      S.me = Object.assign(m.you, keep || {}); S.me.walk = 0;
      S.players.clear(); m.players.forEach(addPlayer);
      S.plots = m.plots; S.incense = m.incense; S.altar = m.altar; S.room = m.room; S.rooms = m.rooms;
      S.shopUrl = m.shopUrl; setProfile(m.profile); S.serverOffset = m.serverTime - Date.now(); S.regrowMs = m.regrowSec * 1000;
      S.cam.x = S.me.x; S.cam.y = S.me.y;
      document.title = `${m.room.name} · ${m.templeName}`;
      renderRooms(); buildAppGrid(); loadAltarImages();
      if (m.room.num > 1 && !keep) ticker(`Chùa 1 đã đông đủ — bạn được mời sang khuôn viên ${m.room.name} 🛕`);
      break;
    }
    case 'join': addPlayer(m.p); ticker(`${m.p.name} vừa bước vào chùa`); break;
    case 'leave': S.players.delete(m.id); break;
    case 's': for (const [id, x, y, dir, mv] of m.p) { const p = S.players.get(id); if (p) { p.tx = x; p.ty = y; p.dir = dir; p.moving = !!mv; } } break;
    case 'rooms': S.rooms = m.rooms; renderRooms(); break;
    case 'emote': S.emotes.set(m.id, { e: m.e, t: performance.now() }); break;
    case 'incense': {
      S.incense.push(m.stick);
      const who = m.by === S.me.id ? S.me : S.players.get(m.by);
      if (who) S.emotes.set(m.by, { e: 'bow', t: performance.now() });
      if (m.stick.wish) S.floaters.push({ x: L.bowl.x + (Math.random() * 60 - 30), y: L.bowl.y - 70, text: `“${m.stick.wish}”`, sub: `— ${m.stick.by} cầu Tổ ${m.stick.appName}`, t: performance.now(), life: 9000 });
      for (let i = 0; i < 16; i++) spark(L.bowl.x, L.bowl.y - 30, '#ffd27a');
      sfx.mo();
      break;
    }
    case 'incenseAll': S.incense = m.list; break;
    case 'plot': {
      S.plots[m.plot.id] = m.plot;
      if (m.plot.state === 'dug') { const d = L.plots[m.plot.id]; for (let i = 0; i < 22; i++) dirt(d.x, d.y); if (m.by !== S.me.id) sfx.dig(); }
      break;
    }
    case 'bell': S.bellRing = performance.now(); sfx.bell(); ticker(`🔔 ${m.by} vừa thỉnh chuông`); break;
    case 'fed': {
      S.animalFx.push({ id: m.animal, t: performance.now() });
      if (m.by !== S.me.id) ticker(`🥬 ${m.name} vừa cho ${L.animals.find(a => a.id === m.animal).name} ăn`);
      break;
    }
    case 'feed': ticker(m.msg); break;
    case 'toast': toast(m.msg); S.busy = false; break;
    case 'profile': setProfile(m.profile); if (m.msg) toast(m.msg); S.busy = false; break;
    case 'digResult': S.busy = false; setProfile(m.profile); showDigResult(m); break;
  }
}
function addPlayer(p) { p.tx = p.x; p.ty = p.y; p.walk = 0; S.players.set(p.id, p); }
function setProfile(pr) {
  S.profile = pr;
  $('#phuoc').textContent = pr.phuoc; $('#rau').textContent = pr.rau; $('#digs').textContent = `${pr.digsLeft}/${pr.digsPerDay}`;
}

/* ---------------- Nền tĩnh (vẽ 1 lần) ---------------- */
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const bg = document.createElement('canvas'); bg.width = L.W; bg.height = L.H;
function buildBackground() {
  const g = bg.getContext('2d'), R = rng(42);
  // cỏ
  g.fillStyle = '#56733a'; g.fillRect(0, 0, L.W, L.H);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = ['#4d6a33', '#5f7f3f', '#6a8a45', '#48612f'][(R() * 4) | 0];
    g.fillRect(R() * L.W, R() * L.H, 2 + R() * 3, 2 + R() * 3);
  }
  for (let i = 0; i < 700; i++) { // ngọn cỏ
    const x = R() * L.W, y = R() * L.H; g.strokeStyle = 'rgba(140,170,80,.5)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 6); g.moveTo(x + 2, y); g.lineTo(x + 3, y - 7); g.stroke();
  }
  for (let i = 0; i < 160; i++) { // hoa dại
    g.fillStyle = ['#f6e27a', '#f4a7b9', '#ffffff'][(R() * 3) | 0]; g.beginPath(); g.arc(R() * L.W, R() * L.H, 2, 0, 7); g.fill();
  }
  // lối đi đá
  const stone = (x, y, w, h, s = 40) => {
    g.fillStyle = '#b8a88c'; g.fillRect(x, y, w, h);
    for (let yy = y; yy < y + h; yy += s) for (let xx = x + ((((yy - y) / s) % 2) ? s / 2 : 0) - s; xx < x + w; xx += s) {
      const c = 172 + (R() * 22 | 0); g.fillStyle = `rgb(${c},${c - 10},${c - 30})`;
      g.fillRect(Math.max(x, xx + 2), yy + 2, Math.min(s - 4, x + w - xx - 2), Math.min(s - 4, y + h - yy - 2));
    }
    g.strokeStyle = 'rgba(80,60,40,.25)'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
  };
  stone(800, 490, 400, 950);          // trục chính
  stone(760, 520, 480, 270);          // sân lư hương
  stone(360, 540, 400, 64, 32);       // sang gác chuông
  stone(298, 360, 64, 380, 32);       // xuống vườn
  stone(590, 880, 210, 64, 32);       // sang vườn
  stone(1200, 880, 200, 64, 32);      // sang chuồng
  // sân trước chánh điện + bậc
  g.fillStyle = '#9c8b70'; g.fillRect(760, 488, 480, 34);
  for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(255,255,255,${.08 + i * .05})`; g.fillRect(770, 490 + i * 10, 460, 3); }
  // sàn chánh điện
  for (let y = 250; y < 490; y += 30) for (let x = 726; x < 1274; x += 30) {
    g.fillStyle = ((x / 30 + y / 30) | 0) % 2 ? '#8a3f2a' : '#7a3524'; g.fillRect(x, y, 30, 30);
  }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(726, 250, 548, 40);
  // thảm đỏ
  g.fillStyle = '#a5281e'; g.fillRect(940, 316, 120, 174); g.fillStyle = '#e8b65a'; g.fillRect(944, 320, 4, 166); g.fillRect(1052, 320, 4, 166);
  // vườn rau
  const gd = L.garden;
  g.fillStyle = '#6b4a2b'; roundRect(g, gd.x, gd.y, gd.w, gd.h, 18); g.fill();
  for (let i = 0; i < 1500; i++) { g.fillStyle = R() > .5 ? '#5c3e23' : '#7a5634'; g.fillRect(gd.x + R() * gd.w, gd.y + R() * gd.h, 3, 2); }
  fence(g, gd.x - 6, gd.y - 6, gd.w + 12, gd.h + 12, { gapSide: 'right', gapFrom: 140, gapTo: 220 });
  // chuồng thú
  const pn = L.pen;
  g.fillStyle = 'rgba(110,150,70,.55)'; roundRect(g, pn.x, pn.y, pn.w, pn.h, 30); g.fill();
  fence(g, pn.x, pn.y, pn.w, pn.h, { gapSide: 'left', gapFrom: 170, gapTo: 250 });
  // ổ rơm
  g.fillStyle = '#d9b45c'; g.beginPath(); g.ellipse(1590, 1150, 70, 30, 0, 0, 7); g.fill();
  g.strokeStyle = '#b8913a'; for (let i = 0; i < 60; i++) { const a = R() * 7, r = R() * 60; g.beginPath(); g.moveTo(1590 + Math.cos(a) * r, 1150 + Math.sin(a) * r * .4); g.lineTo(1590 + Math.cos(a) * r + 8, 1150 + Math.sin(a) * r * .4 + 2); g.stroke(); }
  // hồ: đá viền
  const pd = L.pond;
  g.fillStyle = '#8d8676'; g.beginPath(); g.ellipse(pd.x, pd.y, pd.rx + 14, pd.ry + 12, 0, 0, 7); g.fill();
  for (let a = 0; a < Math.PI * 2; a += .22) { g.fillStyle = R() > .5 ? '#a39b88' : '#7b7465'; g.beginPath(); g.ellipse(pd.x + Math.cos(a) * (pd.rx + 10), pd.y + Math.sin(a) * (pd.ry + 8), 14, 9, a, 0, 7); g.fill(); }
  // tường bao
  wall(g, 0, 0, L.W, 60, true); wall(g, 0, L.H - 60, L.W, 60, true);
  wall(g, 0, 0, 50, L.H, false); wall(g, L.W - 50, 0, 50, L.H, false);
  // biển vườn
  sign(g, 365, 712, 'VƯỜN RAU PHƯỚC ĐỨC'); sign(g, 1660, 684, 'VƯỜN THÚ CƯNG');
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fence(g, x, y, w, h, gap) {
  g.strokeStyle = '#8b5e34'; g.lineWidth = 4; g.fillStyle = '#a8743f';
  const seg = (x1, y1, x2, y2, side) => {
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(len / 26);
    for (let i = 0; i <= n; i++) {
      const d = i * 26; if (gap && gap.gapSide === side && d > gap.gapFrom && d < gap.gapTo) continue;
      const px = x1 + (x2 - x1) * i / n, py = y1 + (y2 - y1) * i / n; g.fillRect(px - 3, py - 12, 6, 16);
      if (i < n && !(gap && gap.gapSide === side && d + 26 > gap.gapFrom && d < gap.gapTo)) { g.beginPath(); g.moveTo(px, py - 8); g.lineTo(x1 + (x2 - x1) * (i + 1) / n, y1 + (y2 - y1) * (i + 1) / n - 8); g.stroke(); }
    }
  };
  seg(x, y, x + w, y, 'top'); seg(x, y + h, x + w, y + h, 'bottom'); seg(x, y, x, y + h, 'left'); seg(x + w, y, x + w, y + h, 'right');
}
function wall(g, x, y, w, h, horiz) {
  g.fillStyle = '#d6ad66'; g.fillRect(x, y, w, h);
  g.fillStyle = '#7d3320';
  if (horiz) { g.fillRect(x, y + (y === 0 ? h - 16 : 0), w, 16); for (let i = x; i < x + w; i += 18) { g.fillStyle = i % 36 ? '#6a2a19' : '#8f3d26'; g.fillRect(i, y + (y === 0 ? h - 16 : 0), 16, 14); } }
  else { g.fillRect(x + (x === 0 ? w - 14 : 0), y, 14, h); }
  g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = x + 30; i < x + w; i += 120) if (horiz) g.fillRect(i, y + 10, 50, 20);
}
function sign(g, x, y, text) {
  g.font = '700 12px "Be Vietnam Pro", sans-serif'; const w = g.measureText(text).width + 24;
  g.fillStyle = '#5b3a1e'; g.fillRect(x - 3, y, 6, 30);
  g.fillStyle = '#8c2b1e'; roundRect(g, x - w / 2, y - 22, w, 24, 5); g.fill();
  g.strokeStyle = '#e8b65a'; g.lineWidth = 1.5; roundRect(g, x - w / 2 + 3, y - 19, w - 6, 18, 3); g.stroke();
  g.fillStyle = '#f7d58c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - 10);
}

/* ---------------- Chánh điện ---------------- */
const altarImgs = {};
function loadAltarImages() { S.altar.forEach(a => { if (a.image && !altarImgs[a.image]) { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = a.image; altarImgs[a.image] = im; } }); }

function drawHall(t) {
  const h = L.hall;
  // tường sau
  const gr = ctx.createLinearGradient(0, 120, 0, 260); gr.addColorStop(0, '#b9853f'); gr.addColorStop(1, '#8e5f2a');
  ctx.fillStyle = gr; ctx.fillRect(h.x + 20, 110, h.w - 40, 145);
  ctx.fillStyle = '#5a2a16'; for (let x = h.x + 26; x < h.x + h.w - 20; x += 90) ctx.fillRect(x, 110, 8, 145);
  // hoành phi
  ctx.fillStyle = '#7c1f15'; roundRect(ctx, 850, 120, 300, 40, 6); ctx.fill();
  ctx.strokeStyle = '#e8b65a'; ctx.lineWidth = 2; roundRect(ctx, 855, 127, 290, 30, 4); ctx.stroke();
  ctx.fillStyle = '#f7d58c'; ctx.font = '700 17px "Noto Serif", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('TỔ NGHIỆP DESIGNER', 1000, 143);
  // câu đối
  const couplet = (x, txt) => {
    ctx.fillStyle = '#7c1f15'; ctx.fillRect(x - 13, 120, 26, 130); ctx.strokeStyle = '#e8b65a'; ctx.lineWidth = 1; ctx.strokeRect(x - 10, 123, 20, 124);
    ctx.fillStyle = '#f7d58c'; ctx.font = '700 9px "Be Vietnam Pro", sans-serif';
    txt.split(' ').forEach((w, i) => ctx.fillText(w, x, 136 + i * 19));
  };
  couplet(745, 'CTRL S THƯỜNG XUYÊN'); couplet(1255, 'FILE GỐC MÃI CÒN');
  // bài vị các tổ
  const n = S.altar.length || 1, span = 410, w = Math.min(42, span / n - 4);
  S.altar.forEach((a, i) => {
    const cx = 1000 - span / 2 + (i + .5) * (span / n), top = 178, hh = 70;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(cx - w / 2 + 3, top + 4, w, hh);
    ctx.fillStyle = '#e8b65a'; roundRect(ctx, cx - w / 2 - 2, top - 2, w + 4, hh + 4, w / 2); ctx.fill();
    ctx.fillStyle = '#8c2b1e'; roundRect(ctx, cx - w / 2, top, w, hh, w / 2 - 2); ctx.fill();
    ctx.fillStyle = a.color; ctx.fillRect(cx - w / 2 + 4, top + hh - 10, w - 8, 3);
    const im = a.image && altarImgs[a.image];
    if (im && im.complete && im.naturalWidth) { const s = w - 10; ctx.drawImage(im, cx - s / 2, top + 14, s, s); }
    else {
      ctx.fillStyle = '#f7d58c'; ctx.font = `700 ${Math.round(w * .38)}px "Noto Serif", serif`;
      ctx.fillText(a.short || a.name.slice(0, 2), cx, top + 30);
      ctx.font = `600 ${Math.max(6, Math.round(w * .16))}px "Be Vietnam Pro", sans-serif`; ctx.fillStyle = '#ffe9bf';
      const words = a.name.split(' '); words.slice(0, 2).forEach((wd, k) => ctx.fillText(wd.length > 10 ? wd.slice(0, 9) + '.' : wd, cx, top + 46 + k * 8));
    }
    // ánh hào quang nhẹ
    const glow = .25 + .15 * Math.sin(t / 900 + i);
    ctx.fillStyle = `rgba(255,220,140,${glow * .3})`; ctx.beginPath(); ctx.arc(cx, top + 25, w * .7, 0, 7); ctx.fill();
  });
  // bàn thờ
  ctx.fillStyle = '#5a1f12'; ctx.fillRect(760, 250, 480, 66);
  ctx.fillStyle = '#7a2c18'; ctx.fillRect(760, 250, 480, 14);
  ctx.strokeStyle = '#e8b65a'; ctx.lineWidth = 2; ctx.strokeRect(770, 268, 460, 40);
  ctx.fillStyle = '#e8b65a'; ctx.font = '600 10px "Be Vietnam Pro", sans-serif';
  ctx.fillText('✦  HỆ SINH THÁI PIKLAB  ✦', 1000, 288);
  // nến
  [778, 1222].forEach(x => {
    ctx.fillStyle = '#f2e6c9'; ctx.fillRect(x - 5, 226, 10, 26);
    const f = Math.sin(t / 90 + x) * 1.5;
    ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.ellipse(x + f * .3, 220, 4, 8 + f, 0, 0, 7); ctx.fill();
    glowAt(x, 220, 60, 'rgba(255,190,90,.35)');
  });
  // mâm ngũ quả
  ctx.fillStyle = '#c8902e'; ctx.beginPath(); ctx.ellipse(880, 252, 28, 7, 0, 0, 7); ctx.fill();
  [['#f2c14e', 868, 244], ['#e4572e', 882, 240], ['#76b041', 894, 245], ['#f78c2a', 878, 248]].forEach(([c, x, y]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); });
  ctx.fillStyle = '#c8902e'; ctx.beginPath(); ctx.ellipse(1120, 252, 28, 7, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#8bbd3c'; ctx.beginPath(); ctx.ellipse(1120, 242, 22, 10, 0, 0, 7); ctx.fill();
  // lư hương nhỏ trên bàn thờ
  drawBowl(1000, 256, .55, t);
  // mái
  drawRoof(1000, 114, 680, t);
}
function drawRoof(cx, baseY, width, t) {
  const half = width / 2;
  const tier = (y, hw, hgt, lift) => {
    ctx.fillStyle = '#6e2516';
    ctx.beginPath(); ctx.moveTo(cx - hw - 30, y - lift); ctx.quadraticCurveTo(cx - hw + 20, y + 4, cx - hw + 60, y + 2);
    ctx.lineTo(cx + hw - 60, y + 2); ctx.quadraticCurveTo(cx + hw - 20, y + 4, cx + hw + 30, y - lift);
    ctx.lineTo(cx + hw - 40, y - hgt); ctx.lineTo(cx - hw + 40, y - hgt); ctx.closePath(); ctx.fill();
    // ngói
    ctx.save(); ctx.clip();
    for (let x = cx - hw - 30; x < cx + hw + 30; x += 12) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y - hgt, 4, hgt + 8); }
    for (let yy = y - hgt + 10; yy < y; yy += 12) { ctx.fillStyle = 'rgba(255,170,120,.08)'; ctx.fillRect(cx - hw - 30, yy, hw * 2 + 60, 2); }
    ctx.restore();
    ctx.strokeStyle = '#e8b65a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - hw - 30, y - lift); ctx.quadraticCurveTo(cx - hw + 20, y + 4, cx - hw + 60, y + 2); ctx.lineTo(cx + hw - 60, y + 2); ctx.quadraticCurveTo(cx + hw - 20, y + 4, cx + hw + 30, y - lift); ctx.stroke();
    // đầu đao cong
    [-1, 1].forEach(s => { ctx.strokeStyle = '#e8b65a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + s * (hw + 30), y - lift); ctx.quadraticCurveTo(cx + s * (hw + 46), y - lift - 6, cx + s * (hw + 40), y - lift - 22); ctx.stroke(); });
  };
  tier(baseY, half, 50, 18);
  tier(baseY - 48, half - 90, 44, 16);
  baseY -= 26;
  // bờ nóc + lưỡng long chầu nguyệt (cách điệu)
  ctx.fillStyle = '#8c2b1e'; ctx.fillRect(cx - half + 120, baseY - 72, width - 240, 10);
  ctx.strokeStyle = '#e8b65a'; ctx.lineWidth = 2; ctx.strokeRect(cx - half + 120, baseY - 72, width - 240, 10);
  const pulse = 1 + .08 * Math.sin(t / 500);
  glowAt(cx, baseY - 86, 40 * pulse, 'rgba(255,200,90,.35)');
  ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.arc(cx, baseY - 86, 10 * pulse, 0, 7); ctx.fill();
  [-1, 1].forEach(s => {
    ctx.strokeStyle = '#3f8f74'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + s * 120, baseY - 70); ctx.bezierCurveTo(cx + s * 90, baseY - 96, cx + s * 60, baseY - 66, cx + s * 22, baseY - 88); ctx.stroke();
    ctx.fillStyle = '#3f8f74'; ctx.beginPath(); ctx.arc(cx + s * 22, baseY - 88, 6, 0, 7); ctx.fill();
  });
  ctx.lineCap = 'butt';
}
function drawBowl(x, y, s, t) {
  const sticks = S.incense.slice(-14);
  sticks.forEach((st, i) => {
    const off = ((st.slot % 13) - 6) * 3.2 * s, lean = ((st.slot % 7) - 3) * .04;
    const age = (Date.now() + S.serverOffset - st.t) / 180000, len = (46 - age * 26) * s;
    ctx.strokeStyle = '#b5482b'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(x + off, y - 10 * s); ctx.lineTo(x + off + lean * len, y - 10 * s - len); ctx.stroke();
    const tx = x + off + lean * len, ty = y - 10 * s - len;
    ctx.fillStyle = `rgba(255,${120 + 60 * Math.sin(t / 200 + i)},60,1)`; ctx.beginPath(); ctx.arc(tx, ty, 2.2 * s, 0, 7); ctx.fill();
    if (Math.random() < .06 * s + .02) S.particles.push({ x: tx, y: ty, vx: (Math.random() - .5) * 6, vy: -18 - Math.random() * 10, life: 3.5, age: 0, kind: 'smoke', r: 3 * s + 1 });
  });
  // bát hương đồng
  const gr = ctx.createLinearGradient(x - 30 * s, 0, x + 30 * s, 0);
  gr.addColorStop(0, '#7a4f1d'); gr.addColorStop(.5, '#e2b15c'); gr.addColorStop(1, '#7a4f1d');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - 32 * s, y - 12 * s); ctx.lineTo(x + 32 * s, y - 12 * s); ctx.quadraticCurveTo(x + 30 * s, y + 14 * s, x, y + 14 * s); ctx.quadraticCurveTo(x - 30 * s, y + 14 * s, x - 32 * s, y - 12 * s); ctx.fill();
  ctx.fillStyle = '#c8902e'; ctx.beginPath(); ctx.ellipse(x, y - 12 * s, 32 * s, 7 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#9a8f80'; ctx.beginPath(); ctx.ellipse(x, y - 12 * s, 27 * s, 5 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#6b4518'; ctx.fillRect(x - 24 * s, y + 10 * s, 6 * s, 10 * s); ctx.fillRect(x + 18 * s, y + 10 * s, 6 * s, 10 * s);
  if (s > .8) { ctx.fillStyle = '#7a4f1d'; ctx.font = `700 ${11 * s}px "Noto Serif", serif`; ctx.textAlign = 'center'; ctx.fillText('福', x, y + 2 * s); }
}
function glowAt(x, y, r, c) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }

/* ---------------- Sprite y-sort ---------------- */
function drawTree(tr, t) {
  const { x, y, kind } = tr, sway = Math.sin(t / 1400 + x) * 3;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, y + 6, 46, 14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5b3a1e'; ctx.fillRect(x - 8, y - 50, 16, 56);
  if (kind === 1) { // tre
    for (let i = -2; i <= 2; i++) { ctx.strokeStyle = '#7fa23b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + i * 9, y + 4); ctx.quadraticCurveTo(x + i * 12 + sway, y - 70, x + i * 16 + sway * 2, y - 130); ctx.stroke(); }
    for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 20 + (i % 5) * 9; ctx.fillStyle = i % 2 ? '#7fae3e' : '#5f8f2e'; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * .9 + sway * 2, y - 110 + Math.sin(a) * r * .6, 14, 5, a, 0, 7); ctx.fill(); }
    return;
  }
  const cols = kind === 2 ? ['#d98aa6', '#e9a6bd', '#f4c7d5'] : ['#2f5a2a', '#3f7034', '#56893f'];
  [[0, -90, 52], [-34, -66, 38], [34, -66, 38], [-14, -120, 34], [18, -112, 32]].forEach(([dx, dy, r], i) => {
    ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.arc(x + dx + sway, y + dy, r, 0, 7); ctx.fill();
  });
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(x - 14 + sway, y - 104, 18, 0, 7); ctx.fill();
}
function drawLantern(l, t) {
  ctx.fillStyle = '#4a3420'; ctx.fillRect(l.x - 2, l.y - 56, 4, 60);
  ctx.fillStyle = '#4a3420'; ctx.fillRect(l.x - 14, l.y - 58, 28, 4);
  const sw = Math.sin(t / 700 + l.y) * 2;
  ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.ellipse(l.x + 10 + sw, l.y - 40, 9, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8b65a'; ctx.fillRect(l.x + 6 + sw, l.y - 53, 8, 3); ctx.fillRect(l.x + 6 + sw, l.y - 29, 8, 3);
  lights.push([l.x + 10 + sw, l.y - 40, 70, .55]);
}
function drawBellTower(t) {
  const { x, y } = L.bell, ring = (performance.now() - S.bellRing) / 1000, swing = ring < 4 ? Math.sin(ring * 9) * 0.35 * (1 - ring / 4) : 0;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 34, 80, 18, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#a99a82'; ctx.fillRect(x - 64, y + 10, 128, 26);
  ctx.fillStyle = '#7c2b1b'; [-52, 52].forEach(d => ctx.fillRect(x + d - 6, y - 96, 12, 108));
  ctx.save(); ctx.translate(x, y - 84); ctx.rotate(swing);
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 12); ctx.stroke();
  const gr = ctx.createLinearGradient(-26, 0, 26, 0); gr.addColorStop(0, '#5d4a1e'); gr.addColorStop(.5, '#c9a24a'); gr.addColorStop(1, '#5d4a1e');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-14, 12); ctx.quadraticCurveTo(-18, 30, -26, 64); ctx.lineTo(26, 64); ctx.quadraticCurveTo(18, 30, 14, 12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,160,.5)'; ctx.lineWidth = 1.5; [30, 44, 56].forEach(yy => { ctx.beginPath(); ctx.moveTo(-18, yy); ctx.lineTo(18, yy); ctx.stroke(); });
  ctx.restore();
  if (ring < 3) { ctx.strokeStyle = `rgba(255,220,150,${.6 * (1 - ring / 3)})`; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x, y - 50, 30 + ((ring * 60 + k * 30) % 90), 0, 7); ctx.stroke(); } }
  // mái gác chuông
  ctx.fillStyle = '#6e2516'; ctx.beginPath(); ctx.moveTo(x - 92, y - 92); ctx.quadraticCurveTo(x - 70, y - 98, x - 50, y - 100); ctx.lineTo(x - 20, y - 140); ctx.lineTo(x + 20, y - 140); ctx.lineTo(x + 50, y - 100); ctx.quadraticCurveTo(x + 70, y - 98, x + 92, y - 92); ctx.lineTo(x + 70, y - 106); ctx.lineTo(x - 70, y - 106); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e8b65a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 92, y - 92); ctx.quadraticCurveTo(x - 60, y - 100, x - 50, y - 100); ctx.lineTo(x + 50, y - 100); ctx.quadraticCurveTo(x + 60, y - 100, x + 92, y - 92); ctx.stroke();
  ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.arc(x, y - 146, 6, 0, 7); ctx.fill();
}
function drawGate(t) {
  const x = L.gate.x, y = L.H - 50;
  ctx.fillStyle = '#d6ad66'; ctx.fillRect(x - 190, y - 70, 380, 70);
  ctx.fillStyle = '#3b2414'; ctx.fillRect(x - 50, y - 64, 100, 64); ctx.fillRect(x - 150, y - 50, 60, 50); ctx.fillRect(x + 90, y - 50, 60, 50);
  ctx.fillStyle = '#7c2b1b'; [-180, -100, -60, 60, 100, 180].forEach(d => ctx.fillRect(x + d - 7, y - 100, 14, 100));
  ctx.fillStyle = '#6e2516'; ctx.beginPath(); ctx.moveTo(x - 220, y - 92); ctx.quadraticCurveTo(x - 190, y - 102, x - 150, y - 104); ctx.lineTo(x + 150, y - 104); ctx.quadraticCurveTo(x + 190, y - 102, x + 220, y - 92); ctx.lineTo(x + 170, y - 128); ctx.lineTo(x - 170, y - 128); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6e2516'; ctx.beginPath(); ctx.moveTo(x - 110, y - 128); ctx.lineTo(x - 80, y - 160); ctx.lineTo(x + 80, y - 160); ctx.lineTo(x + 110, y - 128); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e8b65a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 220, y - 92); ctx.quadraticCurveTo(x - 190, y - 102, x - 150, y - 104); ctx.lineTo(x + 150, y - 104); ctx.quadraticCurveTo(x + 190, y - 102, x + 220, y - 92); ctx.stroke();
  ctx.fillStyle = '#8c2b1e'; roundRect(ctx, x - 70, y - 124, 140, 22, 4); ctx.fill(); ctx.strokeStyle = '#e8b65a'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 66, y - 121, 132, 16);
  ctx.fillStyle = '#f7d58c'; ctx.font = '700 12px "Noto Serif", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TAM QUAN DESIGNER', x, y - 113);
  lights.push([x - 120, y - 70, 80, .4], [x + 120, y - 70, 80, .4]);
}
function drawPillars() {
  [740, 860, 1140, 1260].forEach(x => {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, 492, 14, 5, 0, 0, 7); ctx.fill();
    const gr = ctx.createLinearGradient(x - 8, 0, x + 8, 0); gr.addColorStop(0, '#5e1d12'); gr.addColorStop(.45, '#a33a24'); gr.addColorStop(1, '#5e1d12');
    ctx.fillStyle = gr; ctx.fillRect(x - 8, 262, 16, 230);
    ctx.fillStyle = '#c8902e'; ctx.fillRect(x - 10, 478, 20, 12); ctx.fillRect(x - 10, 262, 20, 8);
    ctx.fillStyle = '#3f8f74'; ctx.globalAlpha = .7; ctx.fillRect(x - 3, 300, 6, 150); ctx.globalAlpha = 1;
  });
  ctx.fillStyle = '#5e1d12'; ctx.fillRect(724, 252, 552, 12);
  ctx.fillStyle = '#c8902e'; ctx.fillRect(724, 262, 552, 3);
}
function drawBigBowl(t) {
  const { x, y } = L.bowl;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 18, 46, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#8c7b62'; ctx.fillRect(x - 40, y - 2, 80, 18);
  drawBowl(x, y - 12, 1.15, t);
  lights.push([x, y - 50, 110, .6]);
}

/* ---------------- Nhân vật ---------------- */
function drawAvatar(p, t, isMe) {
  const x = p.x, y = p.y, bob = p.moving ? Math.abs(Math.sin(p.walk * 10)) * 3 : Math.sin(t / 600 + x) * .6;
  const em = S.emotes.get(p.id), emAge = em ? (t - em.t) / 1000 : 9;
  const bowing = em && (em.e === 'bow') && emAge < 1.6 ? Math.sin(Math.min(1, emAge / 1.6) * Math.PI) : 0;
  const zen = em && em.e === 'zen' && emAge < 3;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 15, 5, 0, 0, 7); ctx.fill();
  if (isMe) { ctx.strokeStyle = 'rgba(255,215,120,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 2, 19, 7, 0, 0, 7); ctx.stroke(); }
  const by = y - bob;
  // chân
  if (!zen) {
    const sw = p.moving ? Math.sin(p.walk * 10) * 4 : 0;
    ctx.fillStyle = '#3b2a1e'; ctx.fillRect(x - 7 + sw, y - 6, 6, 6); ctx.fillRect(x + 1 - sw, y - 6, 6, 6);
  }
  // áo
  const col = p.color;
  ctx.fillStyle = col;
  ctx.beginPath();
  if (zen) { ctx.ellipse(x, by - 10, 18, 12, 0, 0, 7); }
  else { ctx.moveTo(x - 9, by - 30); ctx.lineTo(x + 9, by - 30); ctx.lineTo(x + 14, by - 4); ctx.lineTo(x - 14, by - 4); ctx.closePath(); }
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)'; if (!zen) ctx.fillRect(x - 14, by - 8, 28, 4);
  ctx.strokeStyle = 'rgba(255,230,160,.6)'; ctx.lineWidth = 1.5; if (!zen) { ctx.beginPath(); ctx.moveTo(x - 6, by - 30); ctx.lineTo(x + 4, by - 14); ctx.stroke(); }
  // tay chắp
  const praying = em && (em.e === 'pray' || em.e === 'bow' || em.e === 'zen') && emAge < 3;
  if (praying || S.busy && isMe) { ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.ellipse(x, by - 22 + bowing * 4, 3.5, 5, 0, 0, 7); ctx.fill(); }
  // đầu
  const hx = x + bowing * 0 , hy = by - 40 + bowing * 9 + (zen ? 14 : 0);
  ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(hx, hy, 11, 0, 7); ctx.fill();
  ctx.fillStyle = '#2b1d14';
  if (p.hat !== 'non') { ctx.beginPath(); ctx.arc(hx, hy - 2, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
  // mặt
  const fd = p.dir || 1;
  if (zen || bowing > .3) { ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx - 5 + fd, hy + 1); ctx.lineTo(hx - 2 + fd, hy + 1); ctx.moveTo(hx + 2 + fd, hy + 1); ctx.lineTo(hx + 5 + fd, hy + 1); ctx.stroke(); }
  else { ctx.fillRect(hx - 4 + fd * 2, hy, 2, 3); ctx.fillRect(hx + 2 + fd * 2, hy, 2, 3); }
  ctx.fillStyle = 'rgba(230,120,110,.45)'; ctx.beginPath(); ctx.arc(hx - 6 + fd, hy + 5, 2, 0, 7); ctx.arc(hx + 6 + fd, hy + 5, 2, 0, 7); ctx.fill();
  // phụ kiện
  if (p.hat === 'non') {
    ctx.fillStyle = '#e9cf8f'; ctx.beginPath(); ctx.moveTo(hx - 19, hy - 3); ctx.lineTo(hx, hy - 22); ctx.lineTo(hx + 19, hy - 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b89650'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - 12, hy - 9); ctx.lineTo(hx + 12, hy - 9); ctx.stroke();
  } else if (p.hat === 'beanie') {
    ctx.fillStyle = '#e8b65a'; ctx.beginPath(); ctx.arc(hx, hy - 3, 11.5, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#c8902e'; ctx.fillRect(hx - 12, hy - 5, 24, 4);
    ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.arc(hx, hy - 15, 3.5, 0, 7); ctx.fill();
  } else if (p.hat === 'headphone') {
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy - 1, 13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = '#e8b65a'; ctx.fillRect(hx - 15, hy - 3, 5, 9); ctx.fillRect(hx + 10, hy - 3, 5, 9);
  }
  // tên
  ctx.font = `${isMe ? 700 : 600} 11px "Be Vietnam Pro", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,12,6,.75)'; ctx.strokeText(p.name, x, hy - 18 - (p.hat === 'non' ? 6 : 0));
  ctx.fillStyle = isMe ? '#ffd98a' : '#fff4dd'; ctx.fillText(p.name, x, hy - 18 - (p.hat === 'non' ? 6 : 0));
  // biểu cảm
  if (em && emAge < 2.6) {
    const icon = { pray: '🙏', bow: '🙇', heart: '💛', wave: '👋', zen: '🧘' }[em.e];
    const yy = hy - 38 - emAge * 6, a = Math.min(1, (2.6 - emAge) * 2);
    ctx.globalAlpha = a; ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.arc(x, yy, 14, 0, 7); ctx.fill();
    ctx.font = '16px serif'; ctx.textBaseline = 'middle'; ctx.fillText(icon, x, yy + 1); ctx.globalAlpha = 1;
  }
  if (isMe && S.digAnim) {
    const k = (t - S.digAnim) / 900;
    if (k < 1) { ctx.save(); ctx.translate(x + 16 * fd, by - 20); ctx.rotate(fd * (-.9 + Math.abs(Math.sin(k * Math.PI * 3)) * 1.4)); ctx.fillStyle = '#7a5634'; ctx.fillRect(-2, -2, 4, 28); ctx.fillStyle = '#9aa0a6'; ctx.fillRect(-7, 22, 14, 8); ctx.restore(); }
  }
}

/* ---------------- Động vật ---------------- */
function animalPos(a, t) {
  const s = t / 1000, k = a.id.charCodeAt(0) + a.id.length * 13;
  if (a.id === 'fish') return { x: a.x, y: a.y };
  return { x: a.x + Math.sin(s * .21 + k) * a.range + Math.sin(s * .53 + k * 2) * a.range * .3, y: a.y + Math.cos(s * .17 + k) * a.range * .45 };
}
function drawAnimal(a, p, t) {
  const fx = S.animalFx.filter(f => f.id === a.id && t - f.t < 2500);
  const happy = fx.length > 0;
  const s = t / 1000, vx = Math.cos(s * .21 + a.id.charCodeAt(0)), dir = vx >= 0 ? 1 : -1;
  const hop = happy ? Math.abs(Math.sin(t / 120)) * 6 : 0;
  ctx.save(); ctx.translate(p.x, p.y - hop); ctx.scale(dir, 1);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, hop + 2, a.id === 'buffalo' ? 36 : 16, 5, 0, 0, 7); ctx.fill();
  if (a.id === 'cat') {
    ctx.fillStyle = '#e79a4a'; ctx.beginPath(); ctx.ellipse(0, -10, 14, 9, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -20, 8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7, -26); ctx.lineTo(9, -33); ctx.lineTo(13, -27); ctx.moveTo(13, -27); ctx.lineTo(17, -33); ctx.lineTo(19, -24); ctx.fill();
    ctx.strokeStyle = '#e79a4a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-13, -10); ctx.quadraticCurveTo(-24, -14 + Math.sin(t / 300) * 4, -20, -26); ctx.stroke();
    ctx.fillStyle = '#b8682a'; ctx.fillRect(-6, -18, 3, 8); ctx.fillRect(0, -19, 3, 8);
    ctx.fillStyle = '#2b1d14'; ctx.fillRect(13, -22, 2, 2); ctx.fillRect(17, -22, 2, 2);
  } else if (a.id === 'dog') {
    ctx.fillStyle = '#d8a657'; ctx.beginPath(); ctx.ellipse(0, -12, 17, 10, 0, 0, 7); ctx.fill();
    ctx.fillRect(-13, -6, 5, 8); ctx.fillRect(8, -6, 5, 8);
    ctx.beginPath(); ctx.arc(15, -22, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#a8742e'; ctx.beginPath(); ctx.ellipse(10, -27, 4, 7, -.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b1d14'; ctx.fillRect(16, -24, 2, 2); ctx.beginPath(); ctx.arc(23, -20, 2.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d8a657'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(-24, -22 + Math.sin(t / (happy ? 50 : 200)) * 5); ctx.stroke();
  } else if (a.id === 'chicken') {
    [[0, 0], [-34, 18], [30, 22]].forEach(([dx, dy], i) => {
      const pk = Math.max(0, Math.sin(t / 260 + i * 2)) * 4;
      ctx.fillStyle = i === 1 ? '#a0522d' : '#fdf6e3'; ctx.beginPath(); ctx.ellipse(dx, dy - 10, 10, 8, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(dx + 8, dy - 18 + pk, 5.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#d33'; ctx.fillRect(dx + 6, dy - 26 + pk, 4, 4);
      ctx.fillStyle = '#f2a33a'; ctx.beginPath(); ctx.moveTo(dx + 13, dy - 19 + pk); ctx.lineTo(dx + 18, dy - 17 + pk); ctx.lineTo(dx + 13, dy - 15 + pk); ctx.fill();
      ctx.fillRect(dx - 3, dy - 3, 2, 4); ctx.fillRect(dx + 2, dy - 3, 2, 4);
    });
  } else if (a.id === 'buffalo') {
    ctx.fillStyle = '#5d5b63'; ctx.beginPath(); ctx.ellipse(0, -22, 34, 18, 0, 0, 7); ctx.fill();
    [-24, -12, 12, 24].forEach(d => ctx.fillRect(d - 3, -8, 7, 12));
    ctx.beginPath(); ctx.ellipse(34, -26, 13, 11, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d9cfbf'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(34, -38, 12, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = '#2b1d14'; ctx.fillRect(37, -29, 2, 2); ctx.fillStyle = '#7a7680'; ctx.beginPath(); ctx.ellipse(43, -22, 5, 4, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
  // tên + tim
  ctx.font = '600 10px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,12,6,.6)'; ctx.strokeText(a.name, p.x, p.y - (a.id === 'buffalo' ? 50 : 40)); ctx.fillStyle = '#ffe9bf'; ctx.fillText(a.name, p.x, p.y - (a.id === 'buffalo' ? 50 : 40));
  fx.forEach(f => { const k = (t - f.t) / 2500; for (let i = 0; i < 3; i++) { ctx.globalAlpha = 1 - k; ctx.font = '14px serif'; ctx.fillText(i === 1 ? '🥬' : '💛', p.x + (i - 1) * 16, p.y - 50 - k * 40 - i * 4); } ctx.globalAlpha = 1; });
}
function drawPond(t) {
  const pd = L.pond;
  const gr = ctx.createRadialGradient(pd.x - 40, pd.y - 20, 10, pd.x, pd.y, pd.rx);
  gr.addColorStop(0, '#4f9db0'); gr.addColorStop(1, '#245a6b');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, 7); ctx.clip();
  for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; const k = ((t / 3000 + i / 6) % 1); ctx.beginPath(); ctx.ellipse(pd.x + Math.sin(i * 3) * 80, pd.y + Math.cos(i * 5) * 30, 10 + k * 30, 4 + k * 12, 0, 0, 7); ctx.globalAlpha = 1 - k; ctx.stroke(); ctx.globalAlpha = 1; }
  // cá chép
  const fed = S.animalFx.some(f => f.id === 'fish' && t - f.t < 3000);
  for (let i = 0; i < 5; i++) {
    const sp = fed ? 1.8 : .35, a = t / 1000 * sp * (i % 2 ? 1 : -1) + i * 1.3;
    const fxp = pd.x + Math.cos(a) * (pd.rx - 40 - i * 12), fyp = pd.y + Math.sin(a) * (pd.ry - 22 - i * 5);
    const ang = a + (i % 2 ? Math.PI / 2 : -Math.PI / 2);
    ctx.save(); ctx.translate(fxp, fyp); ctx.rotate(ang);
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#ff8a3d'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 5, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-18, -5 + Math.sin(t / 120 + i) * 2); ctx.lineTo(-18, 5 + Math.sin(t / 120 + i) * 2); ctx.fill();
    if (i % 3 === 0) { ctx.fillStyle = '#ff6a2a'; ctx.beginPath(); ctx.arc(3, 0, 3, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  ctx.restore();
  // lá & hoa sen
  [[-110, -20], [-60, 30], [40, -40], [100, 20], [130, -18], [-10, 42], [-140, 18]].forEach(([dx, dy], i) => {
    ctx.fillStyle = i % 2 ? '#4f8a3a' : '#3d7a30'; ctx.beginPath(); ctx.arc(pd.x + dx, pd.y + dy, 15, .3, Math.PI * 2 - .1); ctx.lineTo(pd.x + dx, pd.y + dy); ctx.fill();
    if (i % 2 === 0) { ctx.fillStyle = '#f4a7c0'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(pd.x + dx + Math.cos(k * 1.25) * 5, pd.y + dy - 6 + Math.sin(k * 1.25) * 3, 4, 7, k * 1.25, 0, 7); ctx.fill(); } ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(pd.x + dx, pd.y + dy - 6, 2.5, 0, 7); ctx.fill(); }
  });
}

/* ---------------- Luống rau ---------------- */
function drawPlot(def, st, t) {
  const { x, y } = def;
  ctx.fillStyle = '#4a2f18'; roundRect(ctx, x - 44, y - 30, 88, 64, 16); ctx.fill();
  ctx.fillStyle = '#5e3c20'; roundRect(ctx, x - 40, y - 34, 80, 60, 14); ctx.fill();
  for (let i = -2; i <= 2; i++) { ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 34, y - 20 + i * 9 + 18); ctx.lineTo(x + 34, y - 20 + i * 9 + 18); ctx.stroke(); }
  if (!st) return;
  if (st.state === 'ripe') {
    const sw = Math.sin(t / 700 + x) * 1.5;
    [[-20, -12], [0, -16], [20, -12], [-10, 6], [12, 6]].forEach(([dx, dy], i) => {
      ctx.fillStyle = '#3f7d2c'; ctx.beginPath(); ctx.arc(x + dx + sw, y + dy, 11, 0, 7); ctx.fill();
      ctx.fillStyle = '#6fb544'; ctx.beginPath(); ctx.arc(x + dx + sw, y + dy - 2, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#b6e37a'; ctx.beginPath(); ctx.arc(x + dx + sw, y + dy - 3, 4, 0, 7); ctx.fill();
    });
    if (Math.random() < .004) S.particles.push({ x: x + (Math.random() - .5) * 60, y: y - 10, vx: 0, vy: -12, life: 1.2, age: 0, kind: 'sparkle', r: 2 });
  } else {
    ctx.fillStyle = '#2e1c0e'; ctx.beginPath(); ctx.ellipse(x, y - 4, 22, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a5634'; ctx.beginPath(); ctx.ellipse(x + 26, y - 14, 10, 6, 0, 0, 7); ctx.fill();
    const left = st.regrowAt - (Date.now() + S.serverOffset), total = S.regrowMs || 120000;
    const k = Math.max(0, Math.min(1, 1 - left / total));
    [[-18, 12], [0, 14], [18, 12]].forEach(([dx, dy]) => { ctx.strokeStyle = '#7bc04a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + dx, y + dy); ctx.lineTo(x + dx, y + dy - 4 - k * 8); ctx.stroke(); ctx.fillStyle = '#8fd45a'; ctx.beginPath(); ctx.ellipse(x + dx + 3, y + dy - 5 - k * 8, 3 + k * 2, 2, -.5, 0, 7); ctx.fill(); });
    if (left > 0) { ctx.font = '600 10px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,240,210,.8)'; ctx.fillText(`🌱 ${Math.ceil(left / 1000)}s`, x, y + 30); }
  }
}

/* ---------------- Hạt hiệu ứng ---------------- */
function spark(x, y, c) { S.particles.push({ x, y, vx: (Math.random() - .5) * 120, vy: -40 - Math.random() * 100, life: 1, age: 0, kind: 'spark', c, r: 2.5 }); }
function dirt(x, y) { S.particles.push({ x: x + (Math.random() - .5) * 30, y: y - 6, vx: (Math.random() - .5) * 160, vy: -80 - Math.random() * 120, life: .8, age: 0, kind: 'dirt', r: 3 + Math.random() * 3 }); }
const ambient = [];
for (let i = 0; i < 46; i++) ambient.push({ x: Math.random() * L.W, y: Math.random() * L.H, p: Math.random() * 7, kind: i < 30 ? 'fly' : 'petal' });
function stepParticles(dt) {
  for (const p of S.particles) {
    p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'smoke') { p.vx += Math.sin(p.age * 2 + p.y * .02) * 8 * dt; p.r += dt * 4; }
    else if (p.kind === 'dirt' || p.kind === 'spark') p.vy += 320 * dt;
  }
  S.particles = S.particles.filter(p => p.age < p.life);
  if (S.particles.length > 600) S.particles.splice(0, S.particles.length - 600);
}
function drawParticles(t) {
  for (const p of S.particles) {
    const k = p.age / p.life;
    if (p.kind === 'smoke') { ctx.fillStyle = `rgba(235,230,220,${.32 * (1 - k)})`; }
    else if (p.kind === 'dirt') ctx.fillStyle = `rgba(110,74,40,${1 - k})`;
    else if (p.kind === 'sparkle') ctx.fillStyle = `rgba(255,250,200,${1 - k})`;
    else ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  }
  for (const a of ambient) {
    if (a.kind === 'fly') {
      const x = a.x + Math.sin(t / 2000 + a.p) * 40, y = a.y + Math.cos(t / 1700 + a.p * 2) * 30, f = .5 + .5 * Math.sin(t / 300 + a.p * 9);
      ctx.fillStyle = `rgba(255,240,150,${.8 * f})`; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); lights.push([x, y, 16, .35 * f]);
    } else {
      a.y += .35; a.x += Math.sin(t / 900 + a.p) * .4; if (a.y > L.H) { a.y = 0; a.x = Math.random() * L.W; }
      ctx.fillStyle = 'rgba(244,167,192,.85)'; ctx.beginPath(); ctx.ellipse(a.x, a.y, 4, 2.2, t / 500 + a.p, 0, 7); ctx.fill();
    }
  }
}
function drawFloaters(t) {
  S.floaters = S.floaters.filter(f => t - f.t < f.life);
  for (const f of S.floaters) {
    const k = (t - f.t) / f.life, y = f.y - k * 120, a = k < .1 ? k * 10 : k > .75 ? (1 - k) * 4 : 1;
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.font = 'italic 600 15px "Noto Serif", serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(40,20,10,.7)'; ctx.strokeText(f.text, f.x, y); ctx.fillStyle = '#fff1c9'; ctx.fillText(f.text, f.x, y);
    ctx.font = '500 11px "Be Vietnam Pro", sans-serif'; ctx.strokeText(f.sub, f.x, y + 16); ctx.fillStyle = '#e8b65a'; ctx.fillText(f.sub, f.x, y + 16);
    ctx.globalAlpha = 1;
  }
}

/* ---------------- Ánh sáng hoàng hôn ---------------- */
let lights = [];
const lightCv = document.createElement('canvas'), lctx = lightCv.getContext('2d');
function drawLighting(vw, vh, cam, z) {
  if (lightCv.width !== Math.ceil(vw / 2) || lightCv.height !== Math.ceil(vh / 2)) { lightCv.width = Math.ceil(vw / 2); lightCv.height = Math.ceil(vh / 2); }
  const W = lightCv.width, H = lightCv.height;
  lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, W, H); lctx.fillStyle = 'rgba(28,22,60,0.42)'; lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';
  for (const [x, y, r, a] of lights) {
    const sx = ((x - cam.x) * z + vw / 2) / 2, sy = ((y - cam.y) * z + vh / 2) / 2, rr = r * z / 2;
    if (sx < -rr || sy < -rr || sx > W + rr || sy > H + rr) continue;
    const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, rr); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lightCv, 0, 0, cv.width, cv.height);
  // ánh vàng ấm
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, a] of lights) {
    const sx = ((x - cam.x) * z + vw / 2) * dpr, sy = ((y - cam.y) * z + vh / 2) * dpr, rr = r * z * dpr * .8;
    if (sx < -rr || sy < -rr || sx > cv.width + rr || sy > cv.height + rr) continue;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr); g.addColorStop(0, `rgba(255,170,70,${a * .28})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------------- Va chạm & di chuyển ---------------- */
function collide(x, y) {
  const r = 12;
  for (const s of L.solids) if (x + r > s.x && x - r < s.x + s.w && y + 4 > s.y && y - 8 < s.y + s.h) return true;
  return false;
}
function moveMe(dt) {
  const me = S.me; let dx = 0, dy = 0;
  if (S.keys.ArrowLeft || S.keys.KeyA) dx -= 1; if (S.keys.ArrowRight || S.keys.KeyD) dx += 1;
  if (S.keys.ArrowUp || S.keys.KeyW) dy -= 1; if (S.keys.ArrowDown || S.keys.KeyS) dy += 1;
  if (dx || dy) S.target = null;
  else if (S.target) { const ex = S.target.x - me.x, ey = S.target.y - me.y, d = Math.hypot(ex, ey); if (d < 6) S.target = null; else { dx = ex / d; dy = ey / d; } }
  const len = Math.hypot(dx, dy);
  me.moving = len > 0 && !S.busy;
  if (me.moving) {
    const sp = 190 * dt; dx = dx / len * sp; dy = dy / len * sp;
    const ox = me.x, oy = me.y;
    if (!collide(me.x + dx, me.y)) me.x += dx;
    if (!collide(me.x, me.y + dy)) me.y += dy;
    if (S.target && Math.hypot(me.x - ox, me.y - oy) < sp * .2) S.target = null; // kẹt
    if (Math.abs(dx) > .01) me.dir = dx > 0 ? 1 : -1;
    me.walk += dt;
  }
  const now = performance.now(), st = `${me.x | 0},${me.y | 0},${me.dir},${me.moving}`;
  if (st !== S.sentState && now - S.lastSent > 80) { S.sentState = st; S.lastSent = now; send({ t: 'move', x: me.x, y: me.y, dir: me.dir, moving: me.moving }); }
}

/* ---------------- Tương tác ---------------- */
function findInteract(t) {
  const me = S.me, d = o => Math.hypot(me.x - o.x, me.y - o.y);
  if (d(L.altar) < L.altar.radius && me.y < 500) return { kind: 'incense', icon: '🪔', text: 'Thắp hương tổ nghiệp', x: 1000, y: 330 };
  if (d(L.bowl) < L.bowl.radius) return { kind: 'incense', icon: '🪔', text: 'Thắp hương', x: L.bowl.x, y: L.bowl.y - 70 };
  if (d(L.bell) < L.bell.radius) return { kind: 'bell', icon: '🔔', text: 'Thỉnh chuông', x: L.bell.x, y: L.bell.y - 160 };
  let best = null, bd = 1e9;
  L.plots.forEach(p => { const dd = d(p); if (dd < L.plotRadius && dd < bd) { bd = dd; best = p; } });
  if (best) {
    const st = S.plots[best.id];
    if (st && st.state === 'ripe') return { kind: 'dig', plot: best.id, icon: '⛏️', text: S.profile && S.profile.digsLeft > 0 ? `Cuốc đất (còn ${S.profile.digsLeft} lượt)` : 'Hết lượt đào hôm nay', x: best.x, y: best.y - 50 };
    return { kind: 'wait', icon: '🌱', text: 'Rau đang mọc lại…', x: best.x, y: best.y - 50 };
  }
  for (const a of L.animals) {
    const p = animalPos(a, t), r = a.id === 'fish' ? L.fishRadius : L.animalRadius;
    if (Math.hypot(me.x - p.x, me.y - p.y) < r) return { kind: 'feed', animal: a.id, ax: p.x, ay: p.y, icon: '🥬', text: S.profile && S.profile.rau > 0 ? `Cho ${a.name} ăn rau` : `Cần rau để cho ${a.name} ăn`, x: p.x, y: p.y - 60 };
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
    const d = L.plots[it.plot]; let n = 0; const iv = setInterval(() => { for (let i = 0; i < 5; i++) dirt(d.x, d.y); if (++n > 6) clearInterval(iv); }, 120);
    setTimeout(() => send({ t: 'dig', plot: it.plot }), 900);
    setTimeout(() => { S.busy = false; }, 6000);
  } else if (it.kind === 'feed') {
    if (!S.profile || S.profile.rau <= 0) return toast('Bạn chưa có bó rau nào — ra Vườn Rau Phước Đức cuốc đất nhé 🥬');
    send({ t: 'feed', animal: it.animal, ax: it.ax, ay: it.ay });
  } else if (it.kind === 'wait') toast('Luống này vừa được đào, đợi rau mọc lại hoặc tìm luống khác nhé 🌱');
}

/* ---------------- UI ---------------- */
function toast(msg) { const el = document.createElement('div'); el.textContent = msg; $('#toast').appendChild(el); setTimeout(() => el.remove(), 3200); }
function ticker(msg) { const el = document.createElement('div'); el.className = 't'; el.textContent = msg; const tk = $('#ticker'); tk.appendChild(el); while (tk.children.length > 2) tk.firstChild.remove(); setTimeout(() => el.remove(), 4500); }
function renderRooms() {
  if (!S.room) return;
  const cur = S.rooms.find(r => r.id === S.room.id) || { online: 1, capacity: S.room.capacity };
  $('#roomName').textContent = S.room.name; $('#roomCount').textContent = cur.online; $('#roomCap').textContent = cur.capacity;
  $('#roomList').innerHTML = '<div class="muted" style="color:#d9c3a0;padding:4px 8px 8px">Các khuôn viên đang mở</div>' + S.rooms.map(r => `<div class="r ${r.id === S.room.id ? 'me' : ''}"><span>🛕 ${r.name}${r.id === S.room.id ? ' (bạn)' : ''}</span><b>${r.online}/${r.capacity}</b></div><div class="bar"><i style="width:${Math.min(100, r.online / r.capacity * 100)}%"></i></div>`).join('') + '<div class="muted" style="color:#a99377;padding:6px 8px 2px;font-size:11px">Khi một chùa đủ người, khuôn viên mới sẽ tự mở.</div>';
}
const WISHES = ['Khách duyệt bản đầu tiên', 'Không crash khi render', 'Deadline lùi 1 tuần', 'In ra đúng màu', 'Không bị “làm logo to hơn”', 'Lương về đúng hẹn'];
let pickedApp = null;
function buildAppGrid() {
  $('#appGrid').innerHTML = S.altar.map(a => `<button data-app="${a.id}"><span class="stripe" style="background:${a.color}"></span>${a.image ? `<img src="${a.image}" alt="">` : `<span class="ab">${a.short || a.name.slice(0, 2)}</span>`}<span class="an">${a.name}</span></button>`).join('');
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
    sfx.win(); for (let i = 0; i < 40; i++) spark(S.me.x, S.me.y - 30, ['#ffd27a', '#ff8a5c', '#fff'][i % 3]);
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
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function openBag() {
  const p = S.profile;
  $('#bagBody').innerHTML = `<div class="stats3"><div><b>${p.phuoc}</b>điểm phước</div><div><b>${p.rau}</b>bó rau</div><div><b>${p.digsLeft}/${p.digsPerDay}</b>lượt đào</div></div>
    <label>Voucher đã nhận</label>` + (p.wins.length ? p.wins.slice().reverse().map(w => `<div class="bag-item"><div class="ic">🎟️</div><div style="flex:1"><b>${esc(w.title)}</b><code>${esc(w.code)}</code><br><a href="${esc(w.link || S.shopUrl)}" target="_blank" rel="noopener">Dùng tại PikLab →</a></div></div>`).join('') : '<p class="muted">Chưa có voucher nào. Ra vườn cuốc đất thử vận may nhé!</p>');
  $('#bagModal').classList.remove('hidden');
}
function closeModals() { document.querySelectorAll('.modal-wrap:not(#intro)').forEach(m => m.classList.add('hidden')); }
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModals(); else if (e.target.classList.contains('modal-wrap') && e.target.id !== 'intro') closeModals(); });
$('#bagBtn').onclick = openBag;
$('#roomBtn').onclick = () => $('#roomList').classList.toggle('hidden');
$('#actionBtn').onclick = doInteract;
const updSound = () => { $('#soundBtn').textContent = S.sound ? '🔔' : '🔕'; };
$('#soundBtn').onclick = () => { S.sound = !S.sound; sset('pk_sound', S.sound ? '1' : '0'); updSound(); if (S.sound) sfx.soft(); }; updSound();
document.querySelectorAll('.emote').forEach(b => b.onclick = () => { send({ t: 'emote', e: b.dataset.e }); });

// Màn hình vào
$('#colorPick').innerHTML = COLORS.map(c => `<button data-c="${c}" style="background:${c}" class="${c === choice.color ? 'sel' : ''}"></button>`).join('');
$('#colorPick').onclick = e => { const b = e.target.closest('button'); if (!b) return; choice.color = b.dataset.c; document.querySelectorAll('#colorPick button').forEach(x => x.classList.toggle('sel', x === b)); };
$('#hatPick').onclick = e => { const b = e.target.closest('button'); if (!b) return; choice.hat = b.dataset.h; document.querySelectorAll('#hatPick button').forEach(x => x.classList.toggle('sel', x === b)); };
document.querySelectorAll('#hatPick button').forEach(x => x.classList.toggle('sel', x.dataset.h === choice.hat));
$('#nameInput').value = choice.name;
fetch('/api/public/info').then(r => r.json()).then(i => {
  $('#templeTitle').textContent = i.templeName;
  $('#liveInfo').textContent = `🟢 ${i.online} người đang ở chùa · ${i.rooms.length} khuôn viên đang mở`;
}).catch(() => {});
function enter() {
  const NAMES = ['Thích Kéo Layer', 'Thích Căn Lề', 'Thích Pen Tool', 'Thích Gradient', 'Thích Keyframe', 'Thích Render'];
  choice.name = $('#nameInput').value.trim() || NAMES[(Math.random() * NAMES.length) | 0];
  sset('pk_name', choice.name); sset('pk_color', choice.color); sset('pk_hat', choice.hat);
  $('#intro').classList.add('hidden'); $('#hud').classList.remove('hidden');
  ac(); sfx.bell();
  connect();
  setTimeout(() => $('#hint').style.opacity = 0, 9000);
}
$('#enterBtn').onclick = enter;
$('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') enter(); });

// Điều khiển
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  S.keys[e.code] = true;
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (document.querySelector('.modal-wrap:not(.hidden):not(#intro)')) return; doInteract(); }
  if (e.code === 'Escape') closeModals();
});
addEventListener('keyup', e => { S.keys[e.code] = false; });
addEventListener('blur', () => { S.keys = {}; });
function screenToWorld(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - r.width / 2) / S.zoom + S.cam.x, y: (cy - r.top - r.height / 2) / S.zoom + S.cam.y }; }
cv.addEventListener('pointerdown', e => {
  if (!S.me) return; ac();
  const w = screenToWorld(e.clientX, e.clientY);
  // chạm trúng vật tương tác gần mình → tương tác luôn
  if (S.interact && Math.hypot(w.x - S.interact.x, w.y - (S.interact.y + 50)) < 60) return doInteract();
  S.target = w; S.tapFx = { x: w.x, y: w.y, t: performance.now() };
});
mm.addEventListener('pointerdown', e => {
  const r = mm.getBoundingClientRect(); S.target = { x: (e.clientX - r.left) / r.width * L.W, y: (e.clientY - r.top) / r.height * L.H }; S.tapFx = { x: S.target.x, y: S.target.y, t: performance.now() };
});

/* ---------------- Vòng lặp ---------------- */
let dpr = 1, last = performance.now();
function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; S.zoom = Math.max(.6, Math.min(1.25, Math.min(innerWidth / 1000, innerHeight / 720))); }
addEventListener('resize', resize); resize();
buildBackground();

function frame(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  const vw = innerWidth, vh = innerHeight, z = S.zoom;
  if (S.me) {
    moveMe(dt);
    for (const p of S.players.values()) {
      const k = Math.min(1, dt * 10); p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; if (p.moving) p.walk += dt;
    }
    S.cam.x += (S.me.x - S.cam.x) * Math.min(1, dt * 5); S.cam.y += (S.me.y - 40 - S.cam.y) * Math.min(1, dt * 5);
  }
  const hw = vw / 2 / z, hh = vh / 2 / z;
  S.cam.x = Math.max(hw - 40, Math.min(L.W - hw + 40, S.cam.x)); S.cam.y = Math.max(hh - 120, Math.min(L.H - hh + 40, S.cam.y));
  if (hw * 2 > L.W) S.cam.x = L.W / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#2b2a1c'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(z * dpr, 0, 0, z * dpr, (vw / 2 - S.cam.x * z) * dpr, (vh / 2 - S.cam.y * z) * dpr);
  lights = [];
  ctx.drawImage(bg, 0, 0);
  drawHall(t);
  drawPond(t);
  L.plots.forEach(p => drawPlot(p, S.plots[p.id], t));
  // y-sort
  const list = [];
  L.trees.forEach(tr => list.push([tr.y, () => drawTree(tr, t)]));
  L.lanterns.forEach(l => list.push([l.y, () => drawLantern(l, t)]));
  list.push([L.bell.y + 30, () => drawBellTower(t)]);
  list.push([L.bowl.y + 10, () => drawBigBowl(t)]);
  list.push([491, drawPillars]);
  list.push([L.H, () => drawGate(t)]);
  L.animals.forEach(a => { if (a.id !== 'fish') { const p = animalPos(a, t); list.push([p.y, () => drawAnimal(a, p, t)]); } else list.push([a.y + 90, () => drawAnimal(a, { x: a.x, y: a.y + 110 }, t)]); });
  for (const p of S.players.values()) list.push([p.y, () => drawAvatar(p, t, false)]);
  if (S.me) list.push([S.me.y, () => drawAvatar(S.me, t, true)]);
  list.sort((a, b) => a[0] - b[0]).forEach(e => e[1]());
  lights.push([800, 220, 90, .7], [1200, 220, 90, .7], [1000, 200, 260, .55]);
  if (S.me) lights.push([S.me.x, S.me.y - 20, 150, .5]);

  stepParticles(dt); drawParticles(t); drawFloaters(t);
  if (S.tapFx && t - S.tapFx.t < 600) { const k = (t - S.tapFx.t) / 600; ctx.strokeStyle = `rgba(255,220,140,${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(S.tapFx.x, S.tapFx.y, 6 + k * 16, 3 + k * 7, 0, 0, 7); ctx.stroke(); }

  // tương tác
  if (S.me) {
    S.interact = findInteract(t);
    const btn = $('#actionBtn');
    if (S.interact) {
      const it = S.interact, bob = Math.sin(t / 250) * 3;
      ctx.fillStyle = 'rgba(255,240,200,.95)'; ctx.beginPath(); ctx.arc(it.x, it.y + bob, 15, 0, 7); ctx.fill();
      ctx.font = '15px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.icon, it.x, it.y + bob + 1);
      btn.classList.remove('hidden'); btn.classList.toggle('busy', S.busy);
      $('#actionIcon').textContent = it.icon; $('#actionText').textContent = S.busy ? 'Đang cuốc đất…' : it.text;
    } else btn.classList.add('hidden');
  }
  drawLighting(vw, vh, S.cam, z);
  drawMinimap();
  requestAnimationFrame(frame);
}
let mmBg = null;
function drawMinimap() {
  const W = mm.width, H = mm.height, sx = W / L.W, sy = H / L.H;
  if (!mmBg) { mmBg = document.createElement('canvas'); mmBg.width = W; mmBg.height = H; mmBg.getContext('2d').drawImage(bg, 0, 0, W, H); const g = mmBg.getContext('2d'); g.fillStyle = '#7c2b1b'; g.fillRect(L.hall.x * sx, 60 * sy, L.hall.w * sx, 200 * sy); }
  mctx.clearRect(0, 0, W, H); mctx.globalAlpha = .9; mctx.drawImage(mmBg, 0, 0); mctx.globalAlpha = 1;
  const lab = (x, y, s) => { mctx.font = '600 9px "Be Vietnam Pro", sans-serif'; mctx.textAlign = 'center'; mctx.fillStyle = '#fff4dd'; mctx.strokeStyle = 'rgba(0,0,0,.6)'; mctx.lineWidth = 2.5; mctx.strokeText(s, x * sx, y * sy); mctx.fillText(s, x * sx, y * sy); };
  lab(1000, 330, 'Chánh điện'); lab(365, 950, 'Vườn rau'); lab(1660, 1000, 'Thú cưng'); lab(330, 440, 'Chuông');
  mctx.fillStyle = '#fff4dd'; for (const p of S.players.values()) { mctx.beginPath(); mctx.arc(p.x * sx, p.y * sy, 2, 0, 7); mctx.fill(); }
  if (S.me) { mctx.fillStyle = '#ffcf5a'; mctx.strokeStyle = '#3a1d08'; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.arc(S.me.x * sx, S.me.y * sy, 4, 0, 7); mctx.fill(); mctx.stroke(); }
}
requestAnimationFrame(frame);
})();
