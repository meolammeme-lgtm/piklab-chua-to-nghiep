/*
 * Chùa Tổ Nghiệp Designer — PikLab
 * Server Node.js thuần, không cần cài thư viện (npm install không bắt buộc).
 * Chạy:  node server.js     (mặc định cổng 3000)
 * Biến môi trường: PORT, ADMIN_PASSWORD, DATA_FILE,
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (lưu dữ liệu bền vững, không mất khi deploy lại)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const LAYOUT = require('./public/layout.js');
const RULES = require('./public/rules.js');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'piklab@2026';
const ADMIN_PW_DEFAULT = !process.env.ADMIN_PASSWORD;
const ADMIN_PW_WEAK = ADMIN_PASSWORD.length < 10;

/* ---------- Bảo mật: IP thật của người dùng ----------
 * Render đặt Cloudflare phía trước: CF-Connecting-IP / True-Client-IP do Cloudflare ghi đè, người dùng không giả được.
 * KHÔNG tin X-Forwarded-For do người dùng tự gửi. Có thể đổi header tin cậy bằng biến môi trường IP_HEADER. */
const IP_HEADER = (process.env.IP_HEADER || '').toLowerCase();
function clientIp(req) {
  const h = req.headers;
  for (const name of [IP_HEADER, 'cf-connecting-ip', 'true-client-ip'].filter(Boolean)) {
    const v = String(h[name] || '').split(',')[0].trim();
    if (v) return v.slice(0, 64);
  }
  return String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}
function ipSource(req) {
  for (const name of [IP_HEADER, 'cf-connecting-ip', 'true-client-ip'].filter(Boolean)) if (req.headers[name]) return name;
  return 'socket';
}

/* ---------- Bảo mật: header cho mọi phản hồi ---------- */
function secHeaders(req, res) {
  const host = String(req.headers.host || '').replace(/[^\w.:-]/g, '');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' wss://${host} ws://${host}`,
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"
  ].join('; '));
  if (req.headers['x-forwarded-proto'] === 'https') res.setHeader('Strict-Transport-Security', 'max-age=15552000');
}
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');
const PUBLIC = path.join(__dirname, 'public');

/* ----------------------------- Dữ liệu ----------------------------- */
const DEFAULT_ALTAR = [
  { id: 'ps', name: 'Photoshop', short: 'Ps', color: '#31A8FF', image: '' },
  { id: 'ai', name: 'Illustrator', short: 'Ai', color: '#FF9A00', image: '' },
  { id: 'pr', name: 'Premiere Pro', short: 'Pr', color: '#9999FF', image: '' },
  { id: 'ae', name: 'After Effects', short: 'Ae', color: '#9999FF', image: '' },
  { id: 'bl', name: 'Blender', short: 'Bl', color: '#EA7600', image: '' },
  { id: 'fg', name: 'Figma', short: 'Fg', color: '#A259FF', image: '' },
  { id: 'cv', name: 'Canva', short: 'Cv', color: '#00C4CC', image: '' },
  { id: 'cc', name: 'CapCut', short: 'Cc', color: '#EDEDED', image: '' },
  { id: 'id', name: 'InDesign', short: 'Id', color: '#FF3366', image: '' },
  { id: 'lr', name: 'Lightroom', short: 'Lr', color: '#31A8FF', image: '' }
];

function freshDb() {
  return {
    config: {
      roomCapacity: 30,
      digsPerDay: 3,
      plotRegrowSec: 120,
      incenseCooldownSec: 20,
      maxAccountsPerIpPerDay: 3,
      shopUrl: 'https://piklab.vn',
      templeName: 'Chùa Tổ Nghiệp Designer',
      altar: DEFAULT_ALTAR,
      startPhuoc: 20,            // phước tặng khi tạo tài khoản
      fortuneCost: 5,            // phước cho mỗi lần gieo quẻ
      shoutCost: 1,              // phước cho mỗi câu khẩu nghiệp
      sweepReward: 2,            // phước mỗi ụ lá đa quét được
      leafRegrowSec: 45,         // lá đa rụng lại sau bao lâu
      fortunes: RULES.DEFAULT_FORTUNES,
      fortunePerDay: 3,          // số quẻ được xin mỗi ngày
      bellPerDay: 5,             // lượt thỉnh chuông mỗi ngày
      bellReward: 3,             // thỉnh trúng nhịp: + phước
      bellPenalty: 1,            // lệch nhịp (xì hơi): − phước
      chantReward: 2,            // gõ mõ / lần tràng hạt xong 1 lượt
      weatherMode: 'auto',       // auto = theo dự báo thật, manual = admin chọn
      weatherCity: 'hanoi',
      weatherManual: 'clear',
      bannedWords: RULES.DEFAULT_BANNED
    },
    vouchers: [],
    awards: [],
    players: {},
    daily: {},
    hourly: {},
    accounts: {},
    sessions: {},
    adminSessions: {},
    totals: { visits: 0, incense: 0, digs: 0, wins: 0, feeds: 0, bells: 0, roomsCreated: 1, registers: 0, fortunes: 0, shouts: 0, tugs: 0, sweeps: 0, meals: 0, purchases: 0 }
  };
}

let db;
function normalizeDb(d) {
  const f = freshDb();
  d.config = Object.assign(f.config, d.config || {});
  for (const k of Object.keys(f)) if (d[k] === undefined || d[k] === null) d[k] = f[k];
  d.totals = Object.assign(f.totals, d.totals);
  return d;
}
try { db = normalizeDb(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); } catch (e) { db = freshDb(); }

/* ---------- Lưu trữ: Upstash Redis (bền vững) hoặc file JSON ----------
 * Render gói miễn phí xoá ổ đĩa mỗi lần deploy → nếu có biến UPSTASH_* thì dữ liệu được lưu
 * lên Redis, chỉ gửi những phần thay đổi (tiết kiệm lượt gọi của gói free). */
const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const USE_REDIS = !!(REDIS_URL && REDIS_TOKEN);
const RK = 'piklab:';
const HASH_COLLS = ['accounts', 'players', 'sessions', 'adminSessions', 'daily', 'hourly'];   // object { key: value }
const STR_COLLS = ['config', 'vouchers', 'totals'];
const savedCache = {};                                                     // bản đã lưu gần nhất (JSON)
async function redis(cmds) {
  const r = await fetch(REDIS_URL + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('Redis HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const out = await r.json();
  const err = out.find(x => x && x.error); if (err) throw new Error('Redis: ' + err.error);
  return out.map(x => x.result);
}
const pairs = arr => { const o = {}; for (let i = 0; i < (arr || []).length; i += 2) o[arr[i]] = arr[i + 1]; return o; };
async function loadFromRedis() {
  const res = await redis([...STR_COLLS.map(c => ['GET', RK + c]), ...HASH_COLLS.map(c => ['HGETALL', RK + c]), ['HGETALL', RK + 'awards']]);
  if (res[0] == null) return false;                                       // Redis còn trống
  const d = {};
  STR_COLLS.forEach((c, i) => { savedCache[c] = res[i]; d[c] = res[i] ? JSON.parse(res[i]) : undefined; });
  HASH_COLLS.forEach((c, i) => { const h = pairs(res[STR_COLLS.length + i]); savedCache[c] = h; d[c] = {}; for (const k in h) d[c][k] = JSON.parse(h[k]); });
  const aw = pairs(res[res.length - 1]); savedCache.awards = aw;
  d.awards = Object.values(aw).map(v => JSON.parse(v)).sort((a, b) => a.time - b.time);
  db = normalizeDb(d);
  return true;
}
function diffCommands() {
  const cmds = [];
  for (const c of STR_COLLS) { const j = JSON.stringify(db[c]); if (j !== savedCache[c]) { cmds.push({ cmd: ['SET', RK + c, j], apply: () => { savedCache[c] = j; } }); } }
  const hashDiff = (c, entries) => {
    const prev = savedCache[c] || {}, next = {}, set = [], del = [];
    for (const [k, v] of entries) { const j = JSON.stringify(v); next[k] = j; if (prev[k] !== j) set.push(k, j); }
    for (const k in prev) if (!(k in next)) del.push(k);
    let chunk = [], size = 0;                                              // chia nhỏ để mỗi request < 4MB
    const flush = () => { if (!chunk.length) return; const part = chunk; cmds.push({ cmd: ['HSET', RK + c, ...part], apply: () => { const sc = savedCache[c] = savedCache[c] || {}; for (let i = 0; i < part.length; i += 2) sc[part[i]] = part[i + 1]; } }); chunk = []; size = 0; };
    for (let i = 0; i < set.length; i += 2) { chunk.push(set[i], set[i + 1]); size += set[i + 1].length; if (size > 3e6) flush(); }
    flush();
    if (del.length) cmds.push({ cmd: ['HDEL', RK + c, ...del], apply: () => { const sc = savedCache[c] || {}; del.forEach(k => delete sc[k]); } });
  };
  for (const c of HASH_COLLS) hashDiff(c, Object.entries(db[c] || {}));
  hashDiff('awards', db.awards.map(a => [a.id, a]));
  return cmds;
}
let dirty = true, saving = false, soonTimer = null;
function save() { dirty = true; }
function saveSoon() { dirty = true; if (!soonTimer) soonTimer = setTimeout(() => { soonTimer = null; flushSave(); }, 1500); }
async function flushSave() {
  if (!dirty || saving) return;
  dirty = false; saving = true;
  try {
    if (USE_REDIS) {
      const cmds = diffCommands();
      for (let i = 0; i < cmds.length; i += 20) { const batch = cmds.slice(i, i + 20); await redis(batch.map(x => x.cmd)); batch.forEach(x => x.apply()); }
    } else {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      const tmp = DATA_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, DATA_FILE);
    }
  } catch (e) { dirty = true; console.error('[lưu dữ liệu] lỗi, sẽ thử lại:', e.message); }
  saving = false;
}
// Redis: gom thay đổi 30 giây/lần (sự kiện quan trọng lưu ngay sau 1,5 giây). File: 2 giây/lần.
setInterval(flushSave, USE_REDIS ? 30000 : 2000);
// Render gửi SIGTERM trước khi tắt máy cũ khi deploy → lưu nốt trước khi thoát
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { console.log('[lưu dữ liệu] đang lưu trước khi tắt…'); dirty = true; saving = false; await flushSave(); process.exit(0); });

// Ngày/giờ theo giờ Việt Nam (UTC+7)
const vnNow = () => new Date(Date.now() + 7 * 3600e3).toISOString();
const dayKey = () => vnNow().slice(0, 10);
const hourKey = () => vnNow().slice(0, 13);
function today() {
  const k = dayKey();
  if (!db.daily[k]) db.daily[k] = { visits: 0, u: {}, newPlayers: 0, incense: 0, digs: 0, wins: 0, feeds: 0, bells: 0, peak: 0, registers: 0, logins: 0 };
  return db.daily[k];
}
function thisHour() {
  const k = hourKey();
  if (!db.hourly[k]) db.hourly[k] = { visits: 0, peak: 0 };
  // giữ 72 giờ gần nhất
  const keys = Object.keys(db.hourly);
  if (keys.length > 72) keys.sort().slice(0, keys.length - 72).forEach(x => delete db.hourly[x]);
  return db.hourly[k];
}
function bump(field, n = 1) {
  const d = today(); d[field] = (d[field] || 0) + n;
  db.totals[field] = (db.totals[field] || 0) + n;
  save();
}
function getPlayer(pid, name) {
  let p = db.players[pid];
  if (!p) {
    p = db.players[pid] = { name, firstSeen: Date.now(), lastSeen: Date.now(), phuoc: db.config.startPhuoc || 0, st: RULES.STAMINA_MAX, stAt: Date.now(), rau: 0, visits: 0, incense: 0, digs: 0, feeds: 0, digDay: '', digsToday: 0, wins: [] };
    today().newPlayers++;
  }
  if (name) p.name = name;
  return p;
}
function dd(p) {                      // trạng thái theo ngày của người chơi
  const k = dayKey();
  if (!p.dd || p.dd.day !== k) p.dd = { day: k, bell: 0, bellHits: 0, fq: [], acc: null, mo: 0, beads: 0 };
  return p.dd;
}
function profileOf(pid) {
  const p = db.players[pid], acc = accOf(pid) || {};
  const left = p.digDay === dayKey() ? Math.max(0, db.config.digsPerDay - p.digsToday) : db.config.digsPerDay;
  return {
    phuoc: p.phuoc, rau: p.rau, digsLeft: left, digsPerDay: db.config.digsPerDay,
    st: RULES.stamina(p, Date.now()), stMax: RULES.STAMINA_MAX,
    today: (d => ({ bellLeft: Math.max(0, db.config.bellPerDay - d.bell), fortuneLeft: d.acc ? 0 : Math.max(0, db.config.fortunePerDay - d.fq.length),
      drawn: d.fq.map(i => ({ no: i + 1, text: (db.config.fortunes || [])[i] || '' })), accepted: d.acc,
      moLeft: Math.max(0, RULES.CHANT.mo.perDay - d.mo), beadsLeft: Math.max(0, RULES.CHANT.beads.perDay - d.beads) }))(dd(p)),
    look: { color: acc.color, hat: acc.hat, hair: acc.hair }, items: acc.items || { hats: [], colors: [] },
    wins: p.wins.map(id => db.awards.find(a => a.id === id)).filter(Boolean)
      .map(a => ({ title: a.title, code: a.code, link: a.link, time: a.time, description: a.description }))
  };
}
// tra tài khoản theo pid (có chỉ mục)
const pidIdx = new Map();
function accOf(pid) {
  const e = pidIdx.get(pid); if (e && db.accounts[e] && db.accounts[e].pid === pid) return ensureAcc(db.accounts[e]);
  for (const a of Object.values(db.accounts)) pidIdx.set(a.pid, a.email);
  const e2 = pidIdx.get(pid); return e2 && db.accounts[e2] ? ensureAcc(db.accounts[e2]) : null;
}
// chuẩn hoá tài khoản cũ: tách tóc khỏi mũ, thêm tủ đồ
function ensureAcc(a) {
  if (!a) return a;
  if (!a.hair) { a.hair = a.hat === 'bald' ? 'bald' : 'bun'; if (a.hat === 'bald') a.hat = 'none'; }
  if (!RULES.HATS.some(h => h.id === a.hat)) a.hat = 'none';
  if (!a.items) a.items = { hats: [], colors: [] };
  const basicH = RULES.HATS.filter(h => !h.price).map(h => h.id), basicC = RULES.COLORS.filter(c => !c.price).map(c => c.id);
  a.items.hats = [...new Set([...basicH, ...a.items.hats, a.hat])];
  a.items.colors = [...new Set([...basicC, ...a.items.colors, a.color])];
  return a;
}

/* ----------------------------- Phòng (chùa) ----------------------------- */
const rooms = new Map();
function makeRoom(num) {
  const room = {
    id: 'chua-' + num, num, name: 'Chùa ' + num,
    clients: new Map(),
    plots: LAYOUT.plots.map(p => ({ id: p.id, state: 'ripe', regrowAt: 0 })),
    leaves: LAYOUT.leaves.map(l => ({ id: l.id, state: 'full', regrowAt: 0 })),
    tug: { offers: new Map(), match: null },
    incense: [], createdAt: Date.now(), emptySince: 0
  };
  rooms.set(room.id, room);
  return room;
}
makeRoom(1);

function pickRoom() {
  const list = [...rooms.values()].sort((a, b) => a.num - b.num);
  for (const r of list) if (r.clients.size < db.config.roomCapacity) return r;
  const num = Math.max(...list.map(r => r.num)) + 1;
  db.totals.roomsCreated = Math.max(db.totals.roomsCreated || 1, num);
  save();
  console.log(`[room] Chùa ${list.length} đã đủ người → mở khuôn viên Chùa ${num}`);
  return makeRoom(num);
}
function totalOnline() { let n = 0; for (const r of rooms.values()) n += r.clients.size; return n; }

// Dọn phòng trống (trừ Chùa 1), hồi rau, tắt nhang
setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) {
    if (r.num !== 1 && r.clients.size === 0) {
      if (!r.emptySince) r.emptySince = now;
      else if (now - r.emptySince > 60e3) { rooms.delete(r.id); continue; }
    } else r.emptySince = 0;
    for (const pl of r.plots) {
      if (pl.state === 'dug' && now >= pl.regrowAt) { pl.state = 'ripe'; broadcast(r, { t: 'plot', plot: pl }); }
    }
    for (const lf of r.leaves) if (lf.state === 'swept' && now >= lf.regrowAt) { lf.state = 'full'; broadcast(r, { t: 'leaf', leaf: lf }); }
    const before = r.incense.length;
    r.incense = r.incense.filter(s => now - s.t < 180e3);
    if (r.incense.length !== before) broadcast(r, { t: 'incenseAll', list: r.incense });
  }
}, 1000);

// Ghi nhận đỉnh online theo giờ/ngày
setInterval(() => {
  const n = totalOnline();
  const h = thisHour(), d = today();
  if (n > h.peak) { h.peak = n; save(); }
  if (n > d.peak) { d.peak = n; save(); }
}, 5000);

/* ----------------------------- WebSocket tối giản ----------------------------- */
function wsAccept(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) return socket.destroy();
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const ws = {
    socket, alive: true, buf: Buffer.alloc(0), fragments: [],
    send(obj) {
      if (!this.alive) return;
      const data = Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj));
      let header;
      if (data.length < 126) header = Buffer.from([0x81, data.length]);
      else if (data.length < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(data.length, 2); }
      else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(data.length), 2); }
      try { socket.write(Buffer.concat([header, data])); } catch (e) {}
    },
    close() { if (!this.alive) return; this.alive = false; try { socket.end(Buffer.from([0x88, 0])); } catch (e) {} socket.destroy(); }
  };
  socket.on('data', chunk => {
    ws.buf = Buffer.concat([ws.buf, chunk]);
    if (ws.buf.length > 1e6) return ws.close();
    while (ws.buf.length >= 2) {
      const b0 = ws.buf[0], b1 = ws.buf[1];
      const fin = b0 & 0x80, op = b0 & 0x0f, masked = b1 & 0x80;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (ws.buf.length < 4) return; len = ws.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (ws.buf.length < 10) return; len = Number(ws.buf.readBigUInt64BE(2)); off = 10; }
      if (len > 65536) return ws.close();
      const mOff = off; if (masked) off += 4;
      if (ws.buf.length < off + len) return;
      let payload = ws.buf.subarray(off, off + len);
      if (masked) { const m = ws.buf.subarray(mOff, mOff + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
      ws.buf = ws.buf.subarray(off + len);
      if (op === 0x8) return ws.close();
      if (op === 0x9) { try { socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload])); } catch (e) {} continue; }
      if (op === 0x1 || op === 0x0) {
        ws.fragments.push(payload);
        if (fin) { const text = Buffer.concat(ws.fragments).toString('utf8'); ws.fragments = []; ws.onmessage && ws.onmessage(text); }
      }
    }
  });
  socket.on('close', () => { ws.alive = false; ws.onclose && ws.onclose(); ws.onclose = null; });
  socket.on('error', () => { ws.alive = false; ws.onclose && ws.onclose(); ws.onclose = null; });
  return ws;
}

function broadcast(room, msg, except) {
  const s = JSON.stringify(msg);
  for (const c of room.clients.values()) if (c !== except) c.ws.send(s);
}

/* ----------------------------- Logic game ----------------------------- */
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const COLORS = ['#7a5a43', '#6f7d8c', '#c9902e', '#efe7d6', '#a8382c', '#4f7a5a', '#3b4f7a', '#5b4566'];

function rollVoucher(pid) {
  const p = db.players[pid];
  const pool = db.vouchers.filter(v => v.active && remainingOf(v) > 0 && !(v.onePerPlayer && p.wins.some(id => { const a = db.awards.find(x => x.id === id); return a && a.voucherId === v.id; })));
  const r = Math.random() * 100;
  let cum = 0;
  for (const v of db.vouchers) { // giữ nguyên thứ tự tỉ lệ cho mọi voucher đang bật
    if (!v.active || remainingOf(v) <= 0) continue;
    cum += Number(v.rate) || 0;
    if (r < cum) return pool.includes(v) ? v : null;
  }
  return null;
}
function remainingOf(v) {
  if (v.codes && v.codes.length) return v.codes.length - v.given;
  return Math.max(0, (Number(v.quantity) || 0) - v.given);
}
function giveVoucher(v, pid, name, room) {
  const code = v.codes && v.codes.length ? v.codes[v.given] : v.sharedCode;
  v.given++;
  const award = { id: crypto.randomUUID(), voucherId: v.id, title: v.title, description: v.description, link: v.link || db.config.shopUrl, code, pid, name, room, time: Date.now() };
  db.awards.push(award);
  saveSoon();
  db.players[pid].wins.push(award.id);
  bump('wins');
  return award;
}

/* ----------------------------- Tài khoản & chống spam ----------------------------- */
const HATS = ['none', 'bald', 'non', 'khan', 'beanie', 'headphone'];
const EMAIL_RE = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,24}$/i;
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const normName = n => n.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
const limits = new Map(); // key -> [timestamps]
function hit(key, max, windowMs) {
  const now = Date.now(), arr = (limits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now); limits.set(key, arr);
  return arr.length > max;
}
function peek(key, windowMs) { const now = Date.now(); return (limits.get(key) || []).filter(t => now - t < windowMs).length; }
setInterval(() => { const now = Date.now(); for (const [k, a] of limits) if (!a.some(t => now - t < 86400e3)) limits.delete(k); }, 600e3);
function newSession(acc) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = { email: acc.email, exp: Date.now() + 60 * 86400e3 };
  // giữ tối đa 5 phiên mỗi tài khoản
  const mine = Object.entries(db.sessions).filter(([, s]) => s.email === acc.email).sort((a, b) => a[1].exp - b[1].exp);
  mine.slice(0, Math.max(0, mine.length - 5)).forEach(([t]) => delete db.sessions[t]);
  save();
  return token;
}
function accountByToken(token) {
  const s = token && db.sessions[token];
  if (!s || s.exp < Date.now()) return null;
  return ensureAcc(db.accounts[s.email]) || null;
}
const accountByPid = pid => Object.values(db.accounts).find(a => a.pid === pid);
const pubAccount = a => (ensureAcc(a), { name: a.name, color: a.color, hat: a.hat, hair: a.hair });
function kickPid(pid, msg, banned) {
  for (const r of rooms.values()) for (const c of r.clients.values()) if (c.pid === pid) { c.ws.send({ t: 'kicked', msg, banned: !!banned }); setTimeout(() => c.ws.close(), 50); }
}
setInterval(() => { const now = Date.now(); let n = 0; for (const t in db.sessions) if (db.sessions[t].exp < now) { delete db.sessions[t]; n++; } if (n) save(); }, 3600e3);

async function handleAuth(p, req, res, ip) {
  if (hit('auth:' + ip, 40, 60e3)) return json(res, 429, { error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau 1 phút.' });
  const b = await readBody(req, 20000);
  const email = String(b.email || '').trim().toLowerCase();
  if (p === '/api/auth/register') {
    const name = clean(b.name, 18).replace(/\s+/g, ' ');
    if (!EMAIL_RE.test(email)) return json(res, 400, { error: 'Email chưa đúng định dạng.' });
    if (String(b.password || '').length < 6) return json(res, 400, { error: 'Mật khẩu cần ít nhất 6 ký tự.' });
    if (name.length < 2) return json(res, 400, { error: 'Pháp danh cần ít nhất 2 ký tự.' });
    if (db.accounts[email]) return json(res, 409, { error: 'Email này đã có tài khoản — hãy chọn “Đã có tài khoản” để đăng nhập.' });
    if (Object.values(db.accounts).some(a => normName(a.name) === normName(name))) return json(res, 409, { error: 'Pháp danh này đã có người dùng, hãy chọn tên khác nhé.' });
    if (peek('reg:' + ip, 86400e3) >= db.config.maxAccountsPerIpPerDay) return json(res, 429, { error: 'Thiết bị/mạng này đã tạo quá nhiều tài khoản hôm nay. Vui lòng thử lại vào ngày mai.' });
    hit('reg:' + ip, 1e9, 86400e3);
    const salt = crypto.randomBytes(16).toString('hex');
    const acc = db.accounts[email] = {
      email, pid: crypto.randomUUID(), name, color: RULES.COLORS.some(c => !c.price && c.id === b.color) ? b.color : RULES.COLORS[0].id, hat: ['none', 'non'].includes(b.hat) ? b.hat : 'none', hair: ['bun', 'bald'].includes(b.hair) ? b.hair : 'bun', items: null,
      salt, hash: hashPw(b.password, salt), createdAt: Date.now(), lastLogin: Date.now(), ip, lastIp: ip, banned: false, logins: 1
    };
    today().registers = (today().registers || 0) + 1; db.totals.registers = (db.totals.registers || 0) + 1;
    saveSoon();
    return json(res, 200, { token: newSession(acc), account: pubAccount(acc) });
  }
  if (p === '/api/auth/login') {
    if (peek('lockmail:' + email, 15 * 60e3) >= 5) return json(res, 429, { error: 'Đăng nhập sai nhiều lần. Tài khoản tạm khoá 15 phút.' });
    if (peek('failip:' + ip, 15 * 60e3) >= 15) return json(res, 429, { error: 'Quá nhiều lần đăng nhập sai từ mạng này, vui lòng thử lại sau 15 phút.' });
    const acc = db.accounts[email];
    const ok = acc && crypto.timingSafeEqual(Buffer.from(hashPw(b.password || '', acc.salt), 'hex'), Buffer.from(acc.hash, 'hex'));
    if (!ok) { hit('lockmail:' + email, 1e9, 15 * 60e3); hit('failip:' + ip, 1e9, 15 * 60e3); return json(res, 401, { error: 'Email hoặc mật khẩu chưa đúng.' }); }
    if (acc.banned) return json(res, 403, { error: 'Tài khoản đã bị khoá. Liên hệ PikLab nếu có nhầm lẫn.' });
    acc.lastLogin = Date.now(); acc.lastIp = ip; acc.logins = (acc.logins || 0) + 1;
    today().logins = (today().logins || 0) + 1;
    return json(res, 200, { token: newSession(acc), account: pubAccount(acc) });
  }
  if (p === '/api/auth/me') {
    const acc = accountByToken(b.token);
    if (!acc || acc.banned) return json(res, 401, { error: 'Phiên đăng nhập đã hết hạn.' });
    return json(res, 200, { account: pubAccount(acc) });
  }
  if (p === '/api/auth/logout') { if (b.token) delete db.sessions[b.token]; save(); return json(res, 200, { ok: true }); }
  return json(res, 404, { error: 'Not found' });
}

function handleClient(ws, req) {
  const ip = clientIp(req);
  let me = null, room = null;
  // đóng kết nối không đăng nhập trong 10 giây
  const helloTimer = setTimeout(() => { if (!me) ws.close(); }, 10000);
  // giới hạn tốc độ gửi tin: tối đa ~40 tin/giây, vượt quá 120 tin trong 1 giây thì ngắt
  let mWin = Date.now(), mCount = 0;

  ws.onmessage = text => {
    const nowM = Date.now();
    if (nowM - mWin > 1000) { mWin = nowM; mCount = 0; }
    if (++mCount > 120) { console.warn('[bảo mật] ngắt kết nối gửi tin quá nhanh từ', ip); return ws.close(); }
    if (mCount > 40) return;
    if (text.length > 4000) return;
    let m; try { m = JSON.parse(text); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (!me && m.t !== 'hello') return;
    if (m.t === 'hello') clearTimeout(helloTimer);
    switch (m.t) {
      case 'hello': {
        if (me) return;
        const acc = accountByToken(m.token);
        if (!acc) { ws.send({ t: 'authError', msg: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' }); return setTimeout(() => ws.close(), 50); }
        if (acc.banned) { ws.send({ t: 'authError', msg: 'Tài khoản đã bị khoá. Liên hệ PikLab nếu có nhầm lẫn.' }); return setTimeout(() => ws.close(), 50); }
        const pid = acc.pid, name = acc.name;
        kickPid(pid, 'Tài khoản của bạn vừa vào chùa ở một cửa sổ/thiết bị khác.');
        const p = getPlayer(pid, name);
        p.lastSeen = Date.now(); p.visits++;
        const d = today();
        d.visits++; d.u[pid] = 1; db.totals.visits++; thisHour().visits++;
        save();
        room = pickRoom();
        me = {
          ws, pid, ip, name, id: crypto.randomBytes(4).toString('hex'),
          color: acc.color, hat: acc.hat, hair: acc.hair, lastSay: 0,
          x: LAYOUT.spawn.x + (Math.random() * 80 - 40), y: LAYOUT.spawn.y + (Math.random() * 30 - 15),
          dir: 1, moving: false, lastIncense: 0, lastBell: 0, lastEmote: 0, pose: '', bell: null, chant: null
        };
        room.clients.set(me.id, me);
        ws.send({
          t: 'welcome', you: pub(me), room: { id: room.id, name: room.name, num: room.num, capacity: db.config.roomCapacity },
          players: [...room.clients.values()].filter(c => c !== me).map(pub),
          plots: room.plots, incense: room.incense, altar: db.config.altar,
          templeName: db.config.templeName, shopUrl: db.config.shopUrl,
          profile: profileOf(pid), pid, rooms: roomList(), serverTime: Date.now(), regrowSec: db.config.plotRegrowSec,
          leaves: room.leaves, leafRegrowSec: db.config.leafRegrowSec, tug: tugState(room),
          prices: { fortune: db.config.fortuneCost, shout: db.config.shoutCost, sweep: db.config.sweepReward, bellReward: db.config.bellReward, bellPenalty: db.config.bellPenalty, chant: db.config.chantReward },
          weather: weatherOut()
        });
        broadcast(room, { t: 'join', p: pub(me) }, me);
        broadcastRoomInfo();
        break;
      }
      case 'move': {
        const x = +m.x, y = +m.y;
        if (!isFinite(x) || !isFinite(y)) return;
        me.x = Math.max(0, Math.min(LAYOUT.W, x)); me.y = Math.max(0, Math.min(LAYOUT.H, y));
        me.dir = m.dir === -1 ? -1 : 1; me.moving = !!m.moving;
        me.dirtyMove = true;
        if (me.moving && me.pose) { me.pose = ''; me.chant = null; broadcast(room, { t: 'pose', id: me.id, pose: '' }); }
        break;
      }
      case 'emote': {
        if (Date.now() - me.lastEmote < 800) return;
        me.lastEmote = Date.now();
        const e = ['pray', 'bow', 'heart', 'wave', 'zen'].includes(m.e) ? m.e : 'pray';
        broadcast(room, { t: 'emote', id: me.id, e });
        break;
      }
      case 'incense': {
        const now = Date.now();
        if (now - me.lastIncense < db.config.incenseCooldownSec * 1000) return ws.send({ t: 'toast', msg: 'Nhang vừa thắp, hãy tĩnh tâm một chút rồi thắp tiếp nhé 🙏' });
        // Lư hương ngoài sân = thắp chung cho tất cả tổ; trong chánh điện = thắp riêng từng bài vị
        const atBowl = dist(me, LAYOUT.bowl) <= LAYOUT.bowl.radius + 60, atAltar = dist(me, LAYOUT.altar) <= LAYOUT.altar.radius + 60;
        if (!atBowl && !atAltar) return;
        const ALL = { id: 'all', name: 'Chư vị Tổ Nghiệp' };
        const app = atBowl && !atAltar ? ALL : (db.config.altar.find(a => a.id === m.app) || (m.app === 'all' && atBowl ? ALL : db.config.altar[0]));
        if (!RULES.useStamina(db.players[me.pid], RULES.COST.incense, now)) return tired();
        me.lastIncense = now;
        const stick = { id: crypto.randomBytes(4).toString('hex'), by: me.name, app: app.id, appName: app.name, wish: clean(m.wish, 70), t: now, slot: Math.floor(Math.random() * 1000) };
        room.incense.push(stick);
        if (room.incense.length > 90) room.incense.shift();
        const p = db.players[me.pid]; p.phuoc += 3; p.incense++;
        bump('incense');
        { const d = today(); d.apps = d.apps || {}; d.apps[app.id] = (d.apps[app.id] || 0) + 1; db.totals.apps = db.totals.apps || {}; db.totals.apps[app.id] = (db.totals.apps[app.id] || 0) + 1; }
        broadcast(room, { t: 'incense', stick, by: me.id });
        ws.send({ t: 'profile', profile: profileOf(me.pid), msg: app.id === 'all' ? '+3 phước · Chư vị Tổ Nghiệp đã chứng giám 🙏' : `+3 phước · Tổ ${app.name} đã chứng giám` });
        break;
      }
      case 'bell': return;                 // bản cũ: thay bằng minigame thỉnh chuông
      case 'bellStart': {
        const now = Date.now(), p = db.players[me.pid], d = dd(p);
        if (dist(me, LAYOUT.bell) > LAYOUT.bell.radius + 60) return;
        if (now - me.lastBell < 2500) return;
        if (d.bell >= db.config.bellPerDay) return ws.send({ t: 'bellNo', msg: `Hôm nay bạn đã thỉnh đủ ${db.config.bellPerDay} hồi chuông rồi. Mai quay lại nhé 🔔` });
        if (!RULES.useStamina(p, RULES.COST.bell, now)) return tired();
        d.bell++; me.lastBell = now;
        const period = RULES.BELL.period(d.bellHits);
        me.bell = { t0: now + RULES.BELL.countdown, period };
        ws.send({ t: 'bellGo', countdown: RULES.BELL.countdown, period, zone: RULES.BELL.zone, left: db.config.bellPerDay - d.bell, profile: profileOf(me.pid) });
        saveSoon();
        break;
      }
      case 'bellHit': {
        const b = me.bell; if (!b) return; me.bell = null;
        const now = Date.now(), p = db.players[me.pid], d = dd(p);
        const srv = now - b.t0, e = +m.e;
        // e = thời điểm người chơi bấm (tính từ lúc kim chạy, phía máy khách). Chấp nhận độ trễ mạng hợp lý.
        const ok = isFinite(e) && e >= 0 && e <= srv + 60 && e >= srv - 900 && srv < RULES.BELL.maxMs;
        const pos = ok ? RULES.bellPos(e, b.period) : 0;
        const hit = ok && Math.abs(pos - .5) <= RULES.BELL.zone / 2;
        bump('bells');
        if (hit) {
          d.bellHits++; p.phuoc += db.config.bellReward; bump('bellHits');
          broadcast(room, { t: 'bell', by: me.name, id: me.id, halo: true });
          ws.send({ t: 'bellResult', hit: true, pos, gain: db.config.bellReward, profile: profileOf(me.pid) });
        } else {
          const loss = Math.min(p.phuoc, db.config.bellPenalty); p.phuoc -= loss;
          broadcast(room, { t: 'bellFart', id: me.id, by: me.name });
          ws.send({ t: 'bellResult', hit: false, pos, loss, profile: profileOf(me.pid) });
        }
        saveSoon();
        break;
      }
      case 'chantStart': {
        const kind = m.kind === 'beads' ? 'beads' : 'mo';
        const c = LAYOUT.cushions.find(c => Math.hypot(me.x - c.x, me.y - c.y) < LAYOUT.cushionRadius + 40);
        if (!c) return;
        const p = db.players[me.pid], d = dd(p);
        if (d[kind] >= RULES.CHANT[kind].perDay) return ws.send({ t: 'toast', msg: kind === 'mo' ? 'Hôm nay gõ mõ đủ rồi, để mõ nghỉ chút nhé 🪵' : 'Hôm nay lần tràng hạt đủ rồi 📿' });
        me.chant = { kind, t: Date.now() }; me.pose = 'sit'; me.x = c.x; me.y = c.y; me.dirtyMove = true;
        broadcast(room, { t: 'pose', id: me.id, pose: 'sit', x: c.x, y: c.y });
        break;
      }
      case 'chantEnd': {
        const ch = me.chant; me.chant = null;
        if (me.pose) { me.pose = ''; broadcast(room, { t: 'pose', id: me.id, pose: '' }); }
        if (!ch || !m.done) return;
        const now = Date.now(), p = db.players[me.pid], d = dd(p), R = RULES.CHANT[ch.kind];
        const n = m.n | 0;
        if (now - ch.t < R.minMs || n < R.every || d[ch.kind] >= R.perDay) return ws.send({ t: 'toast', msg: 'Tâm chưa tĩnh, lượt này chưa được tính 🙏' });
        if (!RULES.useStamina(p, RULES.COST.chant, now)) return tired();
        d[ch.kind]++; p.phuoc += db.config.chantReward; bump('chants');
        broadcast(room, { t: 'emote', id: me.id, e: 'zen' });
        ws.send({ t: 'profile', profile: profileOf(me.pid), msg: (ch.kind === 'mo' ? 'Tụng xong một thời kinh' : 'Lần trọn một chuỗi tràng hạt') + ` · +${db.config.chantReward} phước 🪷` });
        saveSoon();
        break;
      }
      case 'dig': {
        const plotDef = LAYOUT.plots[m.plot | 0];
        const pl = room.plots[m.plot | 0];
        if (!plotDef || !pl) return;
        if (dist(me, plotDef) > LAYOUT.plotRadius + 60) return ws.send({ t: 'toast', msg: 'Lại gần luống rau hơn chút nữa nhé' });
        if (pl.state !== 'ripe') return ws.send({ t: 'toast', msg: 'Luống này vừa được đào, chờ rau mọc lại nhé 🌱' });
        const p = db.players[me.pid];
        const dk = dayKey();
        if (p.digDay !== dk) { p.digDay = dk; p.digsToday = 0; }
        const ipKey = 'ip:' + me.ip + ':' + dk;
        ipDigs[ipKey] = ipDigs[ipKey] || 0;
        if (p.digsToday >= db.config.digsPerDay || ipDigs[ipKey] >= db.config.digsPerDay * 3) {
          return ws.send({ t: 'digResult', ok: false, reason: 'limit', profile: profileOf(me.pid) });
        }
        if (!RULES.useStamina(p, RULES.COST.dig, Date.now())) return tired();
        p.digsToday++; ipDigs[ipKey]++; p.digs++; p.phuoc += 1;
        bump('digs');
        pl.state = 'dug'; pl.regrowAt = Date.now() + db.config.plotRegrowSec * 1000;
        broadcast(room, { t: 'plot', plot: pl, by: me.id });
        const v = rollVoucher(me.pid);
        if (v) {
          const award = giveVoucher(v, me.pid, me.name, room.name);
          ws.send({ t: 'digResult', ok: true, win: true, award: { title: award.title, code: award.code, link: award.link, description: award.description }, profile: profileOf(me.pid) });
          broadcast(room, { t: 'feed', msg: `🎉 ${me.name} vừa đào trúng ${award.title}!` });
        } else {
          p.rau++;
          ws.send({ t: 'digResult', ok: true, win: false, profile: profileOf(me.pid) });
        }
        save();
        break;
      }
      case 'sweep': case 'fortune': case 'say': case 'buy': case 'equip': case 'haircut': case 'eat':
      case 'tugOffer': case 'tugCancel': case 'tugAccept': case 'tug': case 'fortuneAccept': return extra(m);
      case 'feed': {
        const a = LAYOUT.animals.find(x => x.id === m.animal);
        if (!a) return;
        const r = a.id === 'fish' ? LAYOUT.fishRadius : LAYOUT.animalRadius;
        if (Math.hypot(me.x - (+m.ax || a.x), me.y - (+m.ay || a.y)) > r + 60 || dist(me, a) > 420) return;
        const p = db.players[me.pid];
        if (p.rau <= 0) return ws.send({ t: 'toast', msg: 'Bạn chưa có bó rau nào — ra vườn đào đất nhé 🥬' });
        if (!RULES.useStamina(p, RULES.COST.feed, Date.now())) return tired();
        p.rau--; p.phuoc += 5; p.feeds++;
        bump('feeds');
        broadcast(room, { t: 'fed', animal: a.id, by: me.id, name: me.name });
        ws.send({ t: 'profile', profile: profileOf(me.pid), msg: `${a.name} ăn ngon lành · +5 phước 🍀` });
        break;
      }
    }
  };
  function tired() { ws.send({ t: 'tired', profile: profileOf(me.pid) }); }
  function look() { const acc = accOf(me.pid); me.color = acc.color; me.hat = acc.hat; me.hair = acc.hair; broadcast(room, { t: 'look', id: me.id, color: me.color, hat: me.hat, hair: me.hair }); saveSoon(); }
  const near = (pt, r) => Math.hypot(me.x - pt.x, me.y - pt.y) < r;
  const M = LAYOUT.market;
  const inTug = () => Math.abs(me.x - M.tug.x) < M.tug.w / 2 + 80 && Math.abs(me.y - M.tug.y) < M.tug.h / 2 + 80;
  const extra = m => {
    const p = db.players[me.pid], now = Date.now(), acc = accOf(me.pid);
    switch (m.t) {
      case 'sweep': {
        const def = LAYOUT.leaves[m.leaf | 0], lf = room.leaves[m.leaf | 0];
        if (!def || !lf || !near(def, LAYOUT.leafRadius + 70)) return;
        if (lf.state !== 'full') return ws.send({ t: 'toast', msg: 'Ụ lá này vừa được quét rồi 🍂' });
        if (!RULES.useStamina(p, RULES.COST.sweep, now)) return tired();
        lf.state = 'swept'; lf.regrowAt = now + db.config.leafRegrowSec * 1000;
        p.phuoc += db.config.sweepReward; bump('sweeps');
        broadcast(room, { t: 'leaf', leaf: lf, by: me.id });
        return ws.send({ t: 'profile', profile: profileOf(me.pid), msg: `Quét sạch lá đa · +${db.config.sweepReward} phước 🍃` });
      }
      case 'fortune': {
        if (!near(M.fortune, 320)) return;
        const d = dd(p);
        if (d.acc) return ws.send({ t: 'toast', msg: `Hôm nay bạn đã đón nhận quẻ số ${d.acc.no} rồi 🙏` });
        if (d.fq.length >= db.config.fortunePerDay) return ws.send({ t: 'fortunePick', profile: profileOf(me.pid) });
        if (p.phuoc < db.config.fortuneCost) return ws.send({ t: 'toast', msg: `Xin quẻ cần ${db.config.fortuneCost} phước. Đi quét lá đa hay thắp hương tích thêm nhé.` });
        if (!RULES.useStamina(p, RULES.COST.fortune, now)) return tired();
        const list = (db.config.fortunes || []).filter(Boolean); if (!list.length) return ws.send({ t: 'toast', msg: 'Ống xăm đang trống, nhờ admin bổ sung quẻ nhé.' });
        p.phuoc -= db.config.fortuneCost; bump('fortunes');
        let i = Math.floor(Math.random() * list.length);
        for (let k = 0; k < 6 && d.fq.includes(i) && list.length > d.fq.length; k++) i = Math.floor(Math.random() * list.length);
        d.fq.push(i); saveSoon();
        broadcast(room, { t: 'emote', id: me.id, e: 'pray' });
        return ws.send({ t: 'fortune', no: i + 1, text: list[i], profile: profileOf(me.pid) });
      }
      case 'fortuneAccept': {
        const d = dd(p), i = (m.no | 0) - 1;
        if (d.acc || !d.fq.includes(i)) return;
        d.acc = { no: i + 1, text: (db.config.fortunes || [])[i] || '' }; saveSoon();
        broadcast(room, { t: 'feed', msg: `🙏 ${me.name} đã đón nhận quẻ số ${i + 1} cho hôm nay` });
        return ws.send({ t: 'profile', profile: profileOf(me.pid), msg: `Đã đón nhận quẻ số ${i + 1} · áp dụng cả ngày hôm nay 🏮` });
      }
      case 'say': {
        if (!near(M.shout, M.shout.r + 60)) return ws.send({ t: 'toast', msg: 'Chỉ được khẩu nghiệp trong Bãi Khẩu Nghiệp thôi nhé 🤫' });
        if (now - me.lastSay < 2500) return ws.send({ t: 'toast', msg: 'Từ từ thôi, để còn lấy hơi 😮‍💨' });
        const text = RULES.filterText(m.text, db.config.bannedWords); if (!text) return;
        if (p.phuoc < db.config.shoutCost) return ws.send({ t: 'toast', msg: 'Hết phước để khẩu nghiệp rồi 😅' });
        if (!RULES.useStamina(p, RULES.COST.shout, now)) return tired();
        me.lastSay = now; p.phuoc -= db.config.shoutCost; bump('shouts');
        broadcast(room, { t: 'say', id: me.id, text });
        return ws.send({ t: 'profile', profile: profileOf(me.pid) });
      }
      case 'buy': case 'equip': {
        const list = m.kind === 'hat' ? RULES.HATS : m.kind === 'color' ? RULES.COLORS : null; if (!list) return;
        const it = list.find(x => x.id === m.id); if (!it) return;
        const owned = acc.items[m.kind === 'hat' ? 'hats' : 'colors'];
        let bought = false;
        if (!owned.includes(it.id)) {
          if (m.t === 'equip') return;
          bought = true;
          if (!near(m.kind === 'hat' ? M.hat : M.cloth, 320)) return;
          if (p.phuoc < it.price) return ws.send({ t: 'toast', msg: `Cần ${it.price} phước để mua ${it.name}.` });
          p.phuoc -= it.price; owned.push(it.id); bump('purchases');
        }
        if (m.kind === 'hat') { acc.hat = it.id; } else acc.color = it.id;
        look();
        return ws.send({ t: 'profile', profile: profileOf(me.pid), msg: bought ? `Đã mua ${it.name} · -${it.price} phước ✨` : `Đã thay ${it.name}` });
      }
      case 'haircut': {
        const h = RULES.HAIRS.find(x => x.id === m.id); if (!h || !near(M.barber, 300)) return;
        if (p.phuoc < h.price) return ws.send({ t: 'toast', msg: `Cắt kiểu này cần ${h.price} phước.` });
        p.phuoc -= h.price; acc.hair = h.id; if (h.id === 'bald') acc.hat = 'none'; bump('purchases');
        look();
        return ws.send({ t: 'profile', profile: profileOf(me.pid), msg: h.id === 'bald' ? 'Xoẹt xoẹt… đầu trọc bóng loáng 🪒' : `Đã cắt kiểu ${h.name} ✂️` });
      }
      case 'eat': {
        const f = RULES.FOODS.find(x => x.id === m.id); if (!f || !near(M.food, 360)) return;
        const st = RULES.stamina(p, now);
        if (st >= RULES.STAMINA_MAX) return ws.send({ t: 'toast', msg: 'Bụng no căng rồi, đi chơi tiếp thôi!' });
        if (p.phuoc < f.price) return ws.send({ t: 'toast', msg: `Món này ${f.price} phước, bạn chưa đủ.` });
        p.phuoc -= f.price; p.st = Math.min(RULES.STAMINA_MAX, st + f.st); bump('meals');
        broadcast(room, { t: 'emote', id: me.id, e: 'heart' });
        return ws.send({ t: 'profile', profile: profileOf(me.pid), msg: `${f.icon} ${f.name} ngon quá · +${f.st} sinh lực` });
      }
      case 'tugOffer': {
        const bet = +m.bet; if (!RULES.TUG_BETS.includes(bet) || !inTug()) return;
        if (room.tug.match && [room.tug.match.a, room.tug.match.b].includes(me.id)) return;
        if (p.phuoc < bet) return ws.send({ t: 'toast', msg: `Cược ${bet} phước mà bạn chưa đủ phước.` });
        if (RULES.stamina(p, now) < RULES.COST.tug) return tired();
        room.tug.offers.set(me.id, { id: me.id, name: me.name, bet, t: now });
        broadcast(room, { t: 'tugState', tug: tugState(room) });
        return broadcast(room, { t: 'feed', msg: `🪢 ${me.name} thách kéo co, cược ${bet} phước!` }, me);
      }
      case 'tugCancel': room.tug.offers.delete(me.id); return broadcast(room, { t: 'tugState', tug: tugState(room) });
      case 'tugAccept': {
        const o = room.tug.offers.get(m.id), opp = o && room.clients.get(o.id);
        if (!o || !opp || o.id === me.id || !inTug()) return ws.send({ t: 'toast', msg: 'Kèo này không còn nữa.' });
        if (room.tug.match) return ws.send({ t: 'toast', msg: 'Sân đang có trận, chờ chút nhé.' });
        const po = db.players[opp.pid];
        if (p.phuoc < o.bet) return ws.send({ t: 'toast', msg: `Cần ${o.bet} phước để nhận kèo.` });
        if (po.phuoc < o.bet) { room.tug.offers.delete(o.id); broadcast(room, { t: 'tugState', tug: tugState(room) }); return ws.send({ t: 'toast', msg: 'Đối thủ không còn đủ phước để cược.' }); }
        if (!RULES.useStamina(p, RULES.COST.tug, now)) return tired();
        RULES.useStamina(po, RULES.COST.tug, now);
        p.phuoc -= o.bet; po.phuoc -= o.bet;
        room.tug.offers.delete(o.id); room.tug.offers.delete(me.id);
        const start = now + RULES.TUG.countdown;
        room.tug.match = { a: o.id, b: me.id, aName: o.name, bName: me.name, bet: o.bet, pos: 0, last: {}, ca: 0, cb: 0, startAt: start, endAt: start + RULES.TUG.ms, sent: -1 };
        bump('tugs');
        broadcast(room, { t: 'tugState', tug: tugState(room), serverTime: now });
        opp.ws.send({ t: 'profile', profile: profileOf(opp.pid) }); ws.send({ t: 'profile', profile: profileOf(me.pid) });
        return;
      }
      case 'tug': {
        const mt = room.tug.match; if (!mt || (mt.a !== me.id && mt.b !== me.id)) return;
        // Công bằng: chấp nhận lệch đồng hồ/độ trễ mạng như nhau cho cả hai bên (sớm 150ms, trễ 300ms)
        if (now < mt.startAt - 150 || now > mt.endAt + RULES.TUG.grace) return;
        if (now - (mt.last[me.id] || 0) < RULES.TUG.minGap) return;      // giới hạn chung ~14 lần/giây cho cả hai
        mt.last[me.id] = now; mt.pos += mt.a === me.id ? -1 : 1;
        if (mt.a === me.id) mt.ca++; else mt.cb++;
        if (Math.abs(mt.pos) >= RULES.TUG.win) endTug(room, mt.pos < 0 ? mt.a : mt.b);
        return;
      }
    }
  };
  ws.onclose = () => {
    clearTimeout(helloTimer);
    if (me && room) {
      room.tug.offers.delete(me.id);
      const mt = room.tug.match; if (mt && (mt.a === me.id || mt.b === me.id)) endTug(room, mt.a === me.id ? mt.b : mt.a, true);
      else broadcast(room, { t: 'tugState', tug: tugState(room) });
      room.clients.delete(me.id);
      db.players[me.pid].lastSeen = Date.now(); save();
      broadcast(room, { t: 'leave', id: me.id });
      broadcastRoomInfo();
    }
  };
}
/* ---------- Kéo co ---------- */
function tugState(room) {
  const mt = room.tug.match;
  return { offers: [...room.tug.offers.values()].map(o => ({ id: o.id, name: o.name, bet: o.bet })), match: mt ? { a: mt.a, b: mt.b, aName: mt.aName, bName: mt.bName, bet: mt.bet, pos: mt.pos, startAt: mt.startAt, endAt: mt.endAt } : null };
}
function endTug(room, winnerId, forfeit) {
  const mt = room.tug.match; if (!mt) return;
  room.tug.match = null;
  const ca = room.clients.get(mt.a), cb = room.clients.get(mt.b);
  const pidOf = id => (id === mt.a ? ca : cb) && (id === mt.a ? ca : cb).pid;
  if (winnerId) { const pw = db.players[pidOf(winnerId)]; if (pw) pw.phuoc += mt.bet * 2; }
  else { for (const c of [ca, cb]) if (c) db.players[c.pid].phuoc += mt.bet; }
  const wName = winnerId === mt.a ? mt.aName : winnerId === mt.b ? mt.bName : '', lName = winnerId === mt.a ? mt.bName : winnerId === mt.b ? mt.aName : '';
  broadcast(room, { t: 'tugEnd', winner: winnerId || null, wName, lName, bet: mt.bet, forfeit: !!forfeit, pos: mt.pos, ca: mt.ca, cb: mt.cb, a: mt.a, b: mt.b });
  for (const c of [ca, cb]) if (c) c.ws.send({ t: 'profile', profile: profileOf(c.pid) });
  broadcast(room, { t: 'tugState', tug: tugState(room) });
  saveSoon();
}
setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) {
    const mt = r.tug.match; if (!mt) continue;
    if (mt.sent !== mt.pos) { mt.sent = mt.pos; broadcast(r, { t: 'tugPos', pos: mt.pos, ca: mt.ca, cb: mt.cb }); }
    if (now > mt.endAt + RULES.TUG.grace) endTug(r, mt.pos < 0 ? mt.a : mt.pos > 0 ? mt.b : null);
  }
}, 70);
/* ----------------------------- Thời tiết thật (Open-Meteo) ----------------------------- */
const https = require('https');
let wx = { kind: 'clear', temp: null, code: 0, at: 0, source: 'mặc định' };
function weatherOut() {
  const c = db.config, city = RULES.CITIES.find(x => x.id === c.weatherCity) || RULES.CITIES[0];
  const kind = c.weatherMode === 'manual' ? c.weatherManual : wx.kind;
  return { kind, temp: c.weatherMode === 'manual' ? null : wx.temp, city: city.name, cityId: city.id, mode: c.weatherMode, at: wx.at, source: c.weatherMode === 'manual' ? 'admin chọn' : wx.source };
}
let lastWxSent = '';
function pushWeather() {
  const w = weatherOut(), key = w.kind + '|' + w.city + '|' + w.temp;
  if (key === lastWxSent) return; lastWxSent = key;
  for (const r of rooms.values()) broadcast(r, { t: 'weather', w });
}
function refreshWeather(force) {
  const c = db.config;
  if (c.weatherMode === 'manual') return pushWeather();
  const city = RULES.CITIES.find(x => x.id === c.weatherCity) || RULES.CITIES[0];
  if (!force && wx.cityId === city.id && Date.now() - wx.at < 15 * 60e3) return pushWeather();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=weather_code,temperature_2m&timezone=Asia%2FBangkok`;
  const req = https.get(url, { timeout: 8000 }, res => {
    let body = ''; res.on('data', c => { if (body.length < 20000) body += c; });
    res.on('end', () => {
      try {
        const j = JSON.parse(body), cur = j.current || {};
        const code = cur.weather_code | 0, temp = typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null;
        wx = { kind: RULES.weatherKind(code, temp), temp, code, at: Date.now(), source: 'Open-Meteo', cityId: city.id };
      } catch (e) { console.warn('[thời tiết] không đọc được dữ liệu', e.message); }
      pushWeather();
    });
  });
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.on('error', e => { console.warn('[thời tiết] lỗi lấy dự báo:', e.message); pushWeather(); });
}
setTimeout(() => refreshWeather(true), 1500);
setInterval(() => refreshWeather(false), 15 * 60e3);

const ipDigs = {};
setInterval(() => { const dk = dayKey(); for (const k in ipDigs) if (!k.endsWith(dk)) delete ipDigs[k]; }, 3600e3);

const pub = c => ({ id: c.id, name: c.name, color: c.color, hat: c.hat, hair: c.hair, x: Math.round(c.x), y: Math.round(c.y), dir: c.dir, moving: c.moving, pose: c.pose || '' });
const roomList = () => [...rooms.values()].sort((a, b) => a.num - b.num).map(r => ({ id: r.id, name: r.name, num: r.num, online: r.clients.size, capacity: db.config.roomCapacity }));
function broadcastRoomInfo() {
  const info = { t: 'rooms', rooms: roomList() };
  for (const r of rooms.values()) broadcast(r, info);
}

// Đồng bộ vị trí 12 lần/giây
setInterval(() => {
  for (const r of rooms.values()) {
    const moved = [];
    for (const c of r.clients.values()) if (c.dirtyMove) { c.dirtyMove = false; moved.push([c.id, Math.round(c.x), Math.round(c.y), c.dir, c.moving ? 1 : 0]); }
    if (moved.length) broadcast(r, { t: 's', p: moved });
  }
}, 83);

/* ----------------------------- HTTP & Admin API ----------------------------- */
/* Phiên admin: lưu bền vững (Redis/file) nên không mất khi server ngủ dậy hay deploy lại.
 * Chỉ lưu mã băm của token; đổi ADMIN_PASSWORD thì mọi phiên cũ tự hết hiệu lực. */
const ADMIN_TTL = 30 * 86400e3;                                           // 30 ngày, tự gia hạn khi dùng
const sha = x => crypto.createHash('sha256').update(String(x)).digest('hex');
const PW_FP = sha('pw:' + ADMIN_PASSWORD).slice(0, 16);
const adminKey = req => sha((req.headers.authorization || '').replace('Bearer ', ''));
function isAdmin(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', ''); if (t.length < 20) return false;
  const k = sha(t), s = db.adminSessions[k];
  if (!s || s.exp < Date.now() || s.pw !== PW_FP) { if (s) { delete db.adminSessions[k]; save(); } return false; }
  if (s.exp - Date.now() < ADMIN_TTL - 86400e3) { s.exp = Date.now() + ADMIN_TTL; save(); }   // gia hạn tối đa 1 lần/ngày
  return true;
}
function readBody(req, max = 6e6) {
  return new Promise(resolve => {
    let data = '';
    req.on('close', () => resolve({}));
    req.on('data', c => { data += c; if (data.length > max) { data = ''; req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
  });
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

function voucherOut(v) { return Object.assign({}, v, { remaining: remainingOf(v), codesCount: v.codes ? v.codes.length : 0, codes: undefined }); }

function statsPayload() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const k = new Date(Date.now() + 7 * 3600e3 - i * 86400e3).toISOString().slice(0, 10);
    const d = db.daily[k] || { visits: 0, u: {}, newPlayers: 0, incense: 0, digs: 0, wins: 0, feeds: 0, bells: 0, peak: 0 };
    days.push({ day: k, fortunes: d.fortunes || 0, shouts: d.shouts || 0, tugs: d.tugs || 0, sweeps: d.sweeps || 0, meals: d.meals || 0, purchases: d.purchases || 0, registers: d.registers || 0, logins: d.logins || 0, visits: d.visits, uniques: Object.keys(d.u).length, newPlayers: d.newPlayers, incense: d.incense, digs: d.digs, wins: d.wins, feeds: d.feeds, bells: d.bells, bellHits: d.bellHits || 0, chants: d.chants || 0, apps: d.apps || {}, peak: d.peak });
  }
  const hours = [];
  for (let i = 23; i >= 0; i--) {
    const k = new Date(Date.now() + 7 * 3600e3 - i * 3600e3).toISOString().slice(0, 13);
    const h = db.hourly[k] || { visits: 0, peak: 0 };
    hours.push({ hour: k.slice(11) + 'h', visits: h.visits, peak: h.peak });
  }
  const totalRate = db.vouchers.filter(v => v.active && remainingOf(v) > 0).reduce((s, v) => s + (Number(v.rate) || 0), 0);
  return {
    online: totalOnline(), rooms: roomList(), capacity: db.config.roomCapacity,
    today: days[days.length - 1], days, hours, totals: db.totals,
    players: Object.keys(db.players).length, accounts: Object.keys(db.accounts).length, totalRate, adminPwDefault: ADMIN_PW_DEFAULT, adminPwWeak: ADMIN_PW_WEAK, storage: USE_REDIS ? 'redis' : 'file',
    weather: weatherOut(), cities: RULES.CITIES.map(c => ({ id: c.id, name: c.name })), weatherKinds: RULES.WEATHER, altarNames: Object.fromEntries([['all', 'Thắp chung (lư hương sân)'], ...db.config.altar.map(a => [a.id, a.name])]),
    lastWins: db.awards.slice(-8).reverse().map(a => ({ name: a.name, title: a.title, code: a.code, time: a.time, room: a.room }))
  };
}

const server = http.createServer(async (req, res) => {
  secHeaders(req, res);
  let url; try { url = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400); return res.end(); }
  const p = url.pathname;

  if (p.startsWith('/api/')) {
    if (p.startsWith('/api/auth/') && req.method === 'POST') return handleAuth(p, req, res, clientIp(req));
    if (p === '/api/public/info') {
      return json(res, 200, { online: totalOnline(), rooms: roomList(), templeName: db.config.templeName, fartFile: fs.existsSync(path.join(__dirname, 'public', 'sounds', 'fart.mp3')), recent: db.awards.slice(-6).reverse().map(a => ({ name: a.name.slice(0, 2) + '***', title: a.title })) });
    }
    if (p === '/api/admin/login' && req.method === 'POST') {
      const ip = clientIp(req);
      if (peek('adminfail:' + ip, 15 * 60e3) >= 5) return json(res, 429, { error: 'Sai mật khẩu quá 5 lần. Thử lại sau 15 phút.' });
      if (peek('adminfail:all', 60 * 60e3) >= 40) return json(res, 429, { error: 'Trang quản trị đang tạm khoá do có nhiều lần đăng nhập sai. Thử lại sau ít phút.' });
      const b = await readBody(req, 2000);
      const dg = x => crypto.createHash('sha256').update(String(x || '')).digest();
      if (!crypto.timingSafeEqual(dg(b.password), dg(ADMIN_PASSWORD))) {
        hit('adminfail:' + ip, 1e9, 15 * 60e3); hit('adminfail:all', 1e9, 60 * 60e3);
        console.warn('[bảo mật] đăng nhập admin sai từ', ip);
        return json(res, 401, { error: 'Sai mật khẩu' });
      }
      limits.delete('adminfail:' + ip);
      for (const k in db.adminSessions) if (db.adminSessions[k].exp < Date.now() || db.adminSessions[k].pw !== PW_FP) delete db.adminSessions[k];
      const t = crypto.randomBytes(24).toString('hex');
      db.adminSessions[sha(t)] = { exp: Date.now() + ADMIN_TTL, pw: PW_FP, ip, at: Date.now() }; saveSoon();
      console.log('[bảo mật] admin đăng nhập từ', ip);
      return json(res, 200, { token: t });
    }
    if (p === '/api/admin/logout' && req.method === 'POST') { delete db.adminSessions[adminKey(req)]; saveSoon(); return json(res, 200, { ok: true }); }
    if (!isAdmin(req)) return json(res, 401, { error: 'Chưa đăng nhập' });
    if (req.method !== 'GET') res.on('finish', saveSoon);   // thay đổi từ admin được lưu ngay

    if (p === '/api/admin/stats') return json(res, 200, Object.assign(statsPayload(), { yourIp: clientIp(req), ipSource: ipSource(req) }));
    if (p === '/api/admin/config' && req.method === 'GET') return json(res, 200, db.config);
    if (p === '/api/admin/config' && req.method === 'POST') {
      const b = await readBody(req);
      const c = db.config;
      if (b.roomCapacity) c.roomCapacity = Math.max(1, Math.min(500, b.roomCapacity | 0));
      if (b.maxAccountsPerIpPerDay) c.maxAccountsPerIpPerDay = Math.max(1, Math.min(1000, b.maxAccountsPerIpPerDay | 0));
      for (const [k, lo, hi] of [['startPhuoc', 0, 10000], ['fortuneCost', 0, 1000], ['shoutCost', 0, 1000], ['sweepReward', 0, 1000], ['leafRegrowSec', 5, 86400], ['fortunePerDay', 1, 20], ['bellPerDay', 0, 100], ['bellReward', 0, 1000], ['bellPenalty', 0, 1000], ['chantReward', 0, 1000]]) if (b[k] !== undefined && b[k] !== '') c[k] = Math.max(lo, Math.min(hi, b[k] | 0));
      if (b.fortunes !== undefined) { const list = (Array.isArray(b.fortunes) ? b.fortunes : String(b.fortunes).split('\n')).map(x => clean(x, 300)).filter(Boolean).slice(0, 500); if (list.length) c.fortunes = list; }
      if (b.bannedWords !== undefined) c.bannedWords = (Array.isArray(b.bannedWords) ? b.bannedWords : String(b.bannedWords).split(/[\n,]/)).map(x => clean(x, 40).toLowerCase()).filter(Boolean).slice(0, 500);
      if (b.digsPerDay !== undefined) c.digsPerDay = Math.max(0, Math.min(100, b.digsPerDay | 0));
      if (b.plotRegrowSec) c.plotRegrowSec = Math.max(5, Math.min(86400, b.plotRegrowSec | 0));
      if (b.incenseCooldownSec !== undefined) c.incenseCooldownSec = Math.max(0, Math.min(3600, b.incenseCooldownSec | 0));
      if (b.weatherMode) c.weatherMode = b.weatherMode === 'manual' ? 'manual' : 'auto';
      if (b.weatherCity && RULES.CITIES.some(x => x.id === b.weatherCity)) c.weatherCity = b.weatherCity;
      if (b.weatherManual && RULES.WEATHER[b.weatherManual]) c.weatherManual = b.weatherManual;
      if (b.weatherMode || b.weatherCity || b.weatherManual) setTimeout(() => refreshWeather(true), 10);
      if (b.shopUrl) c.shopUrl = clean(b.shopUrl, 300);
      if (b.templeName) c.templeName = clean(b.templeName, 60);
      if (Array.isArray(b.altar)) c.altar = b.altar.slice(0, 14).map((a, i) => ({ id: clean(a.id, 12) || 'app' + i, name: clean(a.name, 24), short: clean(a.short, 3), color: /^#[0-9a-fA-F]{3,8}$/.test(a.color) ? a.color : '#cccccc', image: /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(a.image || '') && a.image.length < 400000 ? a.image : clean(a.image, 500) }));
      save();
      return json(res, 200, c);
    }
    if (p === '/api/admin/vouchers' && req.method === 'GET') return json(res, 200, db.vouchers.map(voucherOut));
    if (p === '/api/admin/vouchers' && req.method === 'POST') {
      const b = await readBody(req);
      const codes = String(b.codes || '').split(/[\s,;]+/).map(s => clean(s, 40)).filter(Boolean);
      const v = {
        id: crypto.randomUUID(), title: clean(b.title, 60) || 'Voucher PikLab', description: clean(b.description, 200),
        link: clean(b.link, 300), rate: Math.max(0, Math.min(100, Number(b.rate) || 0)),
        sharedCode: codes.length ? '' : clean(b.sharedCode, 40), quantity: Math.max(0, b.quantity | 0),
        codes: [...new Set(codes)], given: 0, active: b.active !== false, onePerPlayer: b.onePerPlayer !== false, createdAt: Date.now()
      };
      if (!v.codes.length && !v.sharedCode) return json(res, 400, { error: 'Cần nhập mã chung hoặc danh sách mã' });
      db.vouchers.push(v); save();
      return json(res, 200, voucherOut(v));
    }
    let mm;
    if ((mm = p.match(/^\/api\/admin\/vouchers\/([\w-]+)$/))) {
      const v = db.vouchers.find(x => x.id === mm[1]);
      if (!v) return json(res, 404, { error: 'Không tìm thấy' });
      if (req.method === 'DELETE') { db.vouchers = db.vouchers.filter(x => x !== v); save(); return json(res, 200, { ok: true }); }
      const b = await readBody(req);
      if (b.rate !== undefined) v.rate = Math.max(0, Math.min(100, Number(b.rate) || 0));
      if (b.active !== undefined) v.active = !!b.active;
      if (b.onePerPlayer !== undefined) v.onePerPlayer = !!b.onePerPlayer;
      if (b.title) v.title = clean(b.title, 60);
      if (b.description !== undefined) v.description = clean(b.description, 200);
      if (b.link !== undefined) v.link = clean(b.link, 300);
      if (b.quantity !== undefined && !v.codes.length) v.quantity = Math.max(v.given, b.quantity | 0);
      if (b.addCodes) { const add = String(b.addCodes).split(/[\s,;]+/).map(s => clean(s, 40)).filter(Boolean); v.codes = [...new Set(v.codes.concat(add))]; }
      save();
      return json(res, 200, voucherOut(v));
    }
    if (p === '/api/admin/accounts') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const online = new Set(); for (const r of rooms.values()) for (const c of r.clients.values()) online.add(c.pid);
      const list = Object.values(db.accounts).filter(a => !q || a.email.includes(q) || a.name.toLowerCase().includes(q)).sort((a, b) => b.lastLogin - a.lastLogin).map(a => {
        const pl = db.players[a.pid] || {};
        return { email: a.email, name: a.name, pid: a.pid, createdAt: a.createdAt, lastLogin: a.lastLogin, ip: a.ip, lastIp: a.lastIp, banned: !!a.banned, logins: a.logins || 0, phuoc: pl.phuoc || 0, digs: pl.digs || 0, wins: (pl.wins || []).length, online: online.has(a.pid) };
      });
      if (url.searchParams.get('format') === 'csv') {
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="nguoi-choi.csv"' });
        const f = t => new Date(t + 7 * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
        const rows = [['Email', 'Pháp danh', 'Ngày tạo', 'Đăng nhập gần nhất', 'Số lần đăng nhập', 'Điểm phước', 'Lượt đào', 'Voucher đã trúng', 'IP tạo', 'Bị khoá']].concat(list.map(a => [a.email, a.name, f(a.createdAt), f(a.lastLogin), a.logins, a.phuoc, a.digs, a.wins, a.ip, a.banned ? 'Có' : '']));
        return res.end('\ufeff' + rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n'));
      }
      return json(res, 200, list.slice(0, 1000));
    }
    if ((mm = p.match(/^\/api\/admin\/accounts\/([\w-]+)$/)) && req.method === 'POST') {
      const acc = accountByPid(mm[1]); if (!acc) return json(res, 404, { error: 'Không tìm thấy' });
      const b = await readBody(req);
      if (b.password !== undefined) {
        if (String(b.password).length < 6) return json(res, 400, { error: 'Mật khẩu cần ít nhất 6 ký tự.' });
        acc.salt = crypto.randomBytes(16).toString('hex'); acc.hash = hashPw(b.password, acc.salt);
        for (const t in db.sessions) if (db.sessions[t].email === acc.email) delete db.sessions[t];
        limits.delete('lockmail:' + acc.email);
        kickPid(acc.pid, 'Mật khẩu tài khoản vừa được đổi, vui lòng đăng nhập lại.');
        save(); return json(res, 200, { ok: true });
      }
      acc.banned = !!b.banned;
      if (acc.banned) { kickPid(acc.pid, 'Tài khoản của bạn đã bị quản trị viên khoá. Liên hệ PikLab nếu có nhầm lẫn.', true); for (const t in db.sessions) if (db.sessions[t].email === acc.email) delete db.sessions[t]; }
      save();
      return json(res, 200, { ok: true, banned: acc.banned });
    }
    if (p === '/api/admin/awards') {
      if (url.searchParams.get('format') === 'csv') {
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="nguoi-trung-thuong.csv"' });
        const rows = [['Thời gian', 'Pháp danh', 'Email', 'Voucher', 'Mã', 'Chùa']].concat(db.awards.map(a => [new Date(a.time + 7 * 3600e3).toISOString().replace('T', ' ').slice(0, 19), a.name, (accountByPid(a.pid) || {}).email || '', a.title, a.code, a.room]));
        return res.end('﻿' + rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n'));
      }
      return json(res, 200, db.awards.slice(-500).reverse().map(a => Object.assign({}, a, { email: (accountByPid(a.pid) || {}).email || '' })));
    }
    return json(res, 404, { error: 'Not found' });
  }

  // File tĩnh
  let file = p === '/' ? '/index.html' : p === '/admin' ? '/admin.html' : p;
  file = path.normalize(path.join(PUBLIC, file));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Không tìm thấy'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

/* ---------- Bảo mật: giới hạn kết nối WebSocket ---------- */
const MAX_CONN_PER_IP = +process.env.MAX_CONN_PER_IP || 20, MAX_CONN_TOTAL = +process.env.MAX_CONN_TOTAL || 3000;
const connByIp = new Map(); let connTotal = 0;
function releaseConn(ip) { if (!connByIp.has(ip)) return; const n = connByIp.get(ip) - 1; if (n <= 0) connByIp.delete(ip); else connByIp.set(ip, n); connTotal = Math.max(0, connTotal - 1); }
server.on('upgrade', (req, socket) => {
  if (!req.url.startsWith('/ws')) return socket.destroy();
  const origin = req.headers.origin, host = req.headers.host;
  if (origin && host && !origin.endsWith('//' + host)) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); return socket.destroy(); }
  const ip = clientIp(req);
  if ((connByIp.get(ip) || 0) >= MAX_CONN_PER_IP || connTotal >= MAX_CONN_TOTAL) { socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n'); return socket.destroy(); }
  connByIp.set(ip, (connByIp.get(ip) || 0) + 1); connTotal++;
  let released = false; const rel = () => { if (!released) { released = true; releaseConn(ip); } };
  socket.on('close', rel);
  const ws = wsAccept(req, socket);
  if (ws) handleClient(ws, req); else rel();
});

(async () => {
  if (USE_REDIS) {
    try {
      const had = await loadFromRedis();
      console.log(had ? `💾  Đã tải dữ liệu từ Upstash Redis (${Object.keys(db.accounts).length} tài khoản)` : '💾  Upstash Redis đang trống — sẽ lưu dữ liệu hiện có lên Redis');
      if (!had) saveSoon();
    } catch (e) {
      console.error('❌  Không kết nối được Upstash Redis:', e.message);
      console.error('    Kiểm tra lại UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN. Server dừng để tránh ghi đè dữ liệu.');
      process.exit(1);
    }
  } else console.log(`💾  Lưu dữ liệu vào file ${DATA_FILE} (chưa cấu hình Upstash Redis)`);
  server.listen(PORT, () => {
    console.log(`🛕  ${db.config.templeName} đang mở cửa: http://localhost:${PORT}`);
    console.log(`🔐  Trang quản trị: http://localhost:${PORT}/admin  (mật khẩu: biến ADMIN_PASSWORD)`);
  });
})();
