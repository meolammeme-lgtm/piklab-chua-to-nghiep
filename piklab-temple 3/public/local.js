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
  const pubA = a => ({ name: a.name, color: a.color, hat: a.hat, hair: a.hair || 'bun' });
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
  a.items = a.items || { hats: [], colors: [] };
  a.items.hats = [...new Set([...RU.HATS.filter(h => !h.price).map(h => h.id), ...a.items.hats, a.hat])];
  a.items.colors = [...new Set([...RU.COLORS.filter(c => !c.price).map(c => c.id), ...a.items.colors, a.color])];
  return a;
}
const SHOUTS = ['Khách ơi đừng sửa nữa mà!!!', 'Ai đặt tên layer là "Layer 1 copy 37" vậy?!', 'Logo to hơn nhưng nhỏ lại là sao trời!', 'Deadline ơi tha cho tui!', 'File final_final_v9 là file nào???', 'Ủa sao màu in khác màn hình vậy?!', 'Em cứ sáng tạo thoải mái… rồi sửa 12 lần!'];

const WISHES = ['Khách duyệt bản đầu tiên', 'Render không crash', 'Deadline lùi 1 tuần', 'In ra đúng màu', 'Không bị “logo to hơn”', 'File không corrupt', 'Lương về đúng hẹn', 'Font không lỗi'];
const BOTS = [
  ['Thích Kéo Layer', '#7a5a43', 'bald'], ['Thích Căn Lề', '#6f7d8c', 'khan'], ['Thích Pen Tool', '#c9902e', 'bald'],
  ['Thích Keyframe', '#3b4f7a', 'none'], ['Thích Gradient', '#efe7d6', 'non']
];
const POI = {
  altar: [[1060, 420], [940, 430], [1150, 400], [860, 410]], bowl: [[1080, 700], [920, 700], [1000, 760]],
  garden: L.plots.map(p => [p.x, p.y + 40]), pen: [[1500, 1080], [1700, 1100], [1600, 950], [1800, 1180]], bell: [[330, 430], [420, 420]],
  wander: [[1100, 900], [900, 1100], [1100, 1200], [700, 900], [1300, 900], [600, 560]],
  shout: [[1500, 2060], [1620, 2120], [1560, 2000]], sweep: L.leaves.map(l => [l.x, l.y + 40]), eat: [[1250, 1880], [1350, 1890]]
};
const HUB = [1100, 860];

window.LocalServer = function (deliver) {
  const emit = m => setTimeout(() => deliver(m), 0);
  const cfg = Object.assign({ digsPerDay: 5, regrowSec: 40 }, get('pk_demo_cfg', {}));
  const altar = get('pk_demo_altar', null) || DEFAULT_ALTAR;
  const vouchers = get('pk_demo_vouchers', null) || DEFAULT_VOUCHERS;
  let profKey = 'pk_demo_profile', prof = { phuoc: 20, rau: 0, digDay: '', digsToday: 0, wins: [] }, acc = null;
  const day = () => new Date().toISOString().slice(0, 10);
  const profile = () => {
    if (prof.digDay !== day()) { prof.digDay = day(); prof.digsToday = 0; }
    put(profKey, prof);
    const st = RU.stamina(prof, Date.now()); put(profKey, prof);
    return { phuoc: prof.phuoc, rau: prof.rau, digsLeft: Math.max(0, cfg.digsPerDay - prof.digsToday), digsPerDay: cfg.digsPerDay, wins: prof.wins, st, stMax: RU.STAMINA_MAX, look: acc ? { color: acc.color, hat: acc.hat, hair: acc.hair } : {}, items: acc ? acc.items : { hats: [], colors: [] } };
  };
  const plots = L.plots.map(p => ({ id: p.id, state: 'ripe', regrowAt: 0 }));
  const leaves = L.leaves.map(l => ({ id: l.id, state: 'full', regrowAt: 0 }));
  const prices = { fortune: 5, shout: 1, sweep: 2 }, fortunes = get('pk_demo_fortunes', null) || RU.DEFAULT_FORTUNES;
  const tug = { offers: [], match: null };
  const tugState = () => ({ offers: tug.offers, match: tug.match && { a: tug.match.a, b: tug.match.b, aName: tug.match.aName, bName: tug.match.bName, bet: tug.match.bet, pos: tug.match.pos, startAt: tug.match.startAt, endAt: tug.match.endAt } });
  const tired = () => emit({ t: 'tired', profile: profile() });
  const look = () => { saveAccount(acc); me.color = acc.color; me.hat = acc.hat; me.hair = acc.hair; emit({ t: 'look', id: 'me', color: acc.color, hat: acc.hat, hair: acc.hair }); };
  const M = L.market;
  let incense = [], me = null;
  const bots = BOTS.map(([name, color, hat], i) => ({ id: 'bot' + i, name, color, hat: hat === 'bald' ? 'none' : hat, hair: hat === 'bald' ? 'bald' : 'bun', x: 1000 + (i - 2) * 60, y: 1150 - i * 30, dir: 1, moving: false, path: [], wait: 1 + i * 1.5, goal: null }));
  const rooms = () => [{ id: 'chua-1', name: 'Chùa 1', num: 1, online: bots.length + 1, capacity: 30 }];
  const pub = b => ({ id: b.id, name: b.name, color: b.color, hat: b.hat, hair: b.hair, x: b.x, y: b.y, dir: b.dir, moving: b.moving });
  const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < r;
  const code = prefix => prefix + '-' + Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');

  function lightIncense(who, appId, wish) {
    const app = altar.find(a => a.id === appId) || altar[0];
    const stick = { id: Math.random().toString(36).slice(2), by: who.name, app: app.id, appName: app.name, wish, t: Date.now(), slot: Math.random() * 1000 | 0 };
    incense.push(stick); if (incense.length > 40) incense.shift();
    emit({ t: 'incense', stick, by: who.id });
  }

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
        moved.push([b.id, Math.round(b.x), Math.round(b.y), b.dir, b.moving ? 1 : 0]);
      } else if (b.tugging) { /* đang kéo co */ } else if ((b.wait -= dt) <= 0) {
        const kinds = ['altar', 'bowl', 'garden', 'pen', 'wander', 'bell', 'shout', 'sweep', 'eat', 'shout'];
        const kind = kinds[Math.random() * kinds.length | 0], list = POI[kind], tgt = list[Math.random() * list.length | 0];
        b.goal = kind; b.path = [HUB, kind === 'altar' ? [1080, 520] : HUB, [tgt[0] + (Math.random() - .5) * 30, tgt[1] + (Math.random() - .5) * 20]];
        if (kind === 'bell' || kind === 'garden') b.path.splice(2, 0, [700, 570]);
        if (kind === 'garden') b.path.splice(3, 0, [620, 910]);
        if (kind === 'pen') b.path.splice(2, 0, [1380, 910]);
        if (['shout', 'sweep', 'eat'].includes(kind)) { b.path = [[1000, b.y < 1450 ? 1300 : b.y], [1000, 1600], [1000, 1890], b.path[2]]; if (b.y > 1500) b.path.splice(0, 1); }
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
    if ((b.goal === 'altar' || b.goal === 'bowl') && r < .75) { emit({ t: 'emote', id: b.id, e: 'bow' }); setTimeout(() => lightIncense(b, altar[Math.random() * altar.length | 0].id, Math.random() < .8 ? WISHES[Math.random() * WISHES.length | 0] : ''), 600); }
    else if (b.goal === 'garden') {
      const pl = L.plots.map((p, i) => [p, plots[i]]).filter(([p, s]) => s.state === 'ripe').sort((a, c) => Math.hypot(a[0].x - b.x, a[0].y - b.y) - Math.hypot(c[0].x - b.x, c[0].y - b.y))[0];
      if (pl && Math.hypot(pl[0].x - b.x, pl[0].y - b.y) < 160 && r < .7) { const s = pl[1]; s.state = 'dug'; s.regrowAt = Date.now() + cfg.regrowSec * 1000; emit({ t: 'plot', plot: s, by: b.id }); }
    } else if (b.goal === 'pen' && r < .6) { const a = L.animals[Math.random() * 4 | 0]; emit({ t: 'fed', animal: a.id, by: b.id, name: b.name }); }
    else if (b.goal === 'bell' && r < .6) emit({ t: 'bell', by: b.name });
    else if (b.goal === 'shout' && r < .85) emit({ t: 'say', id: b.id, text: SHOUTS[Math.random() * SHOUTS.length | 0] });
    else if (b.goal === 'sweep') { const lf = leaves.filter(x => x.state === 'full').sort((p, q) => Math.hypot(L.leaves[p.id].x - b.x, L.leaves[p.id].y - b.y) - Math.hypot(L.leaves[q.id].x - b.x, L.leaves[q.id].y - b.y))[0]; if (lf && Math.hypot(L.leaves[lf.id].x - b.x, L.leaves[lf.id].y - b.y) < 140) { lf.state = 'swept'; lf.regrowAt = Date.now() + 45000; emit({ t: 'leaf', leaf: lf, by: b.id }); } }
    else if (b.goal === 'eat') emit({ t: 'emote', id: b.id, e: 'heart' });
    else if (r < .4) emit({ t: 'emote', id: b.id, e: ['pray', 'zen', 'wave', 'heart'][Math.random() * 4 | 0] });
  }

  // ---- kéo co: bot nhận kèo sau vài giây ----
  function tugTick() {
    const mt = tug.match; if (!mt) return;
    const now = Date.now();
    if (now >= mt.startAt && now <= mt.endAt && Math.random() < mt.botRate) { mt.pos += 1; mt.changed = true; }
    if (mt.changed) { mt.changed = false; emit({ t: 'tugPos', pos: mt.pos }); }
    if (Math.abs(mt.pos) >= RU.TUG.win || now > mt.endAt) endTug(mt.pos < 0 ? 'me' : mt.pos > 0 ? mt.b : null);
  }
  function endTug(winner) {
    const mt = tug.match; if (!mt) return; tug.match = null;
    const bot = bots.find(x => x.id === mt.b); if (bot) { bot.tugging = false; bot.wait = 2; }
    if (winner === 'me') prof.phuoc += mt.bet * 2; else if (!winner) prof.phuoc += mt.bet;
    emit({ t: 'tugEnd', winner, wName: winner === 'me' ? me.name : winner ? mt.bName : '', lName: winner === 'me' ? mt.bName : winner ? me.name : '', bet: mt.bet, pos: mt.pos });
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
    config: { cfg, altar, vouchers, save() { put('pk_demo_cfg', cfg); put('pk_demo_altar', altar); put('pk_demo_vouchers', vouchers); }, reset() { prof.digsToday = 0; emit({ t: 'profile', profile: profile(), msg: 'Đã hồi lại lượt đào hôm nay' }); }, defaults: { altar: DEFAULT_ALTAR, vouchers: DEFAULT_VOUCHERS } },
    send(m) {
      switch (m.t) {
        case 'hello': {
          acc = accountFromToken(m.token);
          if (!acc) return emit({ t: 'authError', msg: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' });
          profKey = 'pk_demo_profile_' + acc.pid; prof = Object.assign({ phuoc: 20, rau: 0, digDay: '', digsToday: 0, wins: [] }, get(profKey, {}));
          ensureAcc(acc); saveAccount(acc);
          me = { id: 'me', name: acc.name, color: acc.color, hat: acc.hat, hair: acc.hair, x: L.spawn.x, y: L.spawn.y, dir: 1, lastIncense: 0, lastSay: 0 };
          emit({ t: 'welcome', you: pub(me), room: { id: 'chua-1', name: 'Chùa 1', num: 1, capacity: 30 }, players: bots.map(pub), plots, incense, altar, templeName: 'Chùa Tổ Nghiệp Designer', shopUrl: 'https://piklab.vn', profile: profile(), pid: 'demo', rooms: rooms(), serverTime: Date.now(), regrowSec: cfg.regrowSec, demo: true, leaves, leafRegrowSec: 45, tug: tugState(), prices });
          setTimeout(() => lightIncense(bots[1], 'ps', 'Khách duyệt bản đầu tiên'), 2500);
          break;
        }
        case 'move': me.x = m.x; me.y = m.y; break;
        case 'emote': emit({ t: 'emote', id: 'me', e: m.e }); break;
        case 'bell': if (!RU.useStamina(prof, RU.COST.bell, Date.now())) return tired(); emit({ t: 'bell', by: me.name }); emit({ t: 'profile', profile: profile() }); break;
        case 'incense': {
          if (Date.now() - me.lastIncense < 5000) return emit({ t: 'toast', msg: 'Nhang vừa thắp, hãy tĩnh tâm một chút rồi thắp tiếp nhé 🙏' });
          if (!RU.useStamina(prof, RU.COST.incense, Date.now())) return tired();
          me.lastIncense = Date.now(); lightIncense(me, m.app, String(m.wish || '').slice(0, 70));
          prof.phuoc += 3; const app = altar.find(a => a.id === m.app) || altar[0];
          emit({ t: 'profile', profile: profile(), msg: `+3 phước · Tổ ${app.name} đã chứng giám` });
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
          } else { prof.rau++; emit({ t: 'digResult', ok: true, win: false, profile: profile() }); }
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
          if (prof.phuoc < prices.fortune) return emit({ t: 'toast', msg: `Gieo quẻ cần ${prices.fortune} phước.` });
          if (!RU.useStamina(prof, RU.COST.fortune, Date.now())) return tired();
          prof.phuoc -= prices.fortune; const i = Math.random() * fortunes.length | 0;
          emit({ t: 'fortune', no: i + 1, text: fortunes[i], profile: profile() });
          break;
        }
        case 'say': {
          if (!near(me, M.shout, M.shout.r + 60)) return emit({ t: 'toast', msg: 'Chỉ được khẩu nghiệp trong Bãi Khẩu Nghiệp thôi nhé 🤫' });
          if (Date.now() - me.lastSay < 2500) return emit({ t: 'toast', msg: 'Từ từ thôi, để còn lấy hơi 😮‍💨' });
          const text = RU.filterText(m.text, RU.DEFAULT_BANNED); if (!text) return;
          if (prof.phuoc < prices.shout) return emit({ t: 'toast', msg: 'Hết phước để khẩu nghiệp rồi 😅' });
          if (!RU.useStamina(prof, RU.COST.shout, Date.now())) return tired();
          me.lastSay = Date.now(); prof.phuoc -= prices.shout;
          emit({ t: 'say', id: 'me', text }); emit({ t: 'profile', profile: profile() });
          setTimeout(() => { const b = bots.find(x => Math.hypot(x.x - M.shout.x, x.y - M.shout.y) < 400); if (b) emit({ t: 'say', id: b.id, text: ['Đồng ý!!!', 'Nói hay lắm!', 'Tui cũng vậy nè 😭', 'Bình tĩnh bạn ơi 🙏'][Math.random() * 4 | 0] }); }, 1500);
          break;
        }
        case 'buy': case 'equip': {
          const list = m.kind === 'hat' ? RU.HATS : m.kind === 'color' ? RU.COLORS : null; if (!list) return;
          const it = list.find(x => x.id === m.id); if (!it) return;
          const owned = acc.items[m.kind === 'hat' ? 'hats' : 'colors']; let bought = false;
          if (!owned.includes(it.id)) {
            if (m.t === 'equip') return;
            if (prof.phuoc < it.price) return emit({ t: 'toast', msg: `Cần ${it.price} phước để mua ${it.name}.` });
            prof.phuoc -= it.price; owned.push(it.id); bought = true;
          }
          if (m.kind === 'hat') acc.hat = it.id; else acc.color = it.id;
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
          const mt = tug.match, now = Date.now(); if (!mt || now < mt.startAt || now > mt.endAt) return;
          if (now - (mt.last || 0) < 45) return; mt.last = now; mt.pos -= 1; mt.changed = true;
          break;
        }
      }
    }
  };
};
})();
