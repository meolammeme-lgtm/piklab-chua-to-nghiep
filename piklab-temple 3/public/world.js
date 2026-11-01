/* Dựng khuôn viên chùa 3D (phong cách diorama) */
(function () {
'use strict';
const { M4, P, Geo } = window.ENGINE;
const T = (x, y, z, ry, sx, sy, sz, rx, rz) => M4.trs(x, y, z, ry || 0, sx === undefined ? 1 : sx, sy === undefined ? (sx === undefined ? 1 : sx) : sy, sz === undefined ? (sx === undefined ? 1 : sx) : sz, rx || 0, rz || 0);
const cache = {};
const C = (key, fn) => cache[key] || (cache[key] = fn());
const rb = (w, h, d, r = .05, s = 2) => C(`rb${w},${h},${d},${r},${s}`, () => P.rbox(w, h, d, r, s));
const cy = (rt, rb_, h, s = 16) => C(`cy${rt},${rb_},${h},${s}`, () => P.cyl(rt, rb_, h, s));
const sp = (r, s = 12) => C(`sp${r},${s}`, () => P.sphere(r, s));

function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

const PAL = {
  grass: '#8aa66a', grass2: '#97b277', grass3: '#7a9a5e', soilSide: '#9a7052', soilDeep: '#6f5040',
  tileA: '#968d80', tileB: '#918878', tileC: '#9c9386', tileHA: '#6f4b3e', tileHB: '#6a473a',
  wall: '#e8d2a0', cap: '#7f4a3c', red: '#8e2f24', redDk: '#62261d', gold: '#c9a862', wood: '#a88262', woodDk: '#6e5340',
  roof: '#8a5242', roofDk: '#6a3e33', jade: '#5c9a88', stone: '#d6cdbb', stone2: '#b4aa98', bronze: '#a88449', water: '#6fa8b4',
  leaf: '#6a9a54', leaf2: '#7fa865', leaf3: '#5a8649', pink: '#e7b7c4', pink2: '#f0cfd8', pink3: '#d99fb1', cream: '#f6ecd9', skin: '#f0c9a3', hair: '#3a2a20'
};

/* ---------------- Ảnh texture (canvas) ---------------- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const FONT = '"Be Vietnam Pro", system-ui, sans-serif', SERIF = '"Noto Serif", Georgia, serif';
function signCanvas(text, w, h, opt = {}) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = opt.bg || '#7a2a20'; rr(g, 0, 0, w, h, opt.r || 14); g.fill();
  g.strokeStyle = '#d8b56a'; g.lineWidth = Math.max(4, h * .07); rr(g, h * .1, h * .1, w - h * .2, h - h * .2, (opt.r || 14) * .7); g.stroke();
  g.fillStyle = opt.fg || '#f3dca2'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = opt.size || h * .42; g.font = `700 ${fs}px ${opt.serif === false ? FONT : SERIF}`;
  while (g.measureText(text).width > w * .86 && fs > 8) { fs -= 2; g.font = `700 ${fs}px ${opt.serif === false ? FONT : SERIF}`; }
  g.fillText(text, w / 2, h / 2 + 2);
  return c;
}
function verticalSign(words, w, h) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#7a2a20'; rr(g, 0, 0, w, h, 12); g.fill();
  g.strokeStyle = '#d8b56a'; g.lineWidth = 6; rr(g, 10, 10, w - 20, h - 20, 8); g.stroke();
  g.fillStyle = '#f3dca2'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const inner = w - 44, slot = (h - 60) / words.length;
  words.forEach((wd, i) => {
    let fs = Math.min(slot * .55, w * .34); g.font = `700 ${fs}px ${SERIF}`;
    while (g.measureText(wd).width > inner && fs > 10) { fs -= 1; g.font = `700 ${fs}px ${SERIF}`; }
    g.fillText(wd, w / 2, 30 + slot * (i + .5));
  });
  return c;
}
function plaqueCanvas(app, img) {
  const w = 160, h = 280, c = canvas(w, h), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#a83524'); gr.addColorStop(1, '#6e1c12');
  g.fillStyle = gr; rr(g, 0, 0, w, h, 70); g.fill();
  g.strokeStyle = '#f2c55c'; g.lineWidth = 8; rr(g, 10, 10, w - 20, h - 20, 62); g.stroke();
  if (img) {
    g.fillStyle = '#fff8ea'; rr(g, 24, 54, 112, 112, 22); g.fill();
    try { const s = Math.min(96 / img.naturalWidth, 96 / img.naturalHeight); const iw = img.naturalWidth * s, ih = img.naturalHeight * s; g.drawImage(img, 80 - iw / 2, 110 - ih / 2, iw, ih); } catch (e) {}
  } else {
    g.fillStyle = app.color || '#f2c55c'; g.globalAlpha = .9; g.beginPath(); g.arc(80, 108, 50, 0, 7); g.fill(); g.globalAlpha = 1;
    g.fillStyle = '#2b140c'; g.beginPath(); g.arc(80, 108, 43, 0, 7); g.fill();
    g.fillStyle = '#ffe2a0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 46px ${SERIF}`; g.fillText(app.short || app.name.slice(0, 2), 80, 110);
  }
  g.fillStyle = '#ffe9bf'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 22; g.font = `700 ${fs}px ${FONT}`; while (g.measureText(app.name).width > 128 && fs > 11) { fs--; g.font = `700 ${fs}px ${FONT}`; }
  g.fillText(app.name, 80, 205);
  g.fillStyle = app.color || '#f2c55c'; rr(g, 46, 232, 68, 8, 4); g.fill();
  return c;
}

/* ---------------- Cảnh tĩnh ---------------- */
function build(R, L) {
  const world = new Geo(), glow = new Geo(), roof = new Geo(), gate = new Geo(), water = new Geo(), decal = new Geo();
  const items = [], texItems = [];
  const r = rng(7);
  const k = .01; // px -> đơn vị 3D
  const addTex = (cv, w, h, m, em = .35, frame) => { const tex = R.texture(cv); if (frame) world.add(frame[0], frame[1], frame[2]); texItems.push({ mesh: R.mesh(new Geo().add(P.quad(w, h), '#ffffff')), m, tex, em }); };
  // nhóm dựng ở toạ độ cục bộ rồi phóng to s lần, đặt tại (x, z)
  const grp = (g, x, z, s = 1, y = 0, ry = 0) => { const M = M4.trs(x, y, z, ry, s, s, s); return { add: (pr, c, m) => g.add(pr, c, M4.mul(M, m || M4.ident())) }; };

  // nền diorama nhiều lớp
  const D = L.H * k, DZ = D / 2, WW = L.W * k, WX = WW / 2;
  world.add(rb(WW + .6, .5, D + .6, .22, 3), PAL.grass, T(WX, -.25, DZ));
  world.add(rb(WW + .3, 1.1, D + .3, .3, 3), PAL.soilSide, T(WX, -.95, DZ));
  world.add(rb(WW - .2, .6, D - .2, .25, 2), PAL.soilDeep, T(WX, -1.55, DZ));

  // lát đá liền mạch (lưới 0.5, các viên sát nhau, tông xám nâu trầm)
  const tile = rb(.5, .06, .5, .006, 1), cells = new Set();
  for (const [px0, pz0, px1, pz1] of L.paths) {
    const x0 = px0 * k, z0 = pz0 * k, x1 = px1 * k, z1 = pz1 * k;
    for (let x = Math.floor(x0 * 2) / 2; x < x1; x += .5) for (let z = Math.floor(z0 * 2) / 2; z < z1; z += .5) {
      const cx = x + .25, cz = z + .25; if (cx < x0 || cx > x1 || cz < z0 || cz > z1) continue;
      const key = cx + ',' + cz; if (cells.has(key)) continue; cells.add(key);
      const chk = (Math.round(cx * 2) + Math.round(cz * 2)) % 2;
      world.add(tile, r() < .06 ? PAL.tileC : chk ? PAL.tileA : PAL.tileB, T(cx, .03, cz));
    }
  }
  // cỏ lá (không mọc trên lối đi và các khu đã định)
  const blade = C('blade', () => P.cyl(0, .035, .22, 5));
  const onPath = (x, z) => cells.has((Math.floor(x * 2) / 2 + .25) + ',' + (Math.floor(z * 2) / 2 + .25));
  const blocked = (x, z) => { const X = x / k, Z = z / k;
    if (L.noGrass.some(([a, b, c, d]) => X > a && X < c && Z > b && Z < d)) return true;
    if (Math.hypot((X - L.pond.x) / (L.pond.rx + 40), (Z - L.pond.y) / (L.pond.ry + 30)) < 1) return true;
    return Math.hypot(X - L.market.shout.x, Z - L.market.shout.y) < L.market.shout.r + 20; };
  const nBlades = Math.round(420 * (WW * D) / (20 * 23));
  for (let i = 0; i < nBlades; i++) {
    const x = .7 + r() * (WW - 1.4), z = .7 + r() * (D - 1.4);
    if (onPath(x, z) || blocked(x, z)) continue;
    const c = r() > .5 ? PAL.leaf2 : PAL.grass3;
    for (let j = 0; j < 3; j++) world.add(blade, c, T(x + (j - 1) * .05, 0, z + (r() - .5) * .06, 0, 1, .7 + r() * .6, 1, (j - 1) * .35, (r() - .5) * .3));
    if (r() < .12) world.add(sp(.05, 6), ['#fff4c2', '#ffb3c9', '#ffffff'][(r() * 3) | 0], T(x, .2, z));
  }

  // tường bao
  const wallSeg = (x, z, w, d, h) => { world.add(rb(w, h, d, .08), PAL.wall, T(x, h / 2, z)); world.add(rb(w + .14, .14, d + .14, .05), PAL.cap, T(x, h + .05, z)); };
  const GZ = L.GATE_Y * k + .25, GX = L.gate.x * k;
  wallSeg(WX, .32, WW - .4, .44, 1.0); wallSeg(.32, DZ, .44, D - .8, .8); wallSeg(WW - .32, DZ, .44, D - .8, .8);
  wallSeg((GX - .75) / 2 + .1, GZ, GX - .95, .4, .55); wallSeg((GX + .75 + WW - .2) / 2, GZ, WW - GX - .95, .4, .55);
  wallSeg((GX - 1.4) / 2 + .1, D - .32, GX - 1.6, .4, .5); wallSeg((GX + 1.4 + WW - .2) / 2, D - .32, WW - GX - 1.6, .4, .5);   // tường chợ, chừa lối vào
  for (const [x, z, h] of [[.32, .32, 1.25], [WW - .32, .32, 1.25], [.32, GZ, 1.0], [WW - .32, GZ, 1.0], [.32, D - .32, .9], [WW - .32, D - .32, .9], [GX - 1.4, D - .32, 1.4], [GX + 1.4, D - .32, 1.4]]) { world.add(rb(.62, h, .62, .1), PAL.wall, T(x, h / 2, z)); world.add(rb(.74, .14, .74, .06), PAL.cap, T(x, h + .06, z)); world.add(sp(.12), PAL.gold, T(x, h + .2, z)); }

  /* ---- Chánh điện (dựng ở toạ độ gốc, phóng to L.HALL.s lần rồi dời) ---- */
  const HS = L.HALL.s, HM = M4.trs(L.HALL.ox * k, 0, L.HALL.oy * k, 0, HS, HS, HS);
  const shiftG = g => ({ add: (pr, c, m) => g.add(pr, c, M4.mul(HM, m || M4.ident())) });
  const Wh = shiftG(world), Rh = shiftG(roof), Gh = shiftG(glow);
  Wh.add(rb(6.3, .26, 4.0, .08), '#a14a33', T(10, .0, 3.0));
  for (let x = 7.25; x < 12.75; x += .5) for (let z = 1.45; z < 4.95; z += .5) Wh.add(tile, ((x * 2 + z * 2) | 0) % 2 ? PAL.tileHA : PAL.tileHB, T(x + .25, .11, z + .25));   // mặt gạch .14 — cao hơn mặt nền .13 để không nháy (z-fighting)
  Wh.add(rb(1.3, .02, 2.6, .005), '#c0262a', T(10, .14, 3.55)); // thảm đỏ: 3 lớp xếp bậc, mỗi lớp cao hơn 5mm
  Wh.add(rb(1.1, .02, 2.5, .005), '#e4ad46', T(10, .145, 3.55));
  Wh.add(rb(1.0, .02, 2.4, .005), '#c0262a', T(10, .15, 3.55));
  // bậc thềm: đặt hẳn ra trước mép nền (z > 5.0), mỗi bậc thấp hơn bậc trên — không mặt nào trùng nhau để khỏi nháy
  Wh.add(rb(6.4, .11, .24, .03), PAL.stone, T(10, .055, 5.12));
  Wh.add(rb(6.5, .06, .24, .02), PAL.stone2, T(10, .03, 5.36));
  Wh.add(rb(6.0, 2.85, .3, .06), PAL.wall, T(10, 1.42, 1.25));
  Wh.add(rb(.28, 2.6, 3.7, .06), PAL.wall, T(7.14, 1.3, 2.95));
  Wh.add(rb(.28, 2.6, 3.7, .06), PAL.wall, T(12.86, 1.3, 2.95));
  for (const x of [7.4, 8.6, 11.4, 12.6]) {
    Wh.add(rb(.36, .14, .36, .05), PAL.stone, T(x, .17, 4.8));
    Wh.add(cy(.12, .13, 2.45, 14), PAL.red, T(x, .2, 4.8));
    Wh.add(cy(.15, .15, .1, 14), PAL.gold, T(x, 2.5, 4.8));
    Wh.add(cy(.135, .135, .06, 14), PAL.gold, T(x, .25, 4.8));
  }
  Rh.add(rb(6.3, .24, .26, .05), PAL.redDk, T(10, 2.62, 4.8));
  Rh.add(rb(6.32, .05, .28, .02), PAL.gold, T(10, 2.5, 4.8));
  // hàng ngói ống trên mặt mái
  const rods = (gg, cx, y0, zc, wb, db, wt, dt, h, dzTop = 0, step = .26, col = PAL.roofDk) => {
    for (const side of [1, -1]) for (let x = -wb / 2 + step / 2; x < wb / 2; x += step) {
      const B = [cx + x, y0 + .02, zc + side * db / 2], Tp = [cx + x * wt / wb, y0 + h, zc + dzTop + side * dt / 2];
      const v = [Tp[0] - B[0], Tp[1] - B[1], Tp[2] - B[2]], len = Math.hypot(...v);
      gg.add(cy(.045, .05, 1, 6), col, T(B[0], B[1], B[2], 0, 1, len, 1, Math.atan2(v[2], v[1]), -Math.asin(v[0] / len)));
      gg.add(cy(.06, .06, .05, 8), PAL.gold, T(B[0], B[1] - .03, B[2] + side * .02, 0, 1, 1, 1, side * 1.4));
    }
  };
  // mái 2 tầng (nhóm trong suốt được)
  const horn = (x, y, z, dir, s = 1, gg = Rh) => { for (let i = 0; i < 5; i++) gg.add(sp(.1 * s * (1 - i * .1), 8), i === 4 ? PAL.gold : PAL.roofDk, T(x + dir[0] * i * .09 * s, y + i * i * .03 * s, z + dir[1] * i * .09 * s)); };
  Rh.add(P.frustum(7.2, 5.0, 5.2, 2.3, .95, -.05), PAL.roof, T(10, 2.74, 3.0)); rods(Rh, 10, 2.74, 3.0, 7.2, 5.0, 5.2, 2.3, .95, -.05);
  Rh.add(rb(7.3, .1, 5.1, .05), PAL.roofDk, T(10, 2.74, 3.0));
  Rh.add(rb(7.34, .05, 5.14, .02), PAL.gold, T(10, 2.8, 3.0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) horn(10 + sx * 3.6, 2.8, 3 + sz * 2.5, [sx * .7, sz * .7], 1.3);
  Rh.add(rb(4.6, .4, 1.8, .06), PAL.wall, T(10, 3.85, 2.95));
  Rh.add(P.frustum(5.8, 2.8, 3.8, .5, .78), PAL.roof, T(10, 4.0, 2.95)); rods(Rh, 10, 4.0, 2.95, 5.8, 2.8, 3.8, .5, .78, 0, .28);
  Rh.add(rb(5.9, .08, 2.9, .04), PAL.gold, T(10, 4.02, 2.95));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) horn(10 + sx * 2.9, 4.05, 2.95 + sz * 1.4, [sx * .7, sz * .7], 1);
  Rh.add(rb(4.2, .22, .32, .08), PAL.roofDk, T(10, 4.86, 2.95));
  Rh.add(rb(4.22, .05, .34, .02), PAL.gold, T(10, 4.98, 2.95));
  Rh.add(sp(.2, 14), PAL.gold, T(10, 5.25, 2.95)); Rh.add(cy(0, .12, .25, 10), PAL.gold, T(10, 5.38, 2.95));
  for (const s of [-1, 1]) { // rồng cách điệu
    for (let i = 0; i < 9; i++) { const t = i / 8; Rh.add(sp(.11 - t * .03, 8), PAL.jade, T(10 + s * (1.9 - t * 1.4), 5.05 + Math.sin(t * Math.PI * 1.5) * .22, 2.95)); }
    Rh.add(sp(.14, 10), PAL.jade, T(10 + s * .45, 5.2, 2.95)); Rh.add(cy(0, .05, .2, 6), PAL.gold, T(10 + s * .45, 5.3, 2.95, 0, 1, 1, 1, 0, s * .5));
  }
  // ban thờ
  Wh.add(rb(4.4, .95, .72, .06), PAL.redDk, T(10, .6, 1.95));
  Wh.add(rb(4.46, .07, .78, .03), PAL.gold, T(10, 1.08, 1.95));
  for (let i = 0; i < 4; i++) { Wh.add(rb(.9, .26, .04, .04), '#9a3423', T(8.6 + i * .93, .5, 2.32)); Wh.add(rb(.12, .04, .04, .02), PAL.gold, T(8.6 + i * .93, .5, 2.35)); }
  Wh.add(rb(4.4, .08, .06, .02), PAL.gold, T(10, .3, 2.32));
  Wh.add(rb(4.3, 1.48, .44, .05), '#8f2a1c', T(10, .87, 1.5));
  Wh.add(rb(4.34, .06, .48, .02), PAL.gold, T(10, 1.61, 1.5));
  for (const x of [7.92, 12.08]) { Wh.add(cy(.07, .07, .4, 12), PAL.cream, T(x, 1.11, 2.05)); Wh.add(cy(.1, .12, .06, 12), PAL.gold, T(x, 1.11, 2.05)); Gh.add(sp(.06, 8), '#ffcf5a', T(x, 1.58, 2.05, 0, 1, 1.7, 1)); }
  // 10 bát hương nhỏ, mỗi bài vị một bát (nhang được vẽ động theo từng vị)
  for (let i = 0; i < 10; i++) { const x = 8.2 + i * .4; Wh.add(P.lathe([[0, 0], [.07, 0], [.11, .06], [.12, .12], [.105, .13]], 14), PAL.bronze, T(x, 1.11, 2.08)); Wh.add(cy(.1, .1, .01, 14), '#d8c7a6', T(x, 1.235, 2.08)); }
  // bồ đoàn (đệm ngồi) + mõ nhỏ phía trước
  for (const c of L.cushions) { const x = (c.x - L.HALL.ox) / HS * k, z = (c.y - L.HALL.oy) / HS * k;
    Wh.add(cy(.26, .28, .1, 18), '#c99a3f', T(x, .13, z)); Wh.add(sp(.21, 12), '#ddb35a', T(x, .24, z, 0, 1.25, .32, 1.25));
    Wh.add(sp(.075, 10), '#a8552b', T(x, .17, z - .32, 0, 1.2, .8, 1)); Wh.add(cy(.07, .07, .02, 10), '#7a3b20', T(x, .13, z - .32)); }

  /* ---- Lư hương lớn ---- */
  const Wl = grp(world, L.bowl.x * k, L.bowl.y * k - .05, L.bowl.s), bx = 0, bz = 0;
  Wl.add(rb(1.15, .28, 1.15, .1), PAL.stone, T(bx, .14, bz));
  Wl.add(rb(.95, .14, .95, .06), PAL.stone2, T(bx, .34, bz));
  Wl.add(P.lathe([[0, 0], [.3, 0], [.48, .12], [.6, .32], [.62, .5], [.56, .52], [.54, .5]], 22), PAL.bronze, T(bx, .4, bz));
  Wl.add(cy(.55, .55, .01, 20), '#d9c8a6', T(bx, .86, bz));
  for (let i = 0; i < 3; i++) { const a = i * 2.09 + .5; Wl.add(cy(.07, .05, .2, 8), '#8a6020', T(bx + Math.cos(a) * .3, .32, bz + Math.sin(a) * .3)); }
  for (const s of [-1, 1]) Wl.add(rb(.1, .28, .2, .04), PAL.bronze, T(bx + s * .66, .85, bz));

  /* ---- Bể non bộ ---- */
  for (const o of L.rockeries) { const x = o.x * k, z = o.y * k;
    world.add(rb(1.1, .32, .7, .06), PAL.stone2, T(x, .16, z)); world.add(rb(1.16, .05, .76, .02), PAL.stone, T(x, .33, z));
    water.add(rb(.98, .02, .58, .01), PAL.water, T(x, .3, z));
    [[0, .6, 0, .22], [-.15, .45, .08, .18], [.18, .48, -.05, .17], [.05, .85, .02, .13], [-.05, 1.02, 0, .08]].forEach(([dx, dy, dz, r2]) => world.add(sp(r2, 8), '#8f8a80', T(x + dx, dy, z + dz, dx * 9, 1, 1.4, 1)));
    world.add(rb(.08, .08, .08, .01), PAL.red, T(x + .1, .92, z + .1)); world.add(P.frustum(.14, .14, .02, .02, .06), PAL.roof, T(x + .1, .96, z + .1));
    world.add(cy(.01, .015, .3, 4), '#6e5340', T(x - .2, .7, z - .05)); world.add(sp(.1, 8), PAL.leaf3, T(x - .2, 1.0, z - .05, 0, 1.4, .6, 1));
    for (let i = 0; i < 3; i++) world.add(sp(.04, 6), '#f08a3a', T(x - .3 + i * .25, .31, z + .2 - i * .1, i, 1.6, .5, .8)); }
  /* ---- Tháp đá ---- */
  for (const o of L.stupas) { const x = o.x * k, z = o.y * k;
    for (let i = 0; i < 5; i++) { const w2 = .58 - i * .08; world.add(rb(w2, .34, w2, .03), i % 2 ? '#c9c0ae' : '#b4aa98', T(x, .17 + i * .4, z)); world.add(rb(w2 + .12, .06, w2 + .12, .02), PAL.stone2, T(x, .37 + i * .4, z)); }
    world.add(P.lathe([[0, 0], [.12, 0], [.14, .1], [.1, .22], [0, .34]], 10), '#c9c0ae', T(x, 2.4, z)); }

  /* ---- Gác chuông (cảm hứng Khuê Văn Các): 4 trụ gạch vôi trắng, lầu gỗ son có cửa sổ tròn, mái 2 tầng ---- */
  const Wb = grp(world, L.bell.x * k, L.bell.y * k, L.bell.s), gx = 0, gz = 0;
  Wb.add(rb(1.8, .24, 1.4, .08), PAL.stone2, T(gx, .12, gz));
  for (const [dx, dz] of [[-.66, -.46], [.66, -.46], [.66, .46], [-.66, .46]]) {
    Wb.add(rb(.3, 1.9, .3, .04), '#e9e3d4', T(gx + dx, 1.19, gz + dz));
    Wb.add(rb(.22, 1.5, .02, .01), '#d6cdb8', T(gx + dx, 1.15, gz + dz + Math.sign(dz) * .155));
    Wb.add(rb(.34, .1, .34, .03), PAL.stone2, T(gx + dx, .28, gz + dz));
  }
  Wb.add(rb(1.8, .14, 1.36, .04), PAL.redDk, T(gx, 2.2, gz));                  // sàn lầu
  Wb.add(rb(1.5, .7, 1.06, .04), PAL.red, T(gx, 2.62, gz));                     // lầu gỗ
  for (let i = 0; i < 7; i++) Wb.add(rb(.04, .7, 1.1, .01), PAL.redDk, T(gx - .66 + i * .22, 2.62, gz));
  for (const sz of [-1, 1]) {                                                     // cửa sổ tròn "vầng thái dương"
    Wb.add(cy(.25, .25, .04, 24), '#e3c47c', T(gx, 2.62, gz + sz * .53, 0, 1, 1, 1, 1.5708));
    Wb.add(cy(.2, .2, .05, 24), '#3b2a22', T(gx, 2.62, gz + sz * .53, 0, 1, 1, 1, 1.5708));
    for (let i = 0; i < 8; i++) Wb.add(rb(.4, .025, .02, .005), '#e3c47c', T(gx, 2.62, gz + sz * .56, 0, 1, 1, 1, 0, i * .3927));
  }
  for (let i = 0; i < 9; i++) Wb.add(rb(.05, .2, .05, .01), PAL.red, T(gx - .8 + i * .2, 2.38, gz + .66));  // lan can
  Wb.add(rb(1.8, .04, .06, .01), PAL.redDk, T(gx, 2.47, gz + .66));
  Wb.add(P.frustum(2.3, 1.85, 1.0, .55, .5), PAL.roof, T(gx, 2.97, gz)); rods(Wb, gx, 2.97, gz, 2.3, 1.85, 1.0, .55, .5, 0, .24);
  Wb.add(rb(2.36, .07, 1.9, .03), PAL.gold, T(gx, 2.97, gz));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) horn(gx + sx * 1.15, 3.02, gz + sz * .92, [sx * .7, sz * .7], .8, Wb);
  Wb.add(rb(.95, .25, .55, .04), PAL.red, T(gx, 3.55, gz));
  Wb.add(P.frustum(1.4, 1.0, .5, .2, .38), PAL.roof, T(gx, 3.67, gz)); rods(Wb, gx, 3.67, gz, 1.4, 1.0, .5, .2, .38, 0, .22);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) horn(gx + sx * .7, 3.7, gz + sz * .5, [sx * .7, sz * .7], .55, Wb);
  Wb.add(sp(.1, 10), PAL.gold, T(gx, 4.1, gz));

  /* ---- Vườn rau ---- */
  const gd = L.garden;
  world.add(rb(gd.w * k, .12, gd.h * k, .1), '#9a6238', T((gd.x + gd.w / 2) * k, .02, (gd.y + gd.h / 2) * k));
  const fence = (x0, z0, x1, z1, gapA, gapB, axis) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / .5);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, c = axis === 'z' ? z : x;
      if (gapA !== undefined && c > gapA && c < gapB) continue;
      world.add(rb(.11, .5, .11, .03), PAL.wood, T(x, .25, z)); world.add(cy(0, .07, .08, 4), PAL.wood, T(x, .5, z, .78));
      if (i < n) { const t2 = (i + 1) / n, x2 = x0 + (x1 - x0) * t2, z2 = z0 + (z1 - z0) * t2, c2 = axis === 'z' ? z2 : x2; if (gapA !== undefined && c2 > gapA && c < gapB) continue;
        for (const y of [.18, .36]) world.add(rb(Math.abs(x2 - x) + .06 || .05, .06, Math.abs(z2 - z) + .06 || .05, .02), PAL.woodDk, T((x + x2) / 2, y, (z + z2) / 2)); }
    }
  };
  const g0x = (gd.x - 8) * k, g0z = (gd.y - 8) * k, g1x = (gd.x + gd.w + 8) * k, g1z = (gd.y + gd.h + 8) * k;
  fence(g0x, g0z, g1x, g0z); fence(g0x, g1z, g1x, g1z); fence(g0x, g0z, g0x, g1z); fence(g1x, g0z, g1x, g1z, 14.45, 15.35, 'z');   // cổng vườn mở ra lối đá
  L.plots.forEach(p => {
    world.add(rb(.9, .2, .7, .1, 2), '#6b4024', T(p.x * k, .1, p.y * k - .05));
    for (let i = -1; i <= 1; i++) world.add(rb(.78, .02, .05, .02), '#56331c', T(p.x * k, .205, p.y * k - .05 + i * .2));
  });
  // rãnh nước giữa các hàng luống
  for (let r = 0; r < 3; r++) decal.add(rb(gd.w * k - .9, .01, .08, .005), '#5a8fa6', T((gd.x + gd.w / 2 - 35) * k, .085, (L.plots[r * 5].y + 57) * k));
  // giếng làng: thành gạch, mái nhỏ, gàu
  { const x = L.well.x * k, z = L.well.y * k;
    world.add(cy(.32, .34, .45, 16), '#b0a08a', T(x, 0, z)); world.add(cy(.34, .34, .06, 16), '#8f8270', T(x, .45, z)); world.add(cy(.25, .25, .01, 16), '#2f5f78', T(x, .4, z));
    for (const s2 of [-1, 1]) world.add(cy(.03, .03, 1.1, 6), PAL.woodDk, T(x + s2 * .36, 0, z));
    world.add(cy(.03, .03, .8, 6), PAL.woodDk, T(x, 1.0, z, 0, 1, 1, 1, 0, 1.5708));
    world.add(P.frustum(1.0, .7, .2, .7, .22), PAL.roof, T(x, 1.08, z));
    world.add(cy(.008, .008, .55, 4), '#5b4a3a', T(x, .45, z)); world.add(P.lathe([[0, 0], [.07, 0], [.09, .12], [.08, .13]], 10), '#8a6a45', T(x, .4, z)); }
  // bù nhìn rơm đội nón
  { const x = L.scarecrow.x * k, z = L.scarecrow.y * k;
    world.add(cy(.03, .03, 1.3, 6), PAL.woodDk, T(x, 0, z)); world.add(cy(.025, .025, .9, 6), PAL.woodDk, T(x, .95, z, 0, 1, 1, 1, 0, 1.5708));
    world.add(P.lathe([[0, .55], [.2, .55], [.17, .85], [.12, 1.0], [0, 1.02]], 10), '#5a6e8a', T(x, 0, z));
    for (const s2 of [-1, 1]) world.add(sp(.08, 6), '#e2c271', T(x + s2 * .47, .95, z, 0, 1.3, .7, .7));
    world.add(sp(.15, 10), '#e2c271', T(x, 1.15, z)); world.add(cy(0, .32, .22, 16), '#e6cf98', T(x, 1.2, z)); }
  // chòi canh trên cọc tre
  { const x = L.hut.x * k, z = L.hut.y * k;
    for (const [dx, dz] of [[-.4, -.3], [.4, -.3], [.4, .3], [-.4, .3]]) world.add(cy(.045, .05, 1.0, 6), '#9b7a45', T(x + dx, 0, z + dz));
    world.add(rb(1.0, .08, .8, .02), '#b48a52', T(x, .95, z)); for (let i = 0; i < 5; i++) world.add(rb(.05, .6, .05, .01), '#b48a52', T(x - .3 + i * .15, .35, z + .32, 0, 1, 1, 1, .35));
    for (const s2 of [-1, 1]) world.add(rb(1.0, .04, .04, .01), '#9b7a45', T(x, 1.2, z + s2 * .38));
    world.add(P.frustum(1.3, 1.1, .1, .2, .55), '#c9a65a', T(x, 1.45, z)); world.add(rb(1.32, .05, 1.12, .02), '#a8863f', T(x, 1.45, z)); }
  /* ---- Vườn thú ---- */
  const pn = L.pen;
  world.add(rb(pn.w * k, .04, pn.h * k, .25), '#93c86b', T((pn.x + pn.w / 2) * k, .012, (pn.y + pn.h / 2) * k));
  const p0x = pn.x * k, p0z = pn.y * k, p1x = (pn.x + pn.w) * k, p1z = (pn.y + pn.h) * k;
  fence(p0x, p0z, p1x, p0z); fence(p0x, p1z, p1x, p1z); fence(p1x, p0z, p1x, p1z); fence(p0x, p0z, p0x, p1z, 14.45, 15.35, 'z');
  const pd = L.pond, px = pd.x * k, pz = pd.y * k, prx = pd.rx * k, prz = pd.ry * k;
  water.add(cy(1, 1, .06, 36), PAL.water, T(px, .0, pz, 0, prx, 1, prz));
  world.add(cy(1, 1, .02, 36), '#2f7f98', T(px, -.0, pz, 0, prx * .96, 1, prz * .96));
  for (let a = 0; a < Math.PI * 2; a += .2) world.add(sp(.17, 8), r() > .5 ? '#bdb6a6' : '#a59d8b', T(px + Math.cos(a) * (prx + .08), .05, pz + Math.sin(a) * (prz + .08), a, 1.3, .55, 1));
  [[-1.1, -.2], [-.6, .35], [.4, -.4], [1.0, .2], [1.3, -.15], [-.1, .45], [-1.4, .18], [1.75, .25], [-1.8, -.1], [.7, .55]].map(([a, b]) => [a * pd.rx / 175, b * pd.ry / 85]).forEach(([dx, dz], i) => {
    water.add(cy(.17, .17, .02, 14), i % 2 ? '#5d9c40' : '#4d8a33', T(px + dx, .07, pz + dz));
    if (i % 2 === 0) { for (let j = 0; j < 6; j++) { const a = j * 1.047; world.add(sp(.06, 8), j % 2 ? PAL.pink : PAL.pink2, T(px + dx + Math.cos(a) * .05, .14, pz + dz + Math.sin(a) * .05, -a, .6, 1.4, .6, 0, .5)); } world.add(sp(.035, 6), '#ffe27a', T(px + dx, .16, pz + dz)); }
  });
  // đình một cột giữa hồ (cảm hứng Chùa Một Cột): trụ đá, đài vuông, lầu gỗ son, mái cong
  world.add(cy(.13, .16, .55, 14), PAL.stone2, T(px, 0, pz));
  for (let i = 0; i < 4; i++) { const a = i * 1.5708 + .785; world.add(cy(.02, .02, .3, 4), PAL.woodDk, T(px + Math.cos(a) * .12, .45, pz + Math.sin(a) * .12, 0, 1, 1, 1, Math.sin(a) * .9, -Math.cos(a) * .9)); }
  world.add(rb(.95, .08, .95, .03), PAL.redDk, T(px, .6, pz));
  for (let i = 0; i < 5; i++) for (const sz of [-1, 1]) { world.add(rb(.04, .14, .04, .01), PAL.red, T(px - .4 + i * .2, .7, pz + sz * .44)); world.add(rb(.04, .14, .04, .01), PAL.red, T(px + sz * .44, .7, pz - .4 + i * .2)); }
  world.add(rb(.62, .46, .62, .03), PAL.red, T(px, .87, pz));
  world.add(rb(.3, .3, .02, .01), '#3b2a22', T(px, .85, pz + .32)); world.add(rb(.34, .34, .01, .01), '#e3c47c', T(px, .85, pz + .315));
  world.add(P.frustum(1.15, 1.15, .25, .25, .42), PAL.roof, T(px, 1.1, pz)); rods(world, px, 1.1, pz, 1.15, 1.15, .25, .25, .42, 0, .2);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) horn(px + sx * .58, 1.13, pz + sz * .58, [sx * .7, sz * .7], .55, world);
  world.add(sp(.07, 8), PAL.gold, T(px, 1.58, pz));
  world.add(sp(.8, 14), '#e8c35d', T(L.nest.x * k, .05, L.nest.y * k, 0, 1, .32, .55)); // ổ rơm
  // chuồng chó
  const dhx = L.kennel.x * k, dhz = L.kennel.y * k;
  world.add(rb(.9, .7, .8, .06), '#c9763f', T(dhx, .35, dhz)); world.add(rb(.4, .45, .05, .1), '#4a2a18', T(dhx, .3, dhz + .41));
  world.add(P.frustum(1.1, 1.0, .1, 1.0, .45), '#d94f3a', T(dhx, .7, dhz));
  world.add(cy(.17, .14, .08, 14), '#3d8fd1', T(dhx - .7, 0, dhz + .5)); world.add(cy(.15, .15, .01, 14), '#c49a5b', T(dhx - .7, .08, dhz + .5));
  world.add(P.lathe([[0, 0], [.16, 0], [.22, .12], [.24, .3]], 14), '#a7764a', T(L.nest.x * k + .9, 0, L.nest.y * k + 1.0)); // máng
  // chuồng gà: nhà gỗ trên cọc, cầu thang, rào lưới
  { const x = L.coop.x * k, z = L.coop.y * k;
    for (const [dx, dz] of [[-.55, -.3], [.55, -.3], [.55, .3], [-.55, .3]]) world.add(cy(.04, .04, .45, 6), PAL.woodDk, T(x + dx, 0, z + dz));
    world.add(rb(1.3, .65, .8, .05), '#b8743f', T(x, .78, z)); for (let i = 0; i < 6; i++) world.add(rb(.02, .62, .82, .005), '#94582c', T(x - .55 + i * .22, .78, z));
    world.add(rb(.25, .3, .03, .03), '#3b2414', T(x + .3, .65, z + .41));
    world.add(P.frustum(1.6, 1.0, .2, 1.0, .4), '#a8452f', T(x, 1.1, z));
    world.add(rb(.22, .03, .8, .01), '#c9a065', T(x + .3, .25, z + .75, 0, 1, 1, 1, .55));
    for (let i = 0; i < 7; i++) world.add(cy(.015, .015, .4, 4), '#d9cdb8', T(x - 1.0 + i * .33, 0, z + 1.35));
    world.add(rb(2.0, .02, .02, .005), '#d9cdb8', T(x - .0, .38, z + 1.35));
    for (let i = 0; i < 6; i++) world.add(sp(.05, 6), '#f1e2b0', T(x - .7 + i * .25, .03, z + .9 + (i % 2) * .15, 0, 1, .5, 1)); }   // thóc rải
  // chuồng trâu: mái rạ, cột tre, máng cỏ
  { const x = L.shed.x * k, z = L.shed.y * k;
    for (const [dx, dz] of [[-.95, -.45], [.95, -.45], [.95, .45], [-.95, .45]]) world.add(cy(.06, .07, 1.4, 8), '#9b7a45', T(x + dx, 0, z + dz));
    world.add(rb(2.0, .8, .06, .03), '#a8875a', T(x, .55, z - .47));
    world.add(P.frustum(2.5, 1.5, .4, 1.3, .55), '#c9a65a', T(x, 1.4, z)); world.add(rb(2.52, .06, 1.52, .02), '#a8863f', T(x, 1.4, z));
    world.add(rb(1.2, .25, .3, .04), '#8a6a45', T(x, .13, z + .1)); for (let i = 0; i < 8; i++) world.add(cy(.008, .02, .2, 4), '#b9c96b', T(x - .5 + i * .14, .24, z + .1, 0, 1, 1, 1, (i % 3 - 1) * .3));
    for (let i = 0; i < 3; i++) world.add(sp(.28, 10), '#e2c271', T(x + .6 - i * .1, .15 + i * .18, z - .2, 0, 1, .6, 1)); }
  /* ---- Cây ---- */
  for (const tr of L.trees) {
    const x = tr.x * k, z = tr.y * k;
    if (tr.kind === 1) {
      for (let i = 0; i < 6; i++) { const a = i * 1.05, dx = Math.cos(a) * .18, dz = Math.sin(a) * .18, h = 2.2 + r() * .9, lean = (r() - .5) * .2;
        world.add(cy(.045, .055, h, 8), '#9cc04a', T(x + dx, 0, z + dz, 0, 1, 1, 1, lean, -lean));
        for (let j = 1; j < h / .45; j++) world.add(cy(.06, .06, .03, 8), '#7e9c38', T(x + dx + lean * -j * .45 * 0, j * .45, z + dz));
        for (let j = 0; j < 4; j++) world.add(sp(.16, 8), j % 2 ? PAL.leaf2 : PAL.leaf, T(x + dx * 2.2 + (r() - .5) * .5, h - .2 + (r() - .5) * .5, z + dz * 2.2 + (r() - .5) * .4, r() * 6, 1.8, .45, .7)); }
    } else {
      const cols = tr.kind === 2 ? [PAL.pink, PAL.pink2, PAL.pink3] : [PAL.leaf, PAL.leaf2, PAL.leaf3];
      world.add(cy(.12, .19, 1.3, 10), '#8a5a35', T(x, 0, z));
      world.add(cy(.05, .07, .6, 8), '#8a5a35', T(x + .15, .8, z, 0, 1, 1, 1, 0, -.7));
      [[0, 1.75, 0, .78], [-.5, 1.42, .2, .56], [.5, 1.48, -.1, .6], [.12, 2.2, .05, .52], [-.2, 1.6, -.4, .5], [.3, 1.5, .45, .48]].forEach(([dx, dy, dz, s], i) => world.add(sp(s, 12), cols[i % 3], T(x + dx, dy, z + dz)));
    }
  }
  /* ---- Đèn lồng ---- */
  for (const l of L.lanterns) {
    const x = l.x * k, z = l.y * k, side = l.x < 1000 ? 1 : -1;
    world.add(rb(.22, .12, .22, .04), PAL.stone, T(x, .06, z));
    world.add(cy(.045, .05, 1.45, 8), '#5b3b22', T(x, .1, z));
    world.add(rb(.5, .06, .06, .02), '#5b3b22', T(x + side * .2, 1.5, z));
    world.add(cy(.07, .07, .05, 10), PAL.gold, T(x + side * .36, 1.36, z));
    glow.add(P.lathe([[0, -.16], [.07, -.15], [.14, -.08], [.16, 0], [.14, .08], [.07, .15], [0, .16]], 14), (Math.round(l.y / 125) % 2) ? '#c8402e' : '#e0a83a', T(x + side * .36, 1.2, z));
    world.add(cy(.07, .07, .04, 10), PAL.gold, T(x + side * .36, 1.0, z)); world.add(cy(.01, .02, .12, 6), '#f0c25a', T(x + side * .36, .88, z));
  }
  /* ---- Tam quan (cảm hứng Văn Miếu): 2 trụ biểu đỉnh búp sen, cổng 3 gian tường vôi, mái ngói nâu ---- */
  const tx = L.gate.x * k, tz = L.GATE_Y * k + .35;
  for (const s of [-1, 1]) {                                                       // trụ biểu
    const x = tx + s * 2.35;
    gate.add(rb(.5, .2, .5, .05), PAL.stone2, T(x, .1, tz));
    gate.add(rb(.38, 2.3, .38, .04), '#ece6d8', T(x, 1.35, tz));
    for (const y of [.7, 1.4, 2.05]) gate.add(rb(.42, .06, .42, .02), '#cfc6b2', T(x, y, tz));
    gate.add(rb(.26, .5, .02, .01), '#8e2f24', T(x, 1.05, tz + .2)); gate.add(rb(.26, .5, .02, .01), '#8e2f24', T(x, 1.75, tz + .2));
    gate.add(rb(.5, .12, .5, .04), '#cfc6b2', T(x, 2.56, tz));
    gate.add(P.lathe([[0, 0], [.12, 0], [.17, .12], [.15, .26], [.08, .38], [0, .46]], 14), '#ece6d8', T(x, 2.62, tz));  // búp sen
    gate.add(sp(.05, 8), PAL.gold, T(x, 3.1, tz));
  }
  for (const s of [-1, 1]) {                                                       // hai gian bên: tường vôi + cửa son
    gate.add(rb(1.2, 1.4, .4, .05), '#e6dfcf', T(tx + s * 1.45, .7, tz));
    gate.add(rb(.6, .9, .03, .02), '#8e2f24', T(tx + s * 1.45, .55, tz + .21));
    gate.add(rb(.02, .9, .04, .01), PAL.gold, T(tx + s * 1.45, .55, tz + .22));
    gate.add(P.frustum(1.5, 1.0, .9, .25, .4), PAL.roof, T(tx + s * 1.45, 1.4, tz)); rods(gate, tx + s * 1.45, 1.4, tz, 1.5, 1.0, .9, .25, .4, 0, .22);
    for (const sz of [-1, 1]) for (let i = 0; i < 4; i++) gate.add(sp(.07 * (1 - i * .1), 8), i === 3 ? PAL.gold : PAL.roofDk, T(tx + s * (2.12 + i * .07), 1.45 + i * i * .025, tz + sz * (.5 + i * .04)));
  }
  for (const dx of [-.82, .82]) { gate.add(rb(.32, .16, .32, .05), PAL.stone2, T(tx + dx, .08, tz)); gate.add(rb(.24, 2.1, .24, .04), '#e6dfcf', T(tx + dx, 1.13, tz)); }
  gate.add(rb(1.9, .26, .34, .06), PAL.redDk, T(tx, 2.2, tz));
  gate.add(P.frustum(2.6, 1.2, 1.5, .25, .55), PAL.roof, T(tx, 2.33, tz)); rods(gate, tx, 2.33, tz, 2.6, 1.2, 1.5, .25, .55, 0, .24); gate.add(rb(2.66, .06, 1.24, .02), PAL.gold, T(tx, 2.34, tz));
  for (const s of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i < 4; i++) gate.add(sp(.08 * (1 - i * .1), 8), i === 3 ? PAL.gold : PAL.roofDk, T(tx + s * (1.3 + i * .08), 2.38 + i * i * .025, tz + sz * (.6 + i * .05)));
  // biển tên chùa dựng trên nóc cổng, nghiêng về phía người xem
  for (const dx of [-.62, .62]) gate.add(cy(.035, .035, .4, 8), PAL.redDk, T(tx + dx, 2.8, tz));
  gate.add(rb(1.78, .5, .08, .05), PAL.redDk, T(tx, 3.18, tz, 0, 1, 1, 1, -.38));
  gate.add(sp(.12, 10), PAL.gold, T(tx, 3.55, tz - .1));
  for (const s of [-1, 1]) gate.add(sp(.07, 8), PAL.gold, T(tx + s * .92, 3.2, tz));

  /* ================= KHU CHỢ NGOÀI CỔNG CHÙA ================= */
  const MK = L.market;
  // Người bán hàng (NPC) — ngồi ghế đẩu hoặc đứng, quay mặt ra đường (+z)
  const npc = (x, z, o) => {
    const shirt = o.shirt, pants = o.pants || '#2e2a2a', yaw = o.yaw || 0;
    const put = (pr, c, lx, ly, lz, ...rest) => { const cs = Math.cos(yaw), sn = Math.sin(yaw); world.add(pr, c, T(x + lx * cs + lz * sn, ly, z - lx * sn + lz * cs, yaw + (rest[0] || 0), rest[1], rest[2], rest[3], rest[4], rest[5])); };
    if (o.sit) {
      put(rb(.34, .16, .28, .03), '#8a5a33', 0, .08, -.02);                                   // ghế đẩu gỗ
      put(sp(.22, 12), shirt, 0, .42, -.04, 0, 1, 1.15, .85);                                 // áo bà ba
      for (const s of [-1, 1]) {
        put(sp(.09, 8), pants, s * .1, .22, .14, 0, .9, .8, 1.6);                             // đùi
        put(cy(.06, .07, .2, 8), pants, s * .1, 0, .3);                                       // ống quần
        put(sp(.07, 8), shirt, s * .2, .4, .06, 0, .9, 1.3, 1, -.5, s * .3);                  // tay áo
        put(sp(.045, 8), PAL.skin, s * .13, .27, .25);                                        // tay đặt lên gối
      }
    } else {
      for (const s of [-1, 1]) { put(cy(.07, .07, .42, 8), pants, s * .09, 0, 0); put(sp(.07, 8), shirt, s * .21, .62, 0, 0, .9, 1.6, .9, 0, s * .2); put(sp(.045, 8), PAL.skin, s * .24, .45, .02); }
      put(P.lathe([[0, .4], [.2, .4], [.21, .55], [.17, .78], [.1, .84], [0, .85]], 14), shirt, 0, 0, 0);
      if (o.apron) put(rb(.3, .32, .03, .02), o.apron, 0, .55, .19);
    }
    const hy = o.sit ? .8 : 1.08;
    put(sp(.21, 14), PAL.skin, 0, hy, 0);
    put(sp(.222, 12), PAL.hair, 0, hy + .04, -.04, 0, 1, .95, 1);
    put(sp(.08, 8), PAL.hair, 0, hy + .06, -.22);
    for (const s of [-1, 1]) { put(sp(.03, 6), '#2a1a10', s * .07, hy, .19, 0, 1, 1.2, .6); put(sp(.035, 6), '#e9a297', s * .12, hy - .06, .16, 0, 1, .6, .5); }
    if (o.hat === 'non') { put(cy(0, .36, .26, 20), '#e6cf98', 0, hy + .1, 0); put(cy(.36, .36, .012, 20), '#c9ad6e', 0, hy + .1, 0); }
  };
  const basket = (x, z, fill) => {                                                              // thúng tre
    world.add(P.lathe([[0, 0], [.2, 0], [.28, .1], [.3, .2], [.28, .21]], 16), '#b48a52', T(x, 0, z));
    for (let i = 0; i < 3; i++) world.add(cy(.295 - i * .01, .295 - i * .01, .012, 16), '#8f6b3c', T(x, .05 + i * .06, z));
    fill && fill(x, z);
  };
  const pole = (x, z, rot) => world.add(cy(.025, .025, 1.6, 6), '#9b7a45', T(x, .05, z, rot, 1, 1, 1, 1.5708));   // đòn gánh

  // sạp hàng có mái bạt sọc trên 4 cột tre
  const tarp = (x, z, w, d, h, c1, c2) => {
    for (const [dx, dz, hh] of [[-w / 2, -d / 2, h + .15], [w / 2, -d / 2, h + .15], [w / 2, d / 2, h - .15], [-w / 2, d / 2, h - .15]]) { world.add(cy(.035, .04, hh, 6), '#9b7a45', T(x + dx, 0, z + dz)); world.add(cy(.05, .05, .04, 6), '#7d5c30', T(x + dx, hh - .02, z + dz)); }
    const n = Math.max(3, Math.round(w / .45)), sw = w / n;
    for (let i = 0; i < n; i++) world.add(rb(sw + .01, .03, d + .3, .01), i % 2 ? c2 : c1, T(x - w / 2 + sw * (i + .5), h, z, 0, 1, 1, 1, .15));
    for (let i = 0; i < n; i++) world.add(rb(sw + .01, .14, .03, .01), i % 2 ? c2 : c1, T(x - w / 2 + sw * (i + .5), h - .25, z + d / 2 + .14));   // diềm bạt
  };
  const table = (x, z, w, d, h = .48, col = '#b48a52') => {
    world.add(rb(w, .06, d, .02), col, T(x, h, z));
    for (let i = 0; i < Math.round(w / .12); i++) world.add(rb(.09, .015, d - .02, .005), '#9b7444', T(x - w / 2 + .06 + i * .12, h + .035, z));
    for (const [dx, dz] of [[-w / 2 + .06, -d / 2 + .06], [w / 2 - .06, -d / 2 + .06], [w / 2 - .06, d / 2 - .06], [-w / 2 + .06, d / 2 - .06]]) world.add(cy(.03, .03, h, 5), '#7d5c30', T(x + dx, 0, z + dz));
  };
  const hangSign = (text, x, y, z, w, bg) => { world.add(rb(w + .08, .34, .05, .03), PAL.woodDk, T(x, y, z)); addTex(signCanvas(text, 700, 120, { bg }), w, .28, T(x, y, z + .03)); };
  const non = (x, y, z, ry = 0, rx = 0, c = '#e6cf98') => { world.add(cy(0, .3, .2, 18), c, T(x, y, z, ry, 1, 1, 1, rx)); world.add(cy(.3, .3, .01, 18), '#c9ad6e', T(x, y, z, ry, 1, 1, 1, rx)); };

  // --- Sạp nón Cô Tư ---
  { const x = MK.hat.x * k, z = MK.hat.y * k;
    tarp(x, z - .15, 2.8, 1.6, 1.95, '#b8382a', '#f1e6cf');
    table(x, z, 2.3, .8);
    for (let st = 0; st < 4; st++) for (let i = 0; i < 4 + (st % 2); i++) non(x - .85 + st * .42, .52 + i * .05, z + .05 + (st % 2) * .12);  // chồng nón
    for (let i = 0; i < 5; i++) non(x - 1.0 + i * .5, 1.45, z + .62, 0, 1.25, i % 2 ? '#e6cf98' : '#dcc185');                            // nón treo diềm bạt
    world.add(cy(.008, .008, 2.5, 4), '#5b4a3a', T(x - 1.25, 1.66, z + .62, 0, 1, 1, 1, 0, 1.5708));
    for (const s2 of [-1, 1]) { world.add(cy(.42, .42, .03, 24), '#e2c98f', T(x + 1.45 * s2, .9, z - .55, 0, 1, 1, 1, 1.3)); world.add(cy(.12, .12, .05, 16), '#3b2a1e', T(x + 1.45 * s2, .9, z - .53, 0, 1, 1, 1, 1.3)); }  // nón quai thao dựng
    npc(x + .2, z - .62, { sit: true, shirt: '#c9b48a', hat: 'non' });
    basket(x - 1.75, z + .55, (bx, bz) => { for (let i = 0; i < 4; i++) world.add(cy(0, .3, .2, 18), i % 2 ? '#e6cf98' : '#dcc185', T(bx, .2 + i * .05, bz)); });
    basket(x - 1.75, z - .45, (bx, bz) => world.add(sp(.2, 10), '#7fa865', T(bx, .25, bz, 0, 1.2, .5, 1.2)));
    world.add(cy(.025, .025, 1.6, 6), '#9b7a45', T(x - 1.75, .45, z + .05, 0, 1, 1, 1, 1.5708));
    hangSign('NÓN LÁ CÔ TƯ', x, 1.88, z + .7, 1.5, '#7a2a20'); }
  // --- Sạp áo Cô Sáu ---
  { const x = MK.cloth.x * k, z = MK.cloth.y * k;
    tarp(x, z - .15, 2.8, 1.6, 1.95, '#2f5f8f', '#eef0ea');
    table(x - .25, z + .05, 1.8, .75);
    const cols = ['#a8382c', '#4f7a5a', '#3b4f7a', '#5b4566', '#c47f86', '#3f8f8a', '#c9902e', '#efe7d6', '#7a5a43'];
    for (let st = 0; st < 3; st++) for (let i = 0; i < 4; i++) world.add(rb(.42, .06, .3, .03), cols[(st * 4 + i) % cols.length], T(x - .85 + st * .55, .54 + i * .065, z + .05, (i - 1.5) * .08));
    for (const s2 of [-1, 1]) world.add(cy(.03, .03, 1.7, 6), '#7d5131', T(x + s2 * 1.15, 0, z - .6));                                  // sào phơi áo
    world.add(cy(.025, .025, 2.3, 6), '#7d5131', T(x - 1.15, 1.62, z - .6, 0, 1, 1, 1, 0, -1.5708));
    cols.slice(0, 7).forEach((c, i) => { const ax = x - .9 + i * .3; world.add(P.lathe([[0, -.75], [.16, -.75], [.15, -.25], [.13, -.02], [0, 0]], 10), c, T(ax, 1.6, z - .6, 0, 1, 1, .45)); world.add(rb(.5, .07, .07, .03), c, T(ax, 1.45, z - .6)); });
    world.add(rb(.7, .42, .45, .04), '#7a4a2a', T(x + 1.15, .21, z + .2)); world.add(rb(.72, .05, .47, .02), PAL.gold, T(x + 1.15, .43, z + .2));   // rương gỗ
    for (let i = 0; i < 3; i++) world.add(cy(.07, .07, .5, 10), cols[i + 3], T(x + .95 + i * .15, .5, z + .2, 0, 1, 1, 1, 0, 1.5708));            // cuộn vải
    npc(x + .55, z - .2, { shirt: '#8aa0b4', hat: 'non' });
    hangSign('ÁO TRÀNG CÔ SÁU', x, 1.88, z + .7, 1.5, '#23466b'); }
  // --- Quán ăn vỉa hè: bếp than, tủ bánh mì, 6 bàn ghế nhựa dưới mái bạt lớn ---
  { const x = MK.food.x * k, z = MK.food.y * k;
    tarp(x, z - .05, 4.6, 2.4, 2.15, '#2f6fb3', '#e9eef2');
    world.add(rb(2.0, .8, .55, .04), '#c9b9a0', T(x - .1, .4, z - .95)); world.add(rb(2.04, .05, .6, .02), '#8a7a62', T(x - .1, .82, z - .95));   // quầy
    world.add(cy(.3, .26, .5, 16), '#9aa2a8', T(x - .65, .85, z - .95)); world.add(cy(.31, .31, .03, 16), '#c7cdd2', T(x - .65, 1.35, z - .95));   // nồi nước dùng
    world.add(cy(.2, .18, .3, 14), '#9aa2a8', T(x - .1, .85, z - .95)); world.add(cy(.21, .21, .03, 14), '#c7cdd2', T(x - .1, 1.15, z - .95));
    world.add(cy(.25, .28, .4, 14), '#5a4a42', T(x - 1.35, 0, z - .95)); world.add(cy(.18, .18, .02, 14), '#ff7a2a', T(x - 1.35, .41, z - .95));     // bếp than
    world.add(cy(.22, .2, .22, 14), '#3b3b3b', T(x - 1.35, .42, z - .95));
    world.add(rb(.8, .55, .45, .04), '#cfd6db', T(x + .7, 1.1, z - .95)); world.add(rb(.82, .05, .47, .02), '#8a9aa6', T(x + .7, 1.39, z - .95)); // tủ kính bánh mì
    for (let i = 0; i < 4; i++) world.add(sp(.09, 8), '#d8a35a', T(x + .45 + i * .17, 1.0, z - .95, 0, 1.8, .6, .8));
    npc(x - .35, z - 1.45, { shirt: '#b5544a', pants: '#2e2a2a', apron: '#e9e2d0', hat: 'none' });
    for (let r2 = 0; r2 < 2; r2++) for (let c = 0; c < 3; c++) {                                                           // 6 bàn nhựa thấp
      const tx2 = x - 1.4 + c * 1.4, tz2 = z + .05 + r2 * .85;
      world.add(rb(.62, .04, .42, .02), r2 ? '#e8e2d4' : '#d6e2e8', T(tx2, .38, tz2)); for (const [dx, dz] of [[-.25, -.16], [.25, -.16], [.25, .16], [-.25, .16]]) world.add(cy(.015, .02, .38, 4), '#8a8a8a', T(tx2 + dx, 0, tz2 + dz));
      world.add(P.lathe([[0, 0], [.04, 0], [.08, .05], [.09, .07]], 10), '#f2efe6', T(tx2 - .1, .4, tz2)); world.add(cy(.075, .075, .01, 10), ['#e9c46a', '#c0583a', '#d4a373'][c], T(tx2 - .1, .46, tz2));
      world.add(cy(.03, .03, .12, 6), '#c0392b', T(tx2 + .17, .4, tz2 - .05));                                                // lọ tương ớt
      for (const [dx, dz] of [[-.45, 0], [.45, 0], [0, .38]]) { const sx = tx2 + dx, sz = tz2 + dz, rc = (c + r2) % 2 ? '#d23c2f' : '#2f6fb3'; world.add(cy(.12, .14, .03, 12), rc, T(sx, .24, sz)); for (const [ex, ez] of [[-.08, -.08], [.08, -.08], [.08, .08], [-.08, .08]]) world.add(cy(.015, .02, .24, 4), rc, T(sx + ex, 0, sz + ez)); }
    }
    hangSign('QUÁN ĂN VỈA HÈ', x, 2.05, z + 1.2, 2.0, '#1f4f80');
    world.add(rb(.5, .7, .04, .03), '#3b3b3b', T(x + 2.5, .75, z + .9, -.3)); world.add(cy(.02, .02, .45, 4), '#7d5c30', T(x + 2.5, 0, z + .87)); }   // bảng thực đơn
  // --- Cắt tóc gốc cây: gương đóng vào thân cây, ghế gỗ, bàn đồ nghề ---
  { const x = MK.barber.x * k, z = MK.barber.y * k, tx2 = x - .8, tz2 = z - .35;
    world.add(cy(.2, .3, 1.8, 12), '#7d6450', T(tx2, 0, tz2));
    [[0, 2.2, 0, 1.0], [-.6, 1.9, .3, .7], [.6, 2.0, -.2, .75], [.1, 2.65, .1, .6]].forEach(([dx, dy, dz, s2], i) => world.add(sp(s2, 12), [PAL.leaf3, PAL.leaf, '#4f7f3f'][i % 3], T(tx2 + dx, dy, tz2 + dz, 0, 1, .75, 1)));
    world.add(rb(.46, .6, .04, .02), '#8a6a45', T(tx2 + .02, 1.25, tz2 + .3)); world.add(rb(.38, .5, .02, .01), '#cfe3ea', T(tx2 + .02, 1.25, tz2 + .325));
    world.add(rb(.4, .06, .36, .02), '#9b6b3a', T(x, .42, z)); world.add(rb(.4, .4, .05, .02), '#9b6b3a', T(x, .62, z - .17));
    for (const [dx, dz] of [[-.17, -.15], [.17, -.15], [.17, .15], [-.17, .15]]) world.add(cy(.025, .025, .42, 5), '#7d5131', T(x + dx, 0, z + dz));
    npc(x + .55, z - .05, { shirt: '#f2efe6', pants: '#3b4f7a', hat: 'none', yaw: -.6 });
    table(x + .95, z - .45, .55, .4, .55, '#9b6b3a');
    world.add(rb(.3, .06, .2, .02), '#e9e2d0', T(x + .95, .62, z - .45)); world.add(cy(.03, .03, .16, 6), '#3b6fb3', T(x + 1.1, .6, z - .4));
    world.add(cy(.12, .1, .3, 10), '#d8d2c4', T(x + .4, 0, z + .5));
    hangSign('CẮT TÓC GỐC CÂY', x + .2, 1.6, z - .65, 1.3, '#5a3a20');
    world.add(cy(.03, .03, 1.45, 6), '#7d5c30', T(x + .2 - .6, 0, z - .67)); world.add(cy(.03, .03, 1.45, 6), '#7d5c30', T(x + .2 + .6, 0, z - .67)); }
  // --- Am xin quẻ (phóng to) ---
  { const Wf = grp(world, MK.fortune.x * k, MK.fortune.y * k, MK.fortune.s), x = 0, z = 0;
    Wf.add(rb(1.2, .2, .9, .06), PAL.stone2, T(x, .1, z));
    for (const [dx, dz] of [[-.48, -.32], [.48, -.32], [.48, .32], [-.48, .32]]) Wf.add(cy(.06, .06, 1.25, 8), PAL.red, T(x + dx, .2, z + dz));
    Wf.add(rb(.8, .45, .5, .04), '#7a2a20', T(x, .42, z - .05)); Wf.add(rb(.84, .04, .54, .02), PAL.gold, T(x, .66, z - .05));
    Wf.add(cy(.09, .08, .32, 12), '#b48a52', T(x - .15, .68, z));                                                  // ống xăm
    for (let i = 0; i < 9; i++) Wf.add(cy(.008, .008, .2, 4), '#d9c08a', T(x - .15 + Math.cos(i) * .04, .9, z + Math.sin(i) * .04, 0, 1, 1, 1, Math.sin(i * 2) * .2, Math.cos(i * 2) * .2));
    Wf.add(P.lathe([[0, 0], [.08, 0], [.1, .06], [.09, .08]], 10), PAL.bronze, T(x + .2, .68, z));
    Wf.add(P.frustum(1.6, 1.3, .5, .3, .5), PAL.roof, T(x, 1.45, z)); rods(Wf, x, 1.45, z, 1.6, 1.3, .5, .3, .5, 0, .22);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) horn(x + sx * .8, 1.48, z + sz * .65, [sx * .7, sz * .7], .55, Wf);
    Wf.add(sp(.08, 8), PAL.gold, T(x, 1.98, z)); }
  // --- Cây đa đầu chợ (khu quét lá) ---
  { const Wy = grp(world, MK.banyan.x * k, MK.banyan.y * k, MK.banyan.s), x = 0, z = 0;
    Wy.add(cy(.38, .55, 2.4, 14), '#7d6450', T(x, 0, z));
    for (let i = 0; i < 6; i++) { const a = i * 1.047 + .3; Wy.add(cy(.06, .16, .9, 8), '#735a46', T(x + Math.cos(a) * .35, 0, z + Math.sin(a) * .3, 0, 1, 1, 1, Math.sin(a) * .7, -Math.cos(a) * .7)); }
    for (let i = 0; i < 5; i++) { const a = i * 1.25 + .6; Wy.add(cy(.07, .13, 1.6, 8), '#7d6450', T(x + Math.cos(a) * .2, 1.9, z + Math.sin(a) * .2, 0, 1, 1, 1, Math.sin(a) * 1.0, -Math.cos(a) * 1.0)); }
    for (let i = 0; i < 14; i++) { const a = i * .9, rr = 1.0 + (i % 3) * .5; Wy.add(cy(.018, .018, 1.4 + (i % 4) * .4, 4), '#8a7058', T(x + Math.cos(a) * rr, 3.0 - (1.4 + (i % 4) * .4), z + Math.sin(a) * rr * .8)); }   // rễ phụ
    [[0, 3.6, 0, 1.9], [-1.3, 3.2, .3, 1.4], [1.3, 3.3, -.2, 1.5], [.3, 4.3, .1, 1.3], [-.6, 3.5, -1.0, 1.2], [.7, 3.3, 1.0, 1.25], [-1.6, 2.9, -.6, 1.0], [1.7, 2.9, .7, 1.0]].forEach(([dx, dy, dz, s], i) => Wy.add(sp(s, 14), [PAL.leaf3, PAL.leaf, '#4f7f3f'][i % 3], T(x + dx, dy, z + dz, 0, 1, .72, 1)));
    Wy.add(rb(.5, .3, .35, .05), PAL.stone2, T(x + .1, .15, z + .55)); Wy.add(P.lathe([[0, 0], [.1, 0], [.13, .08], [.12, .1]], 10), PAL.bronze, T(x + .1, .3, z + .55));   // bát hương gốc đa
  }
  // --- Sân kéo co ---
  { const t = MK.tug, x = t.x * k, z = t.y * k, w = t.w * k, h = t.h * k;
    world.add(rb(w, .05, h, .2), '#d9c08a', T(x, .0, z));
    world.add(rb(.06, .055, h - .2, .01), '#fff6e0', T(x, .0, z));
    for (const s of [-1, 1]) { world.add(rb(.05, .055, h - .2, .01), '#e9dcc0', T(x + s * 1.3, .0, z)); world.add(cy(.03, .03, 1.1, 6), '#6e5340', T(x + s * (w / 2 + .1), 0, z - h / 2)); world.add(rb(.4, .25, .02, .01), s < 0 ? '#c0392b' : '#2f6fb3', T(x + s * (w / 2 + .1) + .2 * -s, .95, z - h / 2)); }
    for (let i = 0; i < 4; i++) world.add(rb(.5, .2, .3, .05), '#a07850', T(x - 1.6 + i * 1.05, .1, z - h / 2 - .45));   // ghế dài cổ vũ
  }
  // --- Bãi khẩu nghiệp: sân tròn + cột loa phường ---
  { const sh = MK.shout, x = sh.x * k, z = sh.y * k;
    world.add(cy(sh.r * k, sh.r * k, .05, 40), '#bdb2a0', T(x, -.0, z));
    world.add(cy(sh.r * k - .25, sh.r * k - .25, .055, 40), '#c9bfae', T(x, 0, z));
    world.add(cy(.07, .09, 2.9, 10), '#8d949a', T(x, 0, z));
    for (const a of [.5, 2.1, 3.7, 5.2]) { world.add(cy(.04, .2, .35, 12), '#a7adb3', T(x + Math.cos(a) * .18, 2.6, z + Math.sin(a) * .18, 0, 1, 1, 1, Math.sin(a) * 1.3, -Math.cos(a) * 1.3)); }
    world.add(cy(.05, .05, .5, 6), '#8d949a', T(x, 2.45, z, 0, 1, 1, 1, 0, 1.5708));
    const sz = z + 1.6;                                                                       // sân khấu nhỏ
    world.add(rb(2.2, .35, .8, .05), '#8a5a35', T(x, .175, sz)); world.add(rb(2.24, .04, .84, .02), '#c0392b', T(x, .36, sz));
    for (const s2 of [-1, 1]) world.add(cy(.04, .04, 1.9, 6), '#5b3b22', T(x + s2 * 1.05, 0, sz + .35));
    world.add(rb(2.1, 1.1, .04, .02), '#a8302a', T(x, 1.15, sz + .38));
    addTex(signCanvas('XẢ GIẬN MIỄN PHÍ*', 800, 140, { bg: '#7a1f1a' }), 1.7, .3, T(x, 1.45, sz + .355, Math.PI));
    world.add(rb(.3, .4, .25, .04), '#2b2b2b', T(x - .85, .56, sz)); world.add(cy(.09, .09, .02, 12), '#555', T(x - .85, .6, sz - .13, 0, 1, 1, 1, 1.5708));   // loa thùng
    world.add(cy(.015, .015, .5, 4), '#888', T(x + .3, .36, sz - .1)); world.add(sp(.04, 6), '#333', T(x + .3, .88, sz - .1)); }

  // texture: hoành phi, câu đối, biển hiệu
  addTex(signCanvas('TỔ NGHIỆP DESIGNER', 1024, 160), 2.7, .42, M4.mul(HM, T(10, 2.56, 1.42)));
  addTex(verticalSign(['CTRL', '+S', 'THƯỜNG', 'XUYÊN'], 150, 600), .36, 1.44, M4.mul(HM, T(7.56, 1.72, 1.43)));
  addTex(verticalSign(['FILE', 'GỐC', 'MÃI', 'CÒN'], 150, 600), .36, 1.44, M4.mul(HM, T(12.44, 1.72, 1.43)));
  addTex(signCanvas('VẠN SỰ UNDO', 900, 130), 2.4, .32, M4.mul(HM, T(10, .83, 2.345)), .3);
  const gsign = (text, x, z) => { world.add(cy(.05, .05, .9, 8), PAL.woodDk, T(x, 0, z)); world.add(rb(1.9, .46, .08, .05), PAL.woodDk, T(x, .95, z)); addTex(signCanvas(text, 800, 180), 1.8, .4, T(x, .95, z + .045)); };
  const MKs = L.market;
  gsign('VƯỜN RAU PHƯỚC ĐỨC', (L.garden.x + L.garden.w / 2) * k, L.garden.y * k - .6); gsign('NÔNG TRẠI', (L.pen.x + L.pen.w / 2) * k, L.pen.y * k - .45);
  gsign('AM XIN QUẺ', MKs.fortune.x * k - 2.0, MKs.fortune.y * k + 1.5); gsign('GÁC CHUÔNG', L.bell.x * k + 2.0, L.bell.y * k + 1.5);
  gsign('SÂN KÉO CO', MKs.tug.x * k, (MKs.tug.y - MKs.tug.h / 2) * k - .7); gsign('BÃI KHẨU NGHIỆP', MKs.shout.x * k - 2.9, MKs.shout.y * k - 1.6); gsign('CÂY ĐA QUÉT LÁ', MKs.banyan.x * k + 2.0, MKs.banyan.y * k + 1.3);
  const gateSign = { mesh: R.mesh(new Geo().add(P.quad(1.66, .4), '#ffffff', T(0, 0, .045))), m: T(tx, 3.18, tz, 0, 1, 1, 1, -.38), tex: R.texture(signCanvas('CHÙA BA PHẢI', 800, 160)), em: .35 };

  return {
    world: { mesh: R.mesh(world) }, decal: { mesh: R.mesh(decal), noShadow: true }, glow: { mesh: R.mesh(glow), em: .9, noShadow: true },
    water: { mesh: R.mesh(water), em: .12 }, roof: { mesh: R.mesh(roof) }, gate: { mesh: R.mesh(gate) }, gateSign, texItems
  };
}

/* ---------------- Mesh động ---------------- */
function dynamicMeshes(R) {
  const m = {};
  const mk = fn => { const g = new Geo(); fn(g); return R.mesh(g); };
  m.cabbage = mk(g => {
    [[-.22, -.1], [0, -.14], [.22, -.1], [-.12, .12], [.12, .12]].forEach(([dx, dz]) => {
      g.add(sp(.15, 10), '#4f9a37', T(dx, .12, dz, 0, 1, .8, 1)); g.add(sp(.11, 10), '#7cc64f', T(dx, .19, dz)); g.add(sp(.06, 8), '#c6ec8c', T(dx, .27, dz));
    });
  });
  m.hole = mk(g => { g.add(cy(.24, .24, .02, 16), '#2e1a0c', T(0, .2, 0, 0, 1, 1, .7)); g.add(sp(.14, 8), '#7b5030', T(.3, .2, -.15, 0, 1, .5, 1)); });
  m.sprout = mk(g => { for (const dx of [-.2, 0, .2]) { g.add(cy(.012, .012, .12, 5), '#5aa83a', T(dx, .2, .14)); g.add(sp(.04, 6), '#8fd45a', T(dx + .03, .32, .14, 0, 1.4, .5, .8)); g.add(sp(.04, 6), '#8fd45a', T(dx - .03, .3, .14, 0, 1.4, .5, .8)); } });
  m.stick = mk(g => g.add(cy(.012, .012, 1, 5), '#c0472b', T(0, 0, 0)));
  m.tip = mk(g => g.add(sp(.025, 6), '#ff7a2a', T(0, 0, 0)));
  m.bell = mk(g => { g.add(cy(.02, .02, .3, 6), '#3a2a1a', T(0, -.3, 0)); g.add(P.lathe([[0, -1.0], [.34, -1.0], [.34, -.92], [.28, -.6], [.24, -.35], [.15, -.3], [0, -.28]], 18), '#9a7a33', T(0, 0, 0)); for (const y of [-.8, -.6]) g.add(cy(.31, .31, .03, 18), '#c8a24a', T(0, y, 0)); });
  m.ring = mk(g => g.add(P.lathe([[.34, 0], [.42, 0], [.42, .01], [.34, .01]], 28), '#ffd36b', T(0, .02, 0)));
  m.feet = mk(g => { g.add(sp(.08, 8), '#3b2a1e', T(0, .05, .03, 0, 1, .6, 1.4)); });
  m.hands = mk(g => { g.add(sp(.07, 8), PAL.skin, T(-.04, 0, 0, 0, .8, 1.3, .8)); g.add(sp(.07, 8), PAL.skin, T(.04, 0, 0, 0, .8, 1.3, .8)); });
  m.cushionGlow = null;
  // động vật
  m.cat = mk(g => {
    const o = '#f0a04b', d = '#c96f24';
    g.add(sp(.2, 12), o, T(0, .22, 0, 0, .85, .8, 1.25)); g.add(sp(.17, 12), o, T(0, .42, .26));
    for (const s of [-1, 1]) { g.add(cy(0, .07, .12, 6), o, T(s * .09, .54, .26, 0, 1, 1, 1, 0, -s * .3)); g.add(sp(.025, 6), '#222', T(s * .06, .45, .41)); g.add(sp(.05, 8), o, T(s * .1, .05, .18)); g.add(sp(.05, 8), o, T(s * .1, .05, -.18)); }
    g.add(sp(.03, 6), '#e98b9b', T(0, .4, .43)); for (let i = 0; i < 3; i++) g.add(rb(.3, .03, .04, .01), d, T(0, .36, -.05 + i * .1));
    for (let i = 0; i < 6; i++) g.add(sp(.055, 6), o, T(0, .22 + i * .07, -.28 - Math.sin(i * .5) * .12));
  });
  m.dog = mk(g => {
    const o = '#e1b06a', d = '#a36f34';
    g.add(sp(.22, 12), o, T(0, .27, 0, 0, .85, .85, 1.35));
    for (const [x, z] of [[-.11, .18], [.11, .18], [-.11, -.18], [.11, -.18]]) g.add(cy(.05, .05, .2, 8), o, T(x, 0, z));
    g.add(sp(.18, 12), o, T(0, .5, .3)); g.add(sp(.09, 10), '#f4dcb2', T(0, .45, .45, 0, 1, .8, 1.1)); g.add(sp(.035, 6), '#222', T(0, .48, .55));
    for (const s of [-1, 1]) { g.add(sp(.08, 8), d, T(s * .16, .5, .27, 0, .6, 1.4, .8, 0, s * .3)); g.add(sp(.025, 6), '#222', T(s * .07, .55, .45)); }
    g.add(cy(.03, .04, .22, 6), o, T(0, .35, -.32, 0, 1, 1, 1, -.9));
    g.add(cy(.17, .17, .04, 12), '#d33b2c', T(0, .4, .26, 0, 1, 1, 1, .5));
  });
  m.chicken = mk(g => {
    [[0, 0, '#fff7e6'], [-.45, .25, '#b0623a'], [.42, .3, '#fff7e6']].forEach(([x, z, c]) => {
      g.add(sp(.14, 10), c, T(x, .2, z, 0, .9, .85, 1.1)); g.add(sp(.09, 10), c, T(x, .36, z + .1));
      g.add(sp(.04, 6), '#e2372c', T(x, .46, z + .1, 0, .6, 1, 1)); g.add(cy(0, .03, .07, 6), '#f2a33a', T(x, .36, z + .19, 0, 1, 1, 1, 1.57));
      g.add(sp(.03, 6), '#e2372c', T(x, .3, z + .17)); g.add(cy(.012, .012, .1, 4), '#f2a33a', T(x - .04, 0, z)); g.add(cy(.012, .012, .1, 4), '#f2a33a', T(x + .04, 0, z));
      g.add(sp(.07, 8), c, T(x, .26, z - .14, 0, .8, 1.2, .8, -.4));
    });
  });
  m.buffalo = mk(g => {
    const o = '#6d6a75';
    g.add(sp(.35, 14), o, T(0, .55, 0, 0, .95, .85, 1.45));
    for (const [x, z] of [[-.2, .32], [.2, .32], [-.2, -.32], [.2, -.32]]) g.add(cy(.08, .09, .4, 8), o, T(x, 0, z));
    g.add(sp(.24, 12), o, T(0, .72, .55, 0, 1, .9, 1.05)); g.add(sp(.15, 10), '#8d8996', T(0, .64, .72, 0, 1.1, .8, .8));
    for (const s of [-1, 1]) { for (let i = 0; i < 5; i++) g.add(sp(.06 - i * .006, 6), '#efe6d6', T(s * (.2 + i * .07), .9 + Math.sin(i * .7) * .12, .52 - i * i * .012)); g.add(sp(.03, 6), '#222', T(s * .1, .78, .74)); g.add(sp(.08, 6), o, T(s * .25, .76, .5, 0, 1.3, .5, .8)); }
    g.add(cy(.02, .03, .35, 6), o, T(0, .62, -.5, 0, 1, 1, 1, -2.6));
  });
  m.fish = mk(g => { g.add(sp(.12, 10), '#ff8a3d', T(0, 0, 0, 0, .55, .45, 1.3)); g.add(cy(0, .09, .14, 6), '#ffb27a', T(0, 0, -.18, 0, 1, .4, 1, -1.57)); g.add(sp(.04, 6), '#ffffff', T(0, .03, .05)); });
  m.leafPile = mk(g => {
    const cs = ['#c9a43a', '#b5832e', '#8fa64a', '#d6b54e', '#a8702a'];
    for (let i = 0; i < 16; i++) { const a = i * 2.39, rr = (i % 4) * .07; g.add(sp(.075, 6), cs[i % 5], T(Math.cos(a) * rr, .03 + (3 - i % 4) * .025, Math.sin(a) * rr * .8, a, 1.4, .25, .8)); }
  });
  m.broom = mk(g => { g.add(cy(.018, .018, .75, 6), '#a07a45', T(0, .2, 0)); g.add(cy(.03, .16, .26, 10), '#c9a85a', T(0, 0, 0, 0, 1, 1, .45)); });
  m.rope = mk(g => g.add(cy(.025, .025, 1, 6), '#c9a26a', T(0, 0, 0, 0, 1, 1, 1, 0, 1.5708)));
  m.flag = mk(g => { g.add(cy(.012, .012, .5, 4), '#6e5340', T(0, -.25, 0)); g.add(rb(.22, .14, .01, .005), '#c0392b', T(.11, .18, 0)); });
  m.fishW = mk(g => { g.add(sp(.12, 10), '#ffffff', T(0, 0, 0, 0, .55, .45, 1.3)); g.add(cy(0, .09, .14, 6), '#ffe0d0', T(0, 0, -.18, 0, 1, .4, 1, -1.57)); g.add(sp(.05, 6), '#ff5a2a', T(0, .04, .03)); });
  return m;
}

/* ---------------- Nhân vật ---------------- */
const avCache = {};
function shade(hex, k) { const h = hex.replace('#', ''); return '#' + [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(h.substr(i, 2), 16) * k))).toString(16).padStart(2, '0')).join(''); }
function avatarMeshes(R, color, hat, hair) {
  hair = hair || (hat === 'bald' ? 'bald' : 'bun'); if (hat === 'bald') hat = 'none';
  const key = color + hat + hair; if (avCache[key]) return avCache[key];
  const mk = fn => { const g = new Geo(); fn(g); return R.mesh(g); };
  const trim = shade(color, .62), light = color.toLowerCase() === '#efe7d6';
  const inner = light ? '#d8cdb4' : '#f3ead8';
  // Áo tràng / áo giao lĩnh: thân dài chấm gót, cổ chéo, đai thắt
  const robe = g => {
    g.add(P.lathe([[0, .04], [.27, .04], [.29, .07], [.25, .3], [.19, .5], [.13, .58], [0, .6]], 20), color, T(0, 0, 0));
    g.add(cy(.285, .29, .05, 20), trim, T(0, .04, 0));                       // gấu áo
    g.add(cy(.218, .212, .05, 18), trim, T(0, .29, 0));                       // đai lưng
    g.add(rb(.1, .07, .05, .02), trim, T(.06, .3, .2, 0, 1, 1, 1, 0, .3));    // nút thắt đai
    g.add(rb(.035, .16, .02, .01), trim, T(.09, .2, .21, 0, 1, 1, 1, 0, .15));
    // cổ giao lĩnh: vạt trái đè vạt phải, viền cổ sẫm và lớp áo trong sáng màu
    g.add(rb(.05, .26, .02, .01), inner, T(-.035, .45, .155, 0, 1, 1, 1, -.35, .55));
    g.add(rb(.055, .3, .022, .01), trim, T(.02, .43, .165, 0, 1, 1, 1, -.33, -.62));
    g.add(rb(.05, .26, .02, .01), trim, T(-.07, .45, .148, 0, 1, 1, 1, -.35, .55));
  };
  const body = mk(robe);
  // Tay áo rộng buông hai bên
  const armsSide = mk(g => { for (const s of [-1, 1]) { g.add(sp(.085, 10), color, T(s * .22, .38, 0, 0, .95, 1.6, 1.05, 0, s * .22)); g.add(sp(.095, 10), color, T(s * .26, .25, .01, 0, 1.15, .8, 1.25)); g.add(sp(.05, 8), PAL.skin, T(s * .27, .19, .04)); } });
  // Tay áo đưa ra trước, hai bàn tay chắp trước ngực
  const armsPray = mk(g => {
    for (const s of [-1, 1]) { g.add(sp(.08, 10), color, T(s * .19, .4, .08, 0, .95, 1.3, 1.1, -.6, s * .35)); g.add(sp(.09, 10), color, T(s * .1, .38, .2, 0, 1.1, .85, 1.2, 0, -s * .5)); }
    g.add(sp(.05, 8), PAL.skin, T(-.025, .46, .25, 0, .7, 1.45, .75)); g.add(sp(.05, 8), PAL.skin, T(.025, .46, .25, 0, .7, 1.45, .75));
  });
  const sitBody = mk(g => {
    g.add(sp(.31, 14), color, T(0, .13, 0, 0, 1.05, .45, 1)); g.add(sp(.24, 12), trim, T(0, .1, .05, 0, 1.1, .3, .8));
    g.add(P.lathe([[.0, .1], [.21, .1], [.18, .4], [.12, .5], [0, .52]], 16), color, T(0, 0, 0));
    g.add(rb(.05, .2, .02, .01), trim, T(.02, .4, .16, 0, 1, 1, 1, -.3, -.6));
    for (const s of [-1, 1]) g.add(sp(.085, 10), color, T(s * .15, .3, .12, 0, 1.1, .8, 1.2, 0, s * .4));
    g.add(sp(.05, 8), PAL.skin, T(-.03, .3, .22)); g.add(sp(.05, 8), PAL.skin, T(.03, .3, .22));
  });
  const head = mk(g => {
    g.add(sp(.27, 16), PAL.skin, T(0, 0, 0));
    const lowHat = ['beanie', 'khan', 'khanvan'].includes(hat), bigHat = ['non', 'quaithao'].includes(hat);
    // Tóc
    if (hair === 'bald') {
      g.add(sp(.272, 16), shade(PAL.skin, .93), T(0, .03, -.02, 0, 1, .96, 1));
      if (!lowHat && !bigHat) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.add(sp(.012, 4), '#c9a07a', T(-.05 + i * .05, .2 + j * .05, .12 - j * .03));
    } else if (lowHat) g.add(sp(.272, 12), PAL.hair, T(0, -.03, -.07, 0, 1, .88, .9));          // tóc lộ ra dưới khăn/mũ
    else {
      g.add(sp(.285, 14), PAL.hair, T(0, hair === 'short' ? .07 : .05, -.05, 0, 1, hair === 'short' ? .88 : .95, .98));
      if (hair === 'bun' && hat !== 'non' && hat !== 'quaithao') { g.add(sp(.11, 10), PAL.hair, T(0, .3, -.1)); g.add(cy(.06, .06, .04, 10), '#c9a862', T(0, .24, -.09, 0, 1, 1, 1, -.4)); }
    }
    for (const s of [-1, 1]) { g.add(sp(.038, 8), '#2a1a10', T(s * .09, -.01, .245, 0, 1, 1.25, .6)); g.add(sp(.012, 4), '#ffffff', T(s * .09 + .012, .015, .27)); g.add(sp(.045, 8), '#e9a297', T(s * .16, -.07, .2, 0, 1, .6, .5)); g.add(sp(.06, 8), PAL.skin, T(s * .27, -.02, 0, 0, .5, 1, .8)); }
    g.add(rb(.06, .015, .02, .007), '#7a3a2a', T(0, -.1, .262));
    // Đồ đội đầu
    if (hat === 'non') { g.add(cy(0, .4, .3, 22), '#e6cf98', T(0, .15, 0)); g.add(cy(.4, .4, .015, 22), '#c9ad6e', T(0, .15, 0)); for (let i = 1; i < 4; i++) g.add(cy(.4 - i * .1 + .005, .4 - i * .1 + .005, .006, 22), '#cdb27a', T(0, .15 + i * .075, 0)); }
    else if (hat === 'quaithao') {                          // nón quai thao: vành rộng, mặt phẳng, tua đen
      g.add(cy(.2, .22, .14, 18), '#cdb27a', T(0, .14, 0));
      g.add(cy(.52, .5, .06, 28), '#e3cd92', T(0, .26, 0)); g.add(cy(.525, .525, .03, 28), '#3b2a1e', T(0, .23, 0));
      for (let i = 0; i < 3; i++) g.add(cy(.45 - i * .12, .45 - i * .12, .005, 28), '#c9ad6e', T(0, .325, 0));
      for (const s of [-1, 1]) g.add(cy(.008, .008, .42, 4), '#2a2020', T(s * .26, -.2, .05, 0, 1, 1, 1, 0, -s * .2));
    }
    else if (hat === 'khan') {                              // khăn xếp: vành khăn tròn, đỉnh phẳng, nếp xếp chéo
      const kc = '#2a2321', kl = '#5b4c42';
      // vành khăn bọc kín đỉnh đầu (đỉnh khăn 0.33 > đỉnh đầu 0.27)
      g.add(P.lathe([[.288, 0], [.303, .02], [.309, .15], [.3, .21], [.25, .26], [.13, .28], [0, .283]], 26), kc, T(0, .05, -.01));
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; g.add(rb(.022, .16, .014, .006), kl, T(Math.sin(a) * .309, .13, -.01 + Math.cos(a) * .309, a, 1, 1, 1, 0, .5)); }
      g.add(cy(.302, .302, .02, 26), '#463c38', T(0, .06, -.01));
    }
    else if (hat === 'khanvan') {                           // khăn vấn: vòng khăn nhung tròn quanh đầu
      const ring = [];
      for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + i / 16 * Math.PI * 2; ring.push([.275 + Math.cos(a) * .085, Math.sin(a) * .085]); }
      g.add(P.lathe(ring, 24), '#4a2e30', T(0, .12, -.01, 0, 1, 1, 1, -.15));
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.add(rb(.025, .17, .02, .008), '#5d3b3d', T(Math.sin(a) * .36, .12, -.01 + Math.cos(a) * .36, a, 1, 1, 1, 0, .7)); }
    }
    else if (hat === 'beanie') {
      g.add(P.lathe([[.302, .02], [.3, .1], [.27, .2], [.21, .28], [.12, .33], [0, .345]], 20), '#c9a862', T(0, .09, -.01));
      g.add(P.lathe([[.31, -.03], [.318, .0], [.318, .07], [.31, .1], [.28, .1]], 22), '#a98a4c', T(0, .09, -.01));
      g.add(sp(.075, 10), '#f6ecd9', T(0, .47, -.01));
    }
    else if (hat === 'headphone') { for (let i = 0; i <= 10; i++) { const a = Math.PI * i / 10; g.add(sp(.035, 6), '#262626', T(Math.cos(a) * .31, Math.sin(a) * .31 + .02, 0)); } for (const s of [-1, 1]) g.add(cy(.1, .1, .08, 14), '#c9a862', T(s * .3, .0, 0, 0, 1, 1, 1, 0, s * 1.57)); }
  });
  return (avCache[key] = { body, sitBody, head, armsSide, armsPray });
}

window.WORLD = { build, dynamicMeshes, avatarMeshes, plaqueCanvas, T, PAL };
})();
