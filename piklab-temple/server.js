/*
 * Chùa Tổ Nghiệp Designer — PikLab
 * Server Node.js thuần, không cần cài thư viện (npm install không bắt buộc).
 * Chạy:  node server.js     (mặc định cổng 3000)
 * Biến môi trường: PORT, ADMIN_PASSWORD, DATA_FILE
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const LAYOUT = require('./public/layout.js');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'piklab@2026';
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
      shopUrl: 'https://piklab.vn',
      templeName: 'Chùa Tổ Nghiệp Designer',
      altar: DEFAULT_ALTAR
    },
    vouchers: [],
    awards: [],
    players: {},
    daily: {},
    hourly: {},
    totals: { visits: 0, incense: 0, digs: 0, wins: 0, feeds: 0, bells: 0, roomsCreated: 1 }
  };
}

let db;
try {
  db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const f = freshDb();
  db.config = Object.assign(f.config, db.config || {});
  for (const k of Object.keys(f)) if (db[k] === undefined) db[k] = f[k];
  db.totals = Object.assign(f.totals, db.totals);
} catch (e) {
  db = freshDb();
}
let dirty = true;
function save() { dirty = true; }
setInterval(() => {
  if (!dirty) return;
  dirty = false;
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DATA_FILE);
}, 2000);

// Ngày/giờ theo giờ Việt Nam (UTC+7)
const vnNow = () => new Date(Date.now() + 7 * 3600e3).toISOString();
const dayKey = () => vnNow().slice(0, 10);
const hourKey = () => vnNow().slice(0, 13);
function today() {
  const k = dayKey();
  if (!db.daily[k]) db.daily[k] = { visits: 0, u: {}, newPlayers: 0, incense: 0, digs: 0, wins: 0, feeds: 0, bells: 0, peak: 0 };
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
  today()[field] += n;
  db.totals[field] = (db.totals[field] || 0) + n;
  save();
}

function getPlayer(pid, name) {
  let p = db.players[pid];
  if (!p) {
    p = db.players[pid] = { name, firstSeen: Date.now(), lastSeen: Date.now(), phuoc: 0, rau: 0, visits: 0, incense: 0, digs: 0, feeds: 0, digDay: '', digsToday: 0, wins: [] };
    today().newPlayers++;
  }
  if (name) p.name = name;
  return p;
}
function profileOf(pid) {
  const p = db.players[pid];
  const left = p.digDay === dayKey() ? Math.max(0, db.config.digsPerDay - p.digsToday) : db.config.digsPerDay;
  return {
    phuoc: p.phuoc, rau: p.rau, digsLeft: left, digsPerDay: db.config.digsPerDay,
    wins: p.wins.map(id => db.awards.find(a => a.id === id)).filter(Boolean)
      .map(a => ({ title: a.title, code: a.code, link: a.link, time: a.time, description: a.description }))
  };
}

/* ----------------------------- Phòng (chùa) ----------------------------- */
const rooms = new Map();
function makeRoom(num) {
  const room = {
    id: 'chua-' + num, num, name: 'Chùa ' + num,
    clients: new Map(),
    plots: LAYOUT.plots.map(p => ({ id: p.id, state: 'ripe', regrowAt: 0 })),
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
const COLORS = ['#c0392b', '#d35400', '#8e44ad', '#2c7a7b', '#b7791f', '#2f855a', '#2b6cb0', '#6b4f3a'];

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
  db.players[pid].wins.push(award.id);
  bump('wins');
  return award;
}

function handleClient(ws, req) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  let me = null, room = null;

  ws.onmessage = text => {
    let m; try { m = JSON.parse(text); } catch (e) { return; }
    if (!me && m.t !== 'hello') return;
    switch (m.t) {
      case 'hello': {
        if (me) return;
        const pid = /^[a-zA-Z0-9-]{8,64}$/.test(m.pid || '') ? m.pid : crypto.randomUUID();
        const name = clean(m.name, 18) || 'Designer ẩn danh';
        const p = getPlayer(pid, name);
        p.lastSeen = Date.now(); p.visits++;
        const d = today();
        d.visits++; d.u[pid] = 1; db.totals.visits++; thisHour().visits++;
        save();
        room = pickRoom();
        me = {
          ws, pid, ip, name, id: crypto.randomBytes(4).toString('hex'),
          color: COLORS.includes(m.color) ? m.color : COLORS[0],
          hat: ['none', 'non', 'beanie', 'headphone'].includes(m.hat) ? m.hat : 'none',
          x: LAYOUT.spawn.x + (Math.random() * 80 - 40), y: LAYOUT.spawn.y + (Math.random() * 30 - 15),
          dir: 1, moving: false, lastIncense: 0, lastBell: 0, lastEmote: 0
        };
        room.clients.set(me.id, me);
        ws.send({
          t: 'welcome', you: pub(me), room: { id: room.id, name: room.name, num: room.num, capacity: db.config.roomCapacity },
          players: [...room.clients.values()].filter(c => c !== me).map(pub),
          plots: room.plots, incense: room.incense, altar: db.config.altar,
          templeName: db.config.templeName, shopUrl: db.config.shopUrl,
          profile: profileOf(pid), pid, rooms: roomList(), serverTime: Date.now(), regrowSec: db.config.plotRegrowSec
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
        if (dist(me, LAYOUT.altar) > LAYOUT.altar.radius + 60 && dist(me, LAYOUT.bowl) > LAYOUT.bowl.radius + 60) return;
        const app = db.config.altar.find(a => a.id === m.app) || db.config.altar[0];
        me.lastIncense = now;
        const stick = { id: crypto.randomBytes(4).toString('hex'), by: me.name, app: app.id, appName: app.name, wish: clean(m.wish, 70), t: now, slot: Math.floor(Math.random() * 1000) };
        room.incense.push(stick);
        if (room.incense.length > 40) room.incense.shift();
        const p = db.players[me.pid]; p.phuoc += 3; p.incense++;
        bump('incense');
        broadcast(room, { t: 'incense', stick, by: me.id });
        ws.send({ t: 'profile', profile: profileOf(me.pid), msg: `+3 phước · Tổ ${app.name} đã chứng giám` });
        break;
      }
      case 'bell': {
        const now = Date.now();
        if (now - me.lastBell < 4000 || dist(me, LAYOUT.bell) > LAYOUT.bell.radius + 60) return;
        me.lastBell = now; bump('bells');
        broadcast(room, { t: 'bell', by: me.name });
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
      case 'feed': {
        const a = LAYOUT.animals.find(x => x.id === m.animal);
        if (!a) return;
        const r = a.id === 'fish' ? LAYOUT.fishRadius : LAYOUT.animalRadius;
        if (Math.hypot(me.x - (+m.ax || a.x), me.y - (+m.ay || a.y)) > r + 60 || dist(me, a) > 420) return;
        const p = db.players[me.pid];
        if (p.rau <= 0) return ws.send({ t: 'toast', msg: 'Bạn chưa có bó rau nào — ra vườn đào đất nhé 🥬' });
        p.rau--; p.phuoc += 5; p.feeds++;
        bump('feeds');
        broadcast(room, { t: 'fed', animal: a.id, by: me.id, name: me.name });
        ws.send({ t: 'profile', profile: profileOf(me.pid), msg: `${a.name} ăn ngon lành · +5 phước 🍀` });
        break;
      }
    }
  };
  ws.onclose = () => {
    if (me && room) {
      room.clients.delete(me.id);
      db.players[me.pid].lastSeen = Date.now(); save();
      broadcast(room, { t: 'leave', id: me.id });
      broadcastRoomInfo();
    }
  };
}
const ipDigs = {};
setInterval(() => { const dk = dayKey(); for (const k in ipDigs) if (!k.endsWith(dk)) delete ipDigs[k]; }, 3600e3);

const pub = c => ({ id: c.id, name: c.name, color: c.color, hat: c.hat, x: Math.round(c.x), y: Math.round(c.y), dir: c.dir, moving: c.moving });
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
const tokens = new Map(); // token -> hết hạn
function isAdmin(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const exp = tokens.get(t);
  return exp && exp > Date.now();
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
  });
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' };

function voucherOut(v) { return Object.assign({}, v, { remaining: remainingOf(v), codesCount: v.codes ? v.codes.length : 0, codes: undefined }); }

function statsPayload() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const k = new Date(Date.now() + 7 * 3600e3 - i * 86400e3).toISOString().slice(0, 10);
    const d = db.daily[k] || { visits: 0, u: {}, newPlayers: 0, incense: 0, digs: 0, wins: 0, feeds: 0, bells: 0, peak: 0 };
    days.push({ day: k, visits: d.visits, uniques: Object.keys(d.u).length, newPlayers: d.newPlayers, incense: d.incense, digs: d.digs, wins: d.wins, feeds: d.feeds, bells: d.bells, peak: d.peak });
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
    players: Object.keys(db.players).length, totalRate,
    lastWins: db.awards.slice(-8).reverse().map(a => ({ name: a.name, title: a.title, code: a.code, time: a.time, room: a.room }))
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p.startsWith('/api/')) {
    if (p === '/api/public/info') {
      return json(res, 200, { online: totalOnline(), rooms: roomList(), templeName: db.config.templeName, recent: db.awards.slice(-6).reverse().map(a => ({ name: a.name.slice(0, 2) + '***', title: a.title })) });
    }
    if (p === '/api/admin/login' && req.method === 'POST') {
      const b = await readBody(req);
      if (b.password !== ADMIN_PASSWORD) return json(res, 401, { error: 'Sai mật khẩu' });
      const t = crypto.randomBytes(24).toString('hex');
      tokens.set(t, Date.now() + 12 * 3600e3);
      return json(res, 200, { token: t });
    }
    if (!isAdmin(req)) return json(res, 401, { error: 'Chưa đăng nhập' });

    if (p === '/api/admin/stats') return json(res, 200, statsPayload());
    if (p === '/api/admin/config' && req.method === 'GET') return json(res, 200, db.config);
    if (p === '/api/admin/config' && req.method === 'POST') {
      const b = await readBody(req);
      const c = db.config;
      if (b.roomCapacity) c.roomCapacity = Math.max(1, Math.min(500, b.roomCapacity | 0));
      if (b.digsPerDay !== undefined) c.digsPerDay = Math.max(0, Math.min(100, b.digsPerDay | 0));
      if (b.plotRegrowSec) c.plotRegrowSec = Math.max(5, Math.min(86400, b.plotRegrowSec | 0));
      if (b.incenseCooldownSec !== undefined) c.incenseCooldownSec = Math.max(0, Math.min(3600, b.incenseCooldownSec | 0));
      if (b.shopUrl) c.shopUrl = clean(b.shopUrl, 300);
      if (b.templeName) c.templeName = clean(b.templeName, 60);
      if (Array.isArray(b.altar)) c.altar = b.altar.slice(0, 14).map((a, i) => ({ id: clean(a.id, 12) || 'app' + i, name: clean(a.name, 24), short: clean(a.short, 3), color: /^#[0-9a-fA-F]{3,8}$/.test(a.color) ? a.color : '#cccccc', image: clean(a.image, 500) }));
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
    if (p === '/api/admin/awards') {
      if (url.searchParams.get('format') === 'csv') {
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="nguoi-trung-thuong.csv"' });
        const rows = [['Thời gian', 'Tên người chơi', 'Mã người chơi', 'Voucher', 'Mã', 'Chùa']].concat(db.awards.map(a => [new Date(a.time + 7 * 3600e3).toISOString().replace('T', ' ').slice(0, 19), a.name, a.pid, a.title, a.code, a.room]));
        return res.end('﻿' + rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n'));
      }
      return json(res, 200, db.awards.slice(-500).reverse());
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

server.on('upgrade', (req, socket) => {
  if (!req.url.startsWith('/ws')) return socket.destroy();
  const ws = wsAccept(req, socket);
  if (ws) handleClient(ws, req);
});

server.listen(PORT, () => {
  console.log(`🛕  ${db.config.templeName} đang mở cửa: http://localhost:${PORT}`);
  console.log(`🔐  Trang quản trị: http://localhost:${PORT}/admin  (mật khẩu: biến ADMIN_PASSWORD)`);
});
