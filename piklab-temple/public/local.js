/* Chế độ DEMO offline: giả lập server ngay trong trình duyệt (bot đi lại, voucher demo) */
(function () {
'use strict';
const L = window.LAYOUT;
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
const WISHES = ['Khách duyệt bản đầu tiên', 'Render không crash', 'Deadline lùi 1 tuần', 'In ra đúng màu', 'Không bị “logo to hơn”', 'File không corrupt', 'Lương về đúng hẹn', 'Font không lỗi'];
const BOTS = [
  ['Thích Kéo Layer', '#2c7a7b', 'non'], ['Thích Căn Lề', '#8e44ad', 'headphone'], ['Thích Pen Tool', '#d35400', 'beanie'],
  ['Thích Keyframe', '#2b6cb0', 'none'], ['Thích Gradient', '#b7791f', 'non']
];
const POI = {
  altar: [[1060, 420], [940, 430], [1150, 400], [860, 410]], bowl: [[1080, 700], [920, 700], [1000, 760]],
  garden: L.plots.map(p => [p.x, p.y + 40]), pen: [[1500, 1080], [1700, 1100], [1600, 950], [1800, 1180]], bell: [[330, 430], [420, 420]],
  wander: [[1100, 900], [900, 1100], [1100, 1200], [700, 900], [1300, 900], [600, 560]]
};
const HUB = [1100, 860];

window.LocalServer = function (deliver) {
  const emit = m => setTimeout(() => deliver(m), 0);
  const cfg = Object.assign({ digsPerDay: 5, regrowSec: 40 }, get('pk_demo_cfg', {}));
  const altar = get('pk_demo_altar', null) || DEFAULT_ALTAR;
  const vouchers = get('pk_demo_vouchers', null) || DEFAULT_VOUCHERS;
  const prof = Object.assign({ phuoc: 0, rau: 0, digDay: '', digsToday: 0, wins: [] }, get('pk_demo_profile', {}));
  const day = () => new Date().toISOString().slice(0, 10);
  const profile = () => {
    if (prof.digDay !== day()) { prof.digDay = day(); prof.digsToday = 0; }
    put('pk_demo_profile', prof);
    return { phuoc: prof.phuoc, rau: prof.rau, digsLeft: Math.max(0, cfg.digsPerDay - prof.digsToday), digsPerDay: cfg.digsPerDay, wins: prof.wins };
  };
  const plots = L.plots.map(p => ({ id: p.id, state: 'ripe', regrowAt: 0 }));
  let incense = [], me = null;
  const bots = BOTS.map(([name, color, hat], i) => ({ id: 'bot' + i, name, color, hat, x: 1000 + (i - 2) * 60, y: 1150 - i * 30, dir: 1, moving: false, path: [], wait: 1 + i * 1.5, goal: null }));
  const rooms = () => [{ id: 'chua-1', name: 'Chùa 1', num: 1, online: bots.length + 1, capacity: 30 }];
  const pub = b => ({ id: b.id, name: b.name, color: b.color, hat: b.hat, x: b.x, y: b.y, dir: b.dir, moving: b.moving });
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
      } else if ((b.wait -= dt) <= 0) {
        const kinds = ['altar', 'bowl', 'garden', 'pen', 'wander', 'wander', 'bell', 'bowl'];
        const kind = kinds[Math.random() * kinds.length | 0], list = POI[kind], tgt = list[Math.random() * list.length | 0];
        b.goal = kind; b.path = [HUB, kind === 'altar' ? [1080, 520] : HUB, [tgt[0] + (Math.random() - .5) * 30, tgt[1] + (Math.random() - .5) * 20]];
        if (kind === 'bell' || kind === 'garden') b.path.splice(2, 0, [700, 570]);
        if (kind === 'garden') b.path.splice(3, 0, [620, 910]);
        if (kind === 'pen') b.path.splice(2, 0, [1380, 910]);
      }
    }
    if (moved.length) emit({ t: 's', p: moved });
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
    else if (r < .4) emit({ t: 'emote', id: b.id, e: ['pray', 'zen', 'wave', 'heart'][Math.random() * 4 | 0] });
  }

  return {
    demo: true,
    config: { cfg, altar, vouchers, save() { put('pk_demo_cfg', cfg); put('pk_demo_altar', altar); put('pk_demo_vouchers', vouchers); }, reset() { prof.digsToday = 0; emit({ t: 'profile', profile: profile(), msg: 'Đã hồi lại lượt đào hôm nay' }); }, defaults: { altar: DEFAULT_ALTAR, vouchers: DEFAULT_VOUCHERS } },
    send(m) {
      switch (m.t) {
        case 'hello':
          me = { id: 'me', name: m.name, color: m.color, hat: m.hat, x: L.spawn.x, y: L.spawn.y, dir: 1, lastIncense: 0 };
          emit({ t: 'welcome', you: pub(me), room: { id: 'chua-1', name: 'Chùa 1', num: 1, capacity: 30 }, players: bots.map(pub), plots, incense, altar, templeName: 'Chùa Tổ Nghiệp Designer', shopUrl: 'https://piklab.vn', profile: profile(), pid: 'demo', rooms: rooms(), serverTime: Date.now(), regrowSec: cfg.regrowSec, demo: true });
          setTimeout(() => lightIncense(bots[1], 'ps', 'Khách duyệt bản đầu tiên'), 2500);
          break;
        case 'move': me.x = m.x; me.y = m.y; break;
        case 'emote': emit({ t: 'emote', id: 'me', e: m.e }); break;
        case 'bell': emit({ t: 'bell', by: me.name }); break;
        case 'incense': {
          if (Date.now() - me.lastIncense < 5000) return emit({ t: 'toast', msg: 'Nhang vừa thắp, hãy tĩnh tâm một chút rồi thắp tiếp nhé 🙏' });
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
          prof.rau--; prof.phuoc += 5;
          emit({ t: 'fed', animal: a.id, by: 'me', name: me.name });
          emit({ t: 'profile', profile: profile(), msg: `${a.name} ăn ngon lành · +5 phước 🍀` });
          break;
        }
      }
    }
  };
};
})();
