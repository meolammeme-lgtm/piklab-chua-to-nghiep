/* Chế độ DEMO offline: giả lập server ngay trong trình duyệt (bot đi lại, voucher demo) */
(function () {
'use strict';
const L = window.LAYOUT, RU = window.RULES;
const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
const get = (k, d) => { try { const v = store && store.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const put = (k, v) => { try { store && store.setItem(k, JSON.stringify(v)); } catch (e) {} };

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
const DEFAULT_VOUCHERS = [
  { id: 'v1', title: 'Giảm 20% template PikLab', description: 'Áp dụng đơn từ 199k (mã demo)', rate: 15, prefix: 'PIK20' },
  { id: 'v2', title: 'Freeship khoá học PikLab', description: 'Mã demo, chưa dùng được thật', rate: 10, prefix: 'PIKFREE' },
  { id: 'v3', title: 'Tặng 1 tháng PikLab Pro', description: 'Mã demo, chưa dùng được thật', rate: 3, prefix: 'PIKPRO' }
];
/* Tài khoản demo (lưu trên máy này) */
const h32 = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
window.LocalAuth = function (kind, b) {
  const accs = get('pk_demo_accounts', {}), sess = get('pk_demo_sessions', {});
  const email = String(b.email || '').trim().toLowerCase();
  const pubA = a => ({ name: a.name, color: a.color, hat: a.hat, hair: a.hair || 'bun', outfit: a.outfit || 'trang' });
  const session = a => { const t = Math.random().toString(36).slice(2) + Date.now().toString(36); sess[t] = a.email; put('pk_demo_sessions', sess); return t; };
  if (kind === 'register') {
    const name = String(b.name || '').replace(/[<>]/g, '').trim().slice(0, 18);
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return { error: 'Email chưa đúng định dạng.' };
    if (String(b.password || '').length < 6) return { error: 'Mật khẩu cần ít nhất 6 ký tự.' };
    if (name.length < 2) return { error: 'Pháp danh cần ít nhất 2 ký tự.' };
    if (accs[email]) return { error: 'Email này đã có tài khoản — hãy chọn “Đã có tài khoản” để đăng nhập.' };
    if (Object.values(accs).some(a => a.name.toLowerCase() === name.toLowerCase()) || BOTS.some(x => x[0].toLowerCase() === name.toLowerCase())) return { error: 'Pháp danh này đã có người dùng, hãy chọn tên khác nhé.' };
    const a = accs[email] = { email, pid: 'demo-' + h32(email + Date.now()), name, color: b.color, hat: ['none', 'non'].includes(b.hat) ? b.hat : 'none', hair: b.hair === 'bald' ? 'bald' : 'bun', hash: h32(email + ':' + b.password) };
    put('pk_demo_accounts', accs);
    return { token: session(a), account: pubA(a) };
  }
  if (kind === 'login') {
    const a = accs[email];
    if (!a || a.hash !== h32(email + ':' + (b.password || ''))) return { error: 'Email hoặc mật khẩu chưa đúng.' };
    return { token: session(a), account: pubA(a) };
  }
  if (kind === 'me') { const a = accs[sess[b.token]]; return a ? { account: pubA(a) } : { error: 'Phiên đăng nhập đã hết hạn.' }; }
  if (kind === 'logout') { delete sess[b.token]; put('pk_demo_sessions', sess); return { ok: true }; }
  return { error: '?' };
};
const accountFromToken = t => { const accs = get('pk_demo_accounts', {}), sess = get('pk_demo_sessions', {}); return accs[sess[t]] || null; };
const saveAccount = a => { const accs = get('pk_demo_accounts', {}); accs[a.email] = a; put('pk_demo_accounts', accs); };
function ensureAcc(a) {
  if (!a.hair) { a.hair = a.hat === 'bald' ? 'bald' : 'bun'; if (a.hat === 'bald') a.hat = 'none'; }
  if (!RU.HATS.some(h => h.id === a.hat)) a.hat = 'none';
  if (!RU.OUTFITS.some(o => o.id === a.outfit)) a.outfit = 'trang';
  a.items = a.items || { hats: [], colors: [] };
  a.items.outfits = [...new Set([...RU.OUTFITS.filter(o => !o.price).map(o => o.id), ...(a.items.outfits || []), a.outfit])];
  a.items.hats = [...new Set([...RU.HATS.filter(h => !h.price).map(h => h.id), ...a.items.hats, a.hat])];
  a.items.colors = [...new Set([...RU.COLORS.filter(c => !c.price).map(c => c.id), ...a.items.colors, a.color])];
  return a;
}
const SHOUTS = ['Khách ơi đừng sửa nữa mà!!!', 'Ai đặt tên layer là "Layer 1 copy 37" vậy?!', 'Logo to hơn nhưng nhỏ lại là sao trời!', 'Deadline ơi tha cho tui!', 'File final_final_v9 là file nào???', 'Ủa sao màu in khác màn hình vậy?!', 'Em cứ sáng tạo thoải mái… rồi sửa 12 lần!'];

const WISHES = ['Khách duyệt bản đầu tiên', 'Render không crash', 'Deadline lùi 1 tuần', 'In ra đúng màu', 'Không bị “logo to hơn”', 'File không corrupt', 'Lương về đúng hẹn', 'Font không lỗi'];
const BOTS = [
  ['Thích Kéo Layer', '#7a5a43', 'bald'], ['Thích Căn Lề', '#6f7d8c', 'khan', 'nguthan'], ['Thích Pen Tool', '#c9902e', 'bald'],
  ['Thích Keyframe', '#3b4f7a', 'none', 'aodai', 'long'], ['Thích Gradient', '#efe7d6', 'non', 'baba', 'braid']   // [pháp danh, màu áo, mũ, kiểu áo, kiểu tóc]
];
const MKT = L.market, GY = L.GATE_Y, AX = L.altar.x;
const POI = {
  altar: [[AX + 70, 610], [AX - 70, 615], [AX + 200, 600], [AX - 200, 600]], bowl: [[L.bowl.x + 110, L.bowl.y + 100], [L.bowl.x - 110, L.bowl.y + 100], [L.bowl.x, L.bowl.y + 160]],
  garden: L.plots.map(p => [p.x, p.y + 40]), pen: [[L.pen.x + 160, L.pen.y + 420], [L.pen.x + 380, L.pen.y + 450], [L.pen.x + 300, L.pen.y + 560], [L.pen.x + 520, L.pen.y + 480]],
  bell: [[L.bell.x, L.bell.y + 130], [L.bell.x + 110, L.bell.y + 120]], fortune: [[MKT.fortune.x, MKT.fortune.y + 135], [MKT.fortune.x - 90, MKT.fortune.y + 140]], cushion: L.cushions.map(c => [c.x, c.y]),
  wander: [[1100, 900], [1700, 1000], [1250, 1200], [1600, 780], [1000, 760], [1850, 1150], [1400, 1650]],
  shout: [[900, 2620], [1700, 2620], [2100, 3100], [700, 3100]], fish: [[L.release.x - 30, L.release.y - 20], [L.release.x + 30, L.release.y - 30]], samhoi: [[L.samhoi.x - 60, L.samhoi.y + 110], [L.samhoi.x + 80, L.samhoi.y + 120]], cau: L.cauSeats.map(s => [s.x, s.y]), pentool: [[MKT.thayDo.x - 60, MKT.thayDo.y + 150]], sweep: L.leaves.map(l => [l.x, l.y + 40]), eat: [[MKT.food.x - 140, MKT.food.y + 45], [MKT.food.x, MKT.food.y + 45], [MKT.food.x + 140, MKT.food.y + 130]]
};
const HUB = [L.gate.x - 140, 1120];   // né lư hương giữa sân
const MARKET_KINDS = ['shout', 'sweep', 'eat', 'fish', 'pentool', 'cau'];
// tuyến đi cho bot: luôn đi qua trục chính và cổng chùa
function route(b, kind, tgt) {
  const path = [], inMkt = b.y > GY, toMkt = MARKET_KINDS.includes(kind);
  if (inMkt && toMkt) { path.push([L.gate.x, Math.max(2620, Math.min(3190, b.y))], [kind === 'fish' ? L.gate.x : tgt[0], kind === 'fish' ? 3190 : 2620]); }
  else if (inMkt) { path.push([L.gate.x, Math.min(2620, b.y)], [L.gate.x, GY + 120], [L.gate.x, GY - 150], [L.gate.x, 1250], HUB); }
  else if (toMkt) { path.push(HUB, [L.gate.x, 1250], [L.gate.x, GY - 150], [L.gate.x, GY + 120], [L.gate.x, 2620], [kind === 'fish' ? L.gate.x : tgt[0], kind === 'fish' ? 3190 : 2620]); }
  else path.push(HUB);
  if (!toMkt) {
    if (kind === 'altar' || kind === 'cushion') path.push([HUB[0], 760], [AX, 700], [AX, 640]);
    if (kind === 'bell') path.push([1000, 740], [L.bell.x + 230, 740]);
    if (kind === 'fortune') path.push([1800, 740], [MKT.fortune.x - 230, 740]);
    if (kind === 'garden') path.push([1100, 1490], [L.garden.x + L.garden.w + 40, 1490], [L.garden.x + L.garden.w - 60, 1490]);
    if (kind === 'pen') path.push([1700, 1490], [L.pen.x - 40, 1490], [L.pen.x + 80, 1490]);
  }
  if (kind === 'cau') path.push([tgt[0], 3195]);   // đi dọc đường ven sông rồi ra ghế câu
  path.push([tgt[0] + (kind === 'cushion' || kind === 'cau' ? 0 : (Math.random() - .5) * 30), tgt[1] + (kind === 'cushion' || kind === 'cau' ? 0 : (Math.random() - .5) * 20)]);
  return path;
}
const dayVN = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

const SH_SEED = ['Con xin sám hối vì đặt tên file là final_final_v9_thatsu_final.psd', 'Con đã nói “5 phút nữa xong” lúc 9 giờ tối. Bây giờ là 3 giờ sáng.', 'Con lấy Comic Sans làm font tạm rồi quên đổi, khách in 2.000 tờ rơi.', 'Con đã Ctrl+S đè lên file gốc của cả team.', 'Con tăng size logo 10% rồi gửi lại, khách khen “đúng rồi đó em”.', 'Con chưa từng đặt tên layer trong đời.'];
function samhoiAll() {
  let l = get('pk_demo_samhoi', null);
  if (!l) { l = SH_SEED.map((text, i) => ({ id: 's' + i, text, t: Date.now() - (i * 5 + 2) * 3600e3, n: 20 + ((i * 37) % 150), mine: false, prayed: false })); put('pk_demo_samhoi', l); }
  return l.filter(x => Date.now() - x.t < RU.SAMHOI.ttl);
}
const putSh = l => put('pk_demo_samhoi', l);
window.LocalServer = function (deliver) {
  const emit = m => setTimeout(() => deliver(m), 0);
  const cfg = Object.assign({ digsPerDay: 5, regrowSec: 40 }, get('pk_demo_cfg', {}));
  const altar = get('pk_demo_altar', null) || DEFAULT_ALTAR;
  const vouchers = get('pk_demo_vouchers', null) || DEFAULT_VOUCHERS;
  let profKey = 'pk_demo_profile', prof = { phuoc: 20, rau: 0, digDay: '', digsToday: 0, wins: [] }, acc = null;
  const day = dayVN;
  const BELL_PER_DAY = 5, FORTUNE_PER_DAY = 3;
  const dd = () => { if (!prof.dd || prof.dd.day !== day()) prof.dd = { day: day(), bell: 0, bellHits: 0, fq: [], acc: null, mo: 0, beads: 0, fish: 0, pen: 0, sh: 0, pray: 0 }; return prof.dd; };
  const todayOut = () => { const d = dd(); return { bellLeft: Math.max(0, BELL_PER_DAY - d.bell), fortuneLeft: d.acc ? 0 : Math.max(0, FORTUNE_PER_DAY - d.fq.length), drawn: d.fq.map(i => ({ no: i + 1, text: fortunes[i] || '' })), accepted: d.acc, moLeft: Math.max(0, RU.CHANT.mo.perDay - d.mo), beadsLeft: Math.max(0, RU.CHANT.beads.perDay - d.beads), fishLeft: Math.max(0, RU.FISH_RULES.perDay - (d.fish || 0)), cauLeft: Math.max(0, RU.CAU.perDay - (d.cau || 0)), penLeft: Math.max(0, RU.PEN.perDay - (d.pen || 0)), samhoiLeft: Math.max(0, RU.SAMHOI.perDay - (d.sh || 0)) }; };
  const profile = () => {
    if (prof.digDay !== day()) { prof.digDay = day(); prof.digsToday = 0; }
    put(profKey, prof);
    const st = RU.stamina(prof, Date.now()); put(profKey, prof);
    return { phuoc: prof.phuoc, rau: prof.rau, digsLeft: Math.max(0, cfg.digsPerDay - prof.digsToday), digsPerDay: cfg.digsPerDay, wins: prof.wins, st, stMax: RU.STAMINA_MAX, today: todayOut(), penLesson: prof.penLesson || 0, briefs: prof.briefs || {}, fishBag: prof.fishBag || {}, look: acc ? { color: acc.color, hat: acc.hat, hair: acc.hair, outfit: acc.outfit } : {}, items: acc ? acc.items : { hats: [], colors: [], outfits: [] } };
  };
  const plots = L.plots.map(p => ({ id: p.id, state: 'ripe', regrowAt: 0 }));
  const leaves = L.leaves.map(l => ({ id: l.id, state: 'full', regrowAt: 0 }));
  const prices = { fortune: 5, shout: 1, sweep: 2, bellReward: 3, bellPenalty: 1, chant: 2, penReward: RU.PEN.reward, samhoi: RU.SAMHOI.price, fishPerDay: RU.FISH_RULES.perDay }, fortunes = get('pk_demo_fortunes', null) || RU.DEFAULT_FORTUNES;
  const tug = { offers: [], match: null };
  const tugState = () => ({ offers: tug.offers, match: tug.match && { a: tug.match.a, b: tug.match.b, aName: tug.match.aName, bName: tug.match.bName, bet: tug.match.bet, pos: tug.match.pos, startAt: tug.match.startAt, endAt: tug.match.endAt } });
  const tired = () => emit({ t: 'tired', profile: profile() });
  const look = () => { saveAccount(acc); me.color = acc.color; me.hat = acc.hat; me.hair = acc.hair; me.outfit = acc.outfit; emit({ t: 'look', id: 'me', color: acc.color, hat: acc.hat, hair: acc.hair, outfit: acc.outfit }); };
  const M = L.market;
  let incense = [], me = null;
  const bots = BOTS.map(([name, color, hat, outfit, hair], i) => ({ id: 'bot' + i, name, color, hat: hat === 'bald' ? 'none' : hat, hair: hat === 'bald' ? 'bald' : hair || 'bun', outfit: outfit || 'trang', x: L.gate.x + (i - 2) * 70, y: 1150 - i * 40, dir: 1, moving: false, path: [], wait: 1 + i * 1.5, goal: null }));
  const rooms = () => [{ id: 'chua-1', name: 'Chùa 1', num: 1, online: bots.length + 1, capacity: 30 }];
  const pub = b => ({ id: b.id, name: b.name, color: b.color, hat: b.hat, hair: b.hair, outfit: b.outfit, x: b.x, y: b.y, dir: b.dir, moving: b.moving, pose: b.pose || '', seat: b.seat });
  const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < r;
  const code = prefix => prefix + '-' + Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');

  function lightIncense(who, appId, wish) {
    const app = appId === 'all' ? { id: 'all', name: 'Chư vị Tổ Nghiệp' } : altar.find(a => a.id === appId) || altar[0];
    const stick = { id: Math.random().toString(36).slice(2), by: who.name, app: app.id, appName: app.name, wish, t: Date.now(), slot: Math.random() * 1000 | 0 };
    incense.push(stick); if (incense.length > 90) incense.shift();
    emit({ t: 'incense', stick, by: who.id });
  }

  // ---- thời tiết: bản demo gọi thẳng Open-Meteo từ trình duyệt (không cần khoá). Lỗi mạng → trời quang ----
  const wxState = Object.assign({ city: 'hanoi', mode: 'auto', manual: 'clear', kind: 'clear', temp: null }, get('pk_demo_wx', {}));
  const wxOut = () => { const c = RU.CITIES.find(x => x.id === wxState.city) || RU.CITIES[0]; const man = wxState.mode === 'manual'; return { kind: man ? wxState.manual : wxState.kind, temp: man ? null : wxState.temp, city: c.name, cityId: c.id, mode: wxState.mode, source: man ? 'chọn tay' : 'Open-Meteo' }; };
  function fetchWeather() {
    if (wxState.mode === 'manual') return emit({ t: 'weather', w: wxOut() });
    const c = RU.CITIES.find(x => x.id === wxState.city) || RU.CITIES[0];
    if (!window.fetch) return;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=weather_code,temperature_2m&timezone=Asia%2FBangkok`)
      .then(r => r.json()).then(j => { const cur = j.current || {}; wxState.temp = typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null; wxState.kind = RU.weatherKind(cur.weather_code | 0, wxState.temp); emit({ t: 'weather', w: wxOut() }); })
      .catch(() => emit({ t: 'weather', w: wxOut() }));
  }
  setInterval(fetchWeather, 15 * 60e3);
  let bellG = null, chant = null;

  // vòng lặp bot
  let last = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = Math.min(.2, (now - last) / 1000); last = now;
    const moved = [];
    for (const b of bots) {
      if (b.path.length) {
        const [tx, ty] = b.path[0], dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy), sp = 120 * dt;
        if (d <= sp) { b.x = tx; b.y = ty; b.path.shift(); } else { b.x += dx / d * sp; b.y += dy / d * sp; b.dir = dx >= 0 ? 1 : -1; }
        b.moving = b.path.length > 0;
        if (!b.moving) arrive(b);
        else if (Math.random() < .0012) emit({ t: 'say', id: b.id, text: SHOUTS[Math.random() * SHOUTS.length | 0] });   // vừa đi vừa khẩu nghiệp
        moved.push([b.id, Math.round(b.x), Math.round(b.y), b.dir, b.moving ? 1 : 0]);
      } else if (b.tugging) { /* đang kéo co */ } else if ((b.wait -= dt) <= 0) {
        if (b.pose) { b.pose = ''; b.seat = null; emit({ t: 'pose', id: b.id, pose: '' }); }
        const kinds = ['altar', 'bowl', 'garden', 'pen', 'wander', 'bell', 'shout', 'sweep', 'eat', 'cushion', 'fortune', 'bell', 'fish', 'samhoi', 'pentool', 'cau', 'cau'];
        const kind = kinds[Math.random() * kinds.length | 0], list = POI[kind], tgt = list[Math.random() * list.length | 0];
        b.goal = kind; b.path = route(b, kind, tgt);
      }
    }
    if (moved.length) emit({ t: 's', p: moved });
    for (const lf of leaves) if (lf.state === 'swept' && Date.now() >= lf.regrowAt) { lf.state = 'full'; emit({ t: 'leaf', leaf: lf }); }
    tugTick();
    for (const p of plots) if (p.state === 'dug' && Date.now() >= p.regrowAt) { p.state = 'ripe'; emit({ t: 'plot', plot: p }); }
    const n = incense.length; incense = incense.filter(s => Date.now() - s.t < 180e3); if (incense.length !== n) emit({ t: 'incenseAll', list: incense });
  }, 100);

  function arrive(b) {
    b.wait = 3 + Math.random() * 6;
    const r = Math.random();
    if ((b.goal === 'altar' || b.goal === 'bowl') && r < .75) { emit({ t: 'emote', id: b.id, e: 'bow' }); setTimeout(() => lightIncense(b, b.goal === 'bowl' ? 'all' : altar[Math.random() * altar.length | 0].id, Math.random() < .8 ? WISHES[Math.random() * WISHES.length | 0] : ''), 600); }
    else if (b.goal === 'cushion') { b.pose = 'sit'; b.wait = 8 + Math.random() * 8; emit({ t: 'pose', id: b.id, pose: 'sit', x: b.x, y: b.y }); }
    else if (b.goal === 'fortune' && r < .7) emit({ t: 'emote', id: b.id, e: 'pray' });
    else if (b.goal === 'garden') {
      const pl = L.plots.map((p, i) => [p, plots[i]]).filter(([p, s]) => s.state === 'ripe').sort((a, c) => Math.hypot(a[0].x - b.x, a[0].y - b.y) - Math.hypot(c[0].x - b.x, c[0].y - b.y))[0];
      if (pl && Math.hypot(pl[0].x - b.x, pl[0].y - b.y) < 160 && r < .7) { const s = pl[1]; s.state = 'dug'; s.regrowAt = Date.now() + cfg.regrowSec * 1000; emit({ t: 'plot', plot: s, by: b.id }); }
    } else if (b.goal === 'pen' && r < .6) { const a = L.animals[Math.random() * 4 | 0]; emit({ t: 'fed', animal: a.id, by: b.id, name: b.name }); }
    else if (b.goal === 'bell' && r < .75) { if (Math.random() < .7) emit({ t: 'bell', by: b.name, id: b.id, halo: true }); else emit({ t: 'bellFart', id: b.id, by: b.name }); }
    else if (b.goal === 'fish' && r < .8) { const sc = Math.random() < RU.FISH_RULES.scoopRate; emit({ t: 'fish', id: b.id, name: b.name, kind: RU.FISH[Math.random() * 3 | 0].id, scooped: sc, wish: Math.random() < .5 ? WISHES[Math.random() * WISHES.length | 0] : '' }); }
    else if (b.goal === 'cau') { const st = L.cauSeats.find(s => Math.hypot(s.x - b.x, s.y - b.y) < 30); if (st && !bots.some(o => o !== b && o.pose === 'fish' && o.seat === st.id)) { b.pose = 'fish'; b.seat = st.id; b.wait = 15 + Math.random() * 20; emit({ t: 'pose', id: b.id, pose: 'fish', x: st.x, y: st.y, seat: st.id }); setTimeout(() => { if (b.pose !== 'fish') return; const br = RU.rollBrief(RU.DEFAULT_BRIEFS); if (br && (br.rarity === 'hiem' || br.rarity === 'sieu')) emit({ t: 'feed', msg: `🎣 ${b.name} vừa câu được brief ${RU.RARITY.find(x => x.id === br.rarity).name.toUpperCase()}: “${br.name}”!` }); emit({ t: 'emote', id: b.id, e: 'heart' }); }, 8000 + Math.random() * 6000); } }
    else if (b.goal === 'samhoi' && r < .5) { const l = samhoiAll(); const it = l[Math.random() * l.length | 0]; if (it) { it.n++; putSh(l); } emit({ t: 'emote', id: b.id, e: 'pray' }); }
    else if (b.goal === 'sweep') { const lf = leaves.filter(x => x.state === 'full').sort((p, q) => Math.hypot(L.leaves[p.id].x - b.x, L.leaves[p.id].y - b.y) - Math.hypot(L.leaves[q.id].x - b.x, L.leaves[q.id].y - b.y))[0]; if (lf && Math.hypot(L.leaves[lf.id].x - b.x, L.leaves[lf.id].y - b.y) < 140) { lf.state = 'swept'; lf.regrowAt = Date.now() + 45000; emit({ t: 'leaf', leaf: lf, by: b.id }); } }
    else if (b.goal === 'eat') emit({ t: 'emote', id: b.id, e: 'heart' });
    else if (r < .4) emit({ t: 'emote', id: b.id, e: ['pray', 'zen', 'wave', 'heart'][Math.random() * 4 | 0] });
  }

  // ---- kéo co: bot nhận kèo sau vài giây ----
  function tugTick() {
    const mt = tug.match; if (!mt) return;
    const now = Date.now();
    if (now >= mt.startAt && now <= mt.endAt && Math.random() < mt.botRate) { mt.pos += 1; mt.cb = (mt.cb || 0) + 1; mt.changed = true; }
    if (mt.changed) { mt.changed = false; emit({ t: 'tugPos', pos: mt.pos, ca: mt.ca || 0, cb: mt.cb || 0 }); }
    if (Math.abs(mt.pos) >= RU.TUG.win || now > mt.endAt) endTug(mt.pos < 0 ? 'me' : mt.pos > 0 ? mt.b : null);
  }
  function endTug(winner) {
    const mt = tug.match; if (!mt) return; tug.match = null;
    const bot = bots.find(x => x.id === mt.b); if (bot) { bot.tugging = false; bot.wait = 2; }
    if (winner === 'me') prof.phuoc += mt.bet * 2; else if (!winner) prof.phuoc += mt.bet;
    emit({ t: 'tugEnd', winner, wName: winner === 'me' ? me.name : winner ? mt.bName : '', lName: winner === 'me' ? mt.bName : winner ? me.name : '', bet: mt.bet, pos: mt.pos, ca: mt.ca || 0, cb: mt.cb || 0, a: 'me', b: mt.b });
    emit({ t: 'profile', profile: profile() }); emit({ t: 'tugState', tug: tugState() });
  }
  function botAccept() {
    const o = tug.offers.find(x => x.id === 'me'); if (!o || tug.match) return;
    const bot = bots.find(x => !x.tugging) || bots[0];
    if (!RU.useStamina(prof, RU.COST.tug, Date.now())) { tug.offers = []; emit({ t: 'tugState', tug: tugState() }); return tired(); }
    prof.phuoc -= o.bet; tug.offers = [];
    bot.tugging = true; bot.path = []; bot.moving = false; bot.x = M.tug.x + 150; bot.y = M.tug.y;
    emit({ t: 's', p: [[bot.id, bot.x, bot.y, -1, 0]] });
    const start = Date.now() + RU.TUG.countdown;
    tug.match = { a: 'me', b: bot.id, aName: me.name, bName: bot.name, bet: o.bet, pos: 0, startAt: start, endAt: start + RU.TUG.ms, botRate: .55 + Math.random() * .3 };
    emit({ t: 'feed', msg: `🪢 ${bot.name} nhận kèo ${o.bet} phước của bạn!` });
    emit({ t: 'tugState', tug: tugState(), serverTime: Date.now() }); emit({ t: 'profile', profile: profile() });
  }

  return {
    demo: true,
    config: { cfg, wx: () => wxState, setWx(o) { Object.assign(wxState, o); put('pk_demo_wx', { city: wxState.city, mode: wxState.mode, manual: wxState.manual }); fetchWeather(); }, altar, vouchers, save() { put('pk_demo_cfg', cfg); put('pk_demo_altar', altar); put('pk_demo_vouchers', vouchers); }, reset() { prof.digsToday = 0; prof.dd = null; emit({ t: 'profile', profile: profile(), msg: 'Đã hồi lại lượt đào, chuông, quẻ hôm nay' }); }, defaults: { altar: DEFAULT_ALTAR, vouchers: DEFAULT_VOUCHERS } },
    send(m) {
      switch (m.t) {
        case 'hello': {
          acc = accountFromToken(m.token);
          if (!acc) return emit({ t: 'authError', msg: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' });
          profKey = 'pk_demo_profile_' + acc.pid; prof = Object.assign({ phuoc: 20, rau: 0, digDay: '', digsToday: 0, wins: [] }, get(profKey, {}));
          ensureAcc(acc); saveAccount(acc);
          me = { id: 'me', name: acc.name, color: acc.color, hat: acc.hat, hair: acc.hair, outfit: acc.outfit, x: L.spawn.x, y: L.spawn.y, dir: 1, lastIncense: 0, lastSay: 0 };
          emit({ t: 'welcome', you: pub(me), room: { id: 'chua-1', name: 'Chùa 1', num: 1, capacity: 30 }, players: bots.map(pub), plots, incense, altar, templeName: 'Chùa Tổ Nghiệp Designer', shopUrl: 'https://piklab.vn', profile: profile(), pid: 'demo', rooms: rooms(), serverTime: Date.now(), regrowSec: cfg.regrowSec, demo: true, leaves, leafRegrowSec: 45, tug: tugState(), prices, weather: wxOut(), ver: RU.VERSION, briefs: RU.DEFAULT_BRIEFS });
          fetchWeather();
          setTimeout(() => lightIncense(bots[1], 'ps', 'Khách duyệt bản đầu tiên'), 2500);
          break;
        }
        case 'move': me.x = m.x; me.y = m.y; if (m.moving && chant) { chant = null; emit({ t: 'pose', id: 'me', pose: '' }); } if (m.moving && me.seat !== null && me.seat !== undefined) { me.seat = null; me.cast = null; emit({ t: 'pose', id: 'me', pose: '' }); } break;
        case 'emote': emit({ t: 'emote', id: 'me', e: m.e }); break;
        case 'bellStart': {
          const d = dd(), now = Date.now();
          if (!near(me, L.bell, L.bell.radius + 90)) return emit({ t: 'bellWait', msg: 'Lại gần chuông hơn chút nữa rồi thỉnh nhé 🔔' });
          if (d.bell >= BELL_PER_DAY) return emit({ t: 'bellNo', msg: `Hôm nay bạn đã thỉnh đủ ${BELL_PER_DAY} hồi chuông rồi. Mai quay lại nhé 🔔` });
          if (!RU.useStamina(prof, RU.COST.bell, now)) return tired();
          d.bell++; const period = RU.BELL.period(d.bellHits); bellG = { t0: now + RU.BELL.countdown, period };
          emit({ t: 'bellGo', countdown: RU.BELL.countdown, period, zone: RU.BELL.zone, profile: profile() });
          break;
        }
        case 'bellHit': {
          const g = bellG; if (!g) return; bellG = null;
          const d = dd(), srv = Date.now() - g.t0, e = +m.e, ok = e >= 0 && e <= srv + 60 && e >= srv - 900;
          const pos = ok ? RU.bellPos(e, g.period) : 0, hit = ok && Math.abs(pos - .5) <= RU.BELL.zone / 2;
          if (hit) { d.bellHits++; prof.phuoc += prices.bellReward; emit({ t: 'bell', by: me.name, id: 'me', halo: true }); emit({ t: 'bellResult', hit: true, pos, gain: prices.bellReward, profile: profile() }); }
          else { const loss = Math.min(prof.phuoc, prices.bellPenalty); prof.phuoc -= loss; emit({ t: 'bellFart', id: 'me', by: me.name }); emit({ t: 'bellResult', hit: false, pos, loss, profile: profile() }); }
          break;
        }
        case 'bellCancel': {
          const g = bellG; if (!g || Date.now() > g.t0 + 200) return; bellG = null;
          const d = dd(); d.bell = Math.max(0, d.bell - 1); prof.st = Math.min(RU.STAMINA_MAX, RU.stamina(prof, Date.now()) + RU.COST.bell);
          emit({ t: 'profile', profile: profile() }); break;
        }
        case 'chantStart': {
          const kind = m.kind === 'beads' ? 'beads' : 'mo', c = L.cushions.find(c => near(me, c, L.cushionRadius + 40)); if (!c) return;
          if (dd()[kind] >= RU.CHANT[kind].perDay) return emit({ t: 'toast', msg: 'Hôm nay đủ lượt rồi 🙏' });
          chant = { kind, t: Date.now() }; emit({ t: 'pose', id: 'me', pose: 'sit' });
          break;
        }
        case 'chantEnd': {
          const ch = chant; chant = null; emit({ t: 'pose', id: 'me', pose: '' });
          if (!ch || !m.done) return;
          const R = RU.CHANT[ch.kind], d = dd();
          if (Date.now() - ch.t < R.minMs || (m.n | 0) < R.every || d[ch.kind] >= R.perDay) return emit({ t: 'toast', msg: 'Tâm chưa tĩnh, lượt này chưa được tính 🙏' });
          if (!RU.useStamina(prof, RU.COST.chant, Date.now())) return tired();
          d[ch.kind]++; prof.phuoc += prices.chant; emit({ t: 'emote', id: 'me', e: 'zen' });
          emit({ t: 'profile', profile: profile(), msg: (ch.kind === 'mo' ? 'Tụng xong một thời kinh' : 'Lần trọn một chuỗi tràng hạt') + ` · +${prices.chant} phước 🪷` });
          break;
        }
        case 'samhoiList': case 'samhoiPost': case 'samhoiPray': {
          const l = samhoiAll(), d = dd();
          if (m.t === 'samhoiPost') {
            const text = RU.filterText(m.text, RU.DEFAULT_BANNED, RU.SAMHOI.max); if (!text || text.length < 4) return;
            if ((d.sh || 0) >= RU.SAMHOI.perDay) return emit({ t: 'toast', msg: `Mỗi ngày chỉ ghim được ${RU.SAMHOI.perDay} lời sám hối thôi.` });
            if (prof.phuoc < prices.samhoi) return emit({ t: 'toast', msg: `Ghim lời sám hối cần ${prices.samhoi} phước.` });
            prof.phuoc -= prices.samhoi; d.sh = (d.sh || 0) + 1; l.push({ id: 'm' + Date.now(), text, t: Date.now(), n: 0, mine: true, prayed: false }); putSh(l);
            emit({ t: 'profile', profile: profile(), msg: `Đã ghim lời sám hối · −${prices.samhoi} phước 🙏` });
            setTimeout(() => { const it = samhoiAll().find(x => x.text === text); if (it) { it.n += 1 + (Math.random() * 3 | 0); const all = samhoiAll(); putSh(all.map(x => x.id === it.id ? it : x)); emit({ t: 'samhoiNew' }); } }, 4000);   // bot đồng cảm
          }
          if (m.t === 'samhoiPray') { const it = l.find(x => x.id === m.id); if (!it || it.mine || it.prayed) return; it.prayed = true; it.n++; putSh(l); if ((d.pray || 0) < RU.SAMHOI.prayRewardPerDay) { d.pray = (d.pray || 0) + 1; prof.phuoc += RU.SAMHOI.prayReward; emit({ t: 'profile', profile: profile(), msg: `Đồng cảm 🙏 · +${RU.SAMHOI.prayReward} phước` }); } }
          const out = samhoiAll().map(x => Object.assign({}, x, { left: Math.max(1, Math.ceil((RU.SAMHOI.ttl - (Date.now() - x.t)) / 3600e3)) }));
          const mineL = out.filter(x => x.mine);
          out.sort(m.sort === 'hot' ? (a, b) => b.n - a.n : (a, b) => b.t - a.t);
          emit({ t: 'samhoi', list: m.sort === 'mine' ? out.filter(x => x.mine) : out, mine: { count: mineL.length, prays: mineL.reduce((a, x) => a + x.n, 0) } });
          break;
        }
        case 'penSubmit': {
          const d = dd(), cur = prof.penLesson || 0, li = m.lesson | 0; if (li < 0 || li > cur) return;
          if ((d.pen || 0) >= RU.PEN.perDay) return emit({ t: 'penResult', limit: true, profile: profile() });
          const score = RU.penScore(li, m.anchors, !!m.closed), pass = score >= RU.PEN.pass; d.pen = (d.pen || 0) + 1;
          if (pass) { prof.phuoc += prices.penReward; if (li === cur && cur < RU.PEN_LESSONS.length - 1) prof.penLesson = cur + 1; }
          emit({ t: 'penResult', score, pass, gain: pass ? prices.penReward : 0, lesson: li, profile: profile() });
          break;
        }
        case 'fishBuy': {
          if (!near(me, { x: L.market.fishSeller.x, y: L.market.fishSeller.y + 70 }, 240)) return emit({ t: 'toast', msg: 'Lại gần thúng cá của Cô Ba để mua nhé 🐟' });
          const f = RU.FISH.find(x => x.id === m.kind); if (!f) return;
          const bag = prof.fishBag = prof.fishBag || {};
          if (Object.values(bag).reduce((a, n) => a + n, 0) >= RU.FISH_RULES.bagMax) return emit({ t: 'toast', msg: `Giỏ đã đủ ${RU.FISH_RULES.bagMax} con rồi, ra bến thả bớt đã nhé.` });
          if (!RU.useStamina(prof, f.st, Date.now())) return tired();
          bag[f.id] = (bag[f.id] || 0) + 1;
          emit({ t: 'profile', profile: profile(), msg: `Cô Ba gói ${f.icon} ${f.name} vào giỏ · −${f.st} sinh lực. Ra mép bến thả để nhận phước nhé!` }); break;
        }
        case 'fishRelease': {
          if (!near(me, L.release, L.release.radius + 80)) return emit({ t: 'toast', msg: 'Ra tận mép bến rồi hãy thả cá nhé 🐟' });
          const f = RU.FISH.find(x => x.id === m.kind), d = dd(); if (!f) return;
          if ((d.fish || 0) >= RU.FISH_RULES.perDay) return emit({ t: 'toast', msg: 'Hôm nay bạn đã phóng sinh đủ rồi.' });
          const bag = prof.fishBag = prof.fishBag || {};
          if (!(bag[f.id] > 0)) return emit({ t: 'toast', msg: `Giỏ chưa có ${f.name} — mua cá của Cô Ba trước rồi mới thả được nhé 🐟` });
          bag[f.id]--; d.fish = (d.fish || 0) + 1; prof.phuoc += f.reward;
          const scooped = Math.random() < RU.FISH_RULES.scoopRate;
          emit({ t: 'fish', id: 'me', name: me.name, kind: f.id, scooped, wish: String(m.wish || '').slice(0, 70) });
          emit({ t: 'profile', profile: profile(), msg: `${f.icon} Đã phóng sinh ${f.name} · +${f.reward} phước${scooped ? ' (phước vẫn tính dù cá… quay về thúng Cô Ba 😅)' : ''}` });
          break;
        }
        case 'wash': { if (!near(me, L.well, 160)) return; me.stink = 0; emit({ t: 'stink', id: 'me', ms: 0 }); emit({ t: 'toast', msg: 'Rửa tay xà phòng sạch bong, ruồi bay hết rồi 🧼' }); break; }
        case 'cauSit': { const st = L.cauSeats[m.seat | 0]; if (!st) return; if (bots.some(o => o.pose === 'fish' && o.seat === st.id)) return emit({ t: 'toast', msg: 'Ghế này có người ngồi rồi 🎣' }); me.seat = st.id; me.x = st.x; me.y = st.y; emit({ t: 'pose', id: 'me', pose: 'fish', seat: st.id }); break; }
        case 'cauLeave': me.cast = null; me.seat = null; emit({ t: 'pose', id: 'me', pose: '' }); break;
        case 'cauCast': {
          if (me.seat === null || me.seat === undefined) return; const d = dd();
          if ((d.cau || 0) >= RU.CAU.perDay) return emit({ t: 'cauNo', msg: `Hôm nay bạn đã quăng câu ${RU.CAU.perDay} lần rồi.` });
          if (!RU.useStamina(prof, RU.CAU.cost, Date.now())) return tired();
          const br = RU.rollBrief(RU.DEFAULT_BRIEFS); d.cau = (d.cau || 0) + 1;
          const delay = RU.CAU.biteMin + Math.random() * (RU.CAU.biteMax - RU.CAU.biteMin); me.cast = { id: br.id, rarity: br.rarity, biteAt: Date.now() + delay };
          emit({ t: 'cauBite', delay: Math.round(delay), rarity: br.rarity, profile: profile() }); break;
        }
        case 'cauReel': {
          const c = me.cast; if (!c) return; me.cast = null; const since = Date.now() - c.biteAt, hook = +m.hook;
          const valid = hook >= 0 && hook <= RU.CAU.hookMs && since >= hook - 250;
          if (!valid || !m.ok) return emit({ t: 'cauResult', ok: false, profile: profile() });
          const b = RU.DEFAULT_BRIEFS.find(x => x.id === c.id), R = RU.RARITY.find(x => x.id === c.rarity);
          prof.briefs = prof.briefs || {}; const first = !prof.briefs[b.id]; prof.briefs[b.id] = (prof.briefs[b.id] || 0) + 1; prof.phuoc += R.reward;
          emit({ t: 'cauResult', ok: true, brief: b, first, count: prof.briefs[b.id], gain: R.reward, profile: profile() }); break;
        }
        case 'fortuneAccept': {
          const d = dd(), i = (m.no | 0) - 1; if (d.acc || !d.fq.includes(i)) return;
          d.acc = { no: i + 1, text: fortunes[i] || '' };
          emit({ t: 'profile', profile: profile(), msg: `Đã đón nhận quẻ số ${i + 1} · áp dụng cả ngày hôm nay 🏮` });
          break;
        }
        case 'incense': {
          if (Date.now() - me.lastIncense < 5000) return emit({ t: 'toast', msg: 'Nhang vừa thắp, hãy tĩnh tâm một chút rồi thắp tiếp nhé 🙏' });
          const atBowl = near(me, L.bowl, L.bowl.radius + 60), atAltar = near(me, L.altar, L.altar.radius + 60);
          if (!atBowl && !atAltar) return;
          if (!RU.useStamina(prof, RU.COST.incense, Date.now())) return tired();
          const appId = atBowl && !atAltar ? 'all' : m.app === 'all' ? altar[0].id : m.app;
          me.lastIncense = Date.now(); lightIncense(me, appId, String(m.wish || '').slice(0, 70));
          prof.phuoc += 3; const app = altar.find(a => a.id === appId);
          emit({ t: 'profile', profile: profile(), msg: app ? `+3 phước · Tổ ${app.name} đã chứng giám` : '+3 phước · Chư vị Tổ Nghiệp đã chứng giám 🙏' });
          break;
        }
        case 'dig': {
          const s = plots[m.plot | 0], def = L.plots[m.plot | 0];
          if (!s || !near(me, def, L.plotRadius + 60)) return emit({ t: 'toast', msg: 'Lại gần luống rau hơn chút nữa nhé' });
          if (s.state !== 'ripe') return emit({ t: 'toast', msg: 'Luống này vừa được đào, chờ rau mọc lại nhé 🌱' });
          profile();
          if (prof.digsToday >= cfg.digsPerDay) return emit({ t: 'digResult', ok: false, reason: 'limit', profile: profile() });
          if (!RU.useStamina(prof, RU.COST.dig, Date.now())) return tired();
          prof.digsToday++; prof.phuoc += 1;
          s.state = 'dug'; s.regrowAt = Date.now() + cfg.regrowSec * 1000; emit({ t: 'plot', plot: s, by: 'me' });
          const roll = Math.random() * 100; let cum = 0, won = null;
          for (const v of vouchers) { cum += +v.rate || 0; if (roll < cum) { won = v; break; } }
          if (won) {
            const award = { title: won.title, description: won.description, code: code(won.prefix || 'PIK'), link: 'https://piklab.vn', time: Date.now() };
            prof.wins.push(award);
            emit({ t: 'digResult', ok: true, win: true, award, profile: profile() });
          } else if (Math.random() * 100 < RU.POOP.rate) { emit({ t: 'stink', id: 'me', ms: RU.POOP.stinkMs, plot: m.plot | 0 }); me.stink = Date.now() + RU.POOP.stinkMs; emit({ t: 'digResult', ok: true, win: false, poop: true, profile: profile() }); }
          else { prof.rau++; emit({ t: 'digResult', ok: true, win: false, profile: profile() }); }
          break;
        }
        case 'feed': {
          const a = L.animals.find(x => x.id === m.animal);
          if (!a) return;
          if (prof.rau <= 0) return emit({ t: 'toast', msg: 'Bạn chưa có bó rau nào — ra vườn đào đất nhé 🥬' });
          if (!RU.useStamina(prof, RU.COST.feed, Date.now())) return tired();
          prof.rau--; prof.phuoc += 5;
          emit({ t: 'fed', animal: a.id, by: 'me', name: me.name });
          emit({ t: 'profile', profile: profile(), msg: `${a.name} ăn ngon lành · +5 phước 🍀` });
          break;
        }
        case 'sweep': {
          const def = L.leaves[m.leaf | 0], lf = leaves[m.leaf | 0]; if (!def || !lf || !near(me, def, L.leafRadius + 70)) return;
          if (lf.state !== 'full') return emit({ t: 'toast', msg: 'Ụ lá này vừa được quét rồi 🍂' });
          if (!RU.useStamina(prof, RU.COST.sweep, Date.now())) return tired();
          lf.state = 'swept'; lf.regrowAt = Date.now() + 45000; prof.phuoc += prices.sweep;
          emit({ t: 'leaf', leaf: lf, by: 'me' }); emit({ t: 'profile', profile: profile(), msg: `Quét sạch lá đa · +${prices.sweep} phước 🍃` });
          break;
        }
        case 'fortune': {
          const d = dd();
          if (d.acc) return emit({ t: 'toast', msg: `Hôm nay bạn đã đón nhận quẻ số ${d.acc.no} rồi 🙏` });
          if (d.fq.length >= FORTUNE_PER_DAY) return emit({ t: 'fortunePick', profile: profile() });
          if (prof.phuoc < prices.fortune) return emit({ t: 'toast', msg: `Xin quẻ cần ${prices.fortune} phước.` });
          if (!RU.useStamina(prof, RU.COST.fortune, Date.now())) return tired();
          prof.phuoc -= prices.fortune; let i = Math.random() * fortunes.length | 0;
          for (let k = 0; k < 6 && d.fq.includes(i); k++) i = Math.random() * fortunes.length | 0;
          d.fq.push(i);
          emit({ t: 'fortune', no: i + 1, text: fortunes[i], profile: profile() });
          break;
        }
        case 'say': {
          if (Date.now() - me.lastSay < 2500) return emit({ t: 'toast', msg: 'Từ từ thôi, để còn lấy hơi 😮‍💨' });
          const text = RU.filterText(m.text, RU.DEFAULT_BANNED); if (!text) return;
          if (prof.phuoc < prices.shout) return emit({ t: 'toast', msg: 'Hết phước để khẩu nghiệp rồi 😅' });
          if (!RU.useStamina(prof, RU.COST.shout, Date.now())) return tired();
          me.lastSay = Date.now(); prof.phuoc -= prices.shout;
          emit({ t: 'say', id: 'me', text }); emit({ t: 'profile', profile: profile() });
          setTimeout(() => { const b = bots.find(x => Math.hypot(x.x - me.x, x.y - me.y) < 600); if (b) emit({ t: 'say', id: b.id, text: ['Đồng ý!!!', 'Nói hay lắm!', 'Tui cũng vậy nè 😭', 'Bình tĩnh bạn ơi 🙏'][Math.random() * 4 | 0] }); }, 1500);
          break;
        }
        case 'buy': case 'equip': {
          const list = m.kind === 'hat' ? RU.HATS : m.kind === 'color' ? RU.COLORS : m.kind === 'outfit' ? RU.OUTFITS : null; if (!list) return;
          const it = list.find(x => x.id === m.id); if (!it) return;
          const owned = acc.items[m.kind + 's']; let bought = false;
          if (!owned.includes(it.id)) {
            if (m.t === 'equip') return;
            if (prof.phuoc < it.price) return emit({ t: 'toast', msg: `Cần ${it.price} phước để mua ${it.name}.` });
            prof.phuoc -= it.price; owned.push(it.id); bought = true;
          }
          acc[m.kind] = it.id;
          look(); emit({ t: 'profile', profile: profile(), msg: bought ? `Đã mua ${it.name} · -${it.price} phước ✨` : `Đã thay ${it.name}` });
          break;
        }
        case 'haircut': {
          const h = RU.HAIRS.find(x => x.id === m.id); if (!h) return;
          if (prof.phuoc < h.price) return emit({ t: 'toast', msg: `Cắt kiểu này cần ${h.price} phước.` });
          prof.phuoc -= h.price; acc.hair = h.id; if (h.id === 'bald') acc.hat = 'none';
          look(); emit({ t: 'profile', profile: profile(), msg: h.id === 'bald' ? 'Xoẹt xoẹt… đầu trọc bóng loáng 🪒' : `Đã cắt kiểu ${h.name} ✂️` });
          break;
        }
        case 'eat': {
          const f = RU.FOODS.find(x => x.id === m.id); if (!f) return;
          const st = RU.stamina(prof, Date.now());
          if (st >= RU.STAMINA_MAX) return emit({ t: 'toast', msg: 'Bụng no căng rồi, đi chơi tiếp thôi!' });
          if (prof.phuoc < f.price) return emit({ t: 'toast', msg: `Món này ${f.price} phước, bạn chưa đủ.` });
          prof.phuoc -= f.price; prof.st = Math.min(RU.STAMINA_MAX, st + f.st);
          emit({ t: 'emote', id: 'me', e: 'heart' }); emit({ t: 'profile', profile: profile(), msg: `${f.icon} ${f.name} ngon quá · +${f.st} sinh lực` });
          break;
        }
        case 'tugOffer': {
          const bet = +m.bet; if (!RU.TUG_BETS.includes(bet) || tug.match) return;
          if (prof.phuoc < bet) return emit({ t: 'toast', msg: `Cược ${bet} phước mà bạn chưa đủ phước.` });
          if (RU.stamina(prof, Date.now()) < RU.COST.tug) return tired();
          tug.offers = [{ id: 'me', name: me.name, bet }]; emit({ t: 'tugState', tug: tugState() });
          setTimeout(botAccept, 2500 + Math.random() * 1500);
          break;
        }
        case 'tugCancel': tug.offers = []; emit({ t: 'tugState', tug: tugState() }); break;
        case 'tug': {
          const mt = tug.match, now = Date.now(); if (!mt) return;
          if (now < mt.startAt - 150 || now > mt.endAt + RU.TUG.grace) return;
          if (now - (mt.last || 0) < RU.TUG.minGap) return; mt.last = now; mt.pos -= 1; mt.ca = (mt.ca || 0) + 1; mt.changed = true;
          break;
        }
      }
    }
  };
};
})();
