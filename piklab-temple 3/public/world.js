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
  tileA: '#d8b08e', tileB: '#c99d7d', tileC: '#ebdcc4', tileHA: '#8f4a3c', tileHB: '#e6d3b4',
  wall: '#e3cd9c', cap: '#9a5444', red: '#93392d', redDk: '#62261d', gold: '#c9a862', wood: '#a88262', woodDk: '#6e5340',
  roof: '#9e5a48', roofDk: '#7d463a', jade: '#5c9a88', stone: '#d6cdbb', stone2: '#b4aa98', bronze: '#a88449', water: '#6fa8b4',
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
  const world = new Geo(), glow = new Geo(), roof = new Geo(), gate = new Geo(), water = new Geo();
  const items = [], texItems = [];
  const r = rng(7);
  const k = .01; // px -> đơn vị 3D

  // nền diorama nhiều lớp
  world.add(rb(20.6, .5, 15.6, .22, 3), PAL.grass, T(10, -.25, 7.5));
  world.add(rb(20.3, 1.1, 15.3, .3, 3), PAL.soilSide, T(10, -.95, 7.5));
  world.add(rb(19.8, .6, 14.8, .25, 2), PAL.soilDeep, T(10, -1.55, 7.5));
  for (let i = 0; i < 70; i++) { const x = .8 + r() * 18.4, z = .8 + r() * 13.4, s = .3 + r() * .7; world.add(cy(s, s, .015, 12), r() > .5 ? PAL.grass2 : PAL.grass3, T(x, 0, z, 0, 1, 1, .6 + r() * .4)); }

  // lát gạch (lưới 0.5)
  const rects = [[8, 4.95, 12, 14.4], [7.6, 5.25, 12.4, 7.9], [3.5, 5.4, 7.6, 6.1], [2.98, 3.7, 3.62, 7.3], [5.9, 8.75, 8, 9.5], [12, 8.75, 14, 9.5]];
  const tile = rb(.46, .08, .46, .03, 1), cells = new Set();
  for (const [x0, z0, x1, z1] of rects) for (let x = Math.floor(x0 * 2) / 2; x < x1; x += .5) for (let z = Math.floor(z0 * 2) / 2; z < z1; z += .5) {
    const cx = x + .25, cz = z + .25; if (cx < x0 || cx > x1 || cz < z0 || cz > z1) continue;
    const key = cx + ',' + cz; if (cells.has(key)) continue; cells.add(key);
    const chk = (Math.round(cx * 2) + Math.round(cz * 2)) % 2;
    world.add(tile, r() < .08 ? PAL.tileC : chk ? PAL.tileA : PAL.tileB, T(cx, .03, cz, (r() - .5) * .03));
  }
  // cỏ lá
  const blade = C('blade', () => P.cyl(0, .035, .22, 5));
  const onPath = (x, z) => cells.has((Math.floor(x * 2) / 2 + .25) + ',' + (Math.floor(z * 2) / 2 + .25));
  for (let i = 0; i < 420; i++) {
    const x = .7 + r() * 18.6, z = .7 + r() * 13.6;
    if (onPath(x, z) || (x > 6.8 && x < 13.2 && z < 5.2) || (x > 1.3 && x < 6 && z > 7.2 && z < 10.8) || (Math.hypot((x - 16.2) / 1.9, (z - 8.25) / 1) < 1)) continue;
    const c = r() > .5 ? PAL.leaf2 : PAL.grass3;
    for (let j = 0; j < 3; j++) world.add(blade, c, T(x + (j - 1) * .05, 0, z + (r() - .5) * .06, 0, 1, .7 + r() * .6, 1, (j - 1) * .35, (r() - .5) * .3));
    if (r() < .12) world.add(sp(.05, 6), ['#fff4c2', '#ffb3c9', '#ffffff'][(r() * 3) | 0], T(x, .2, z));
  }

  // tường bao
  const wallSeg = (x, z, w, d, h) => { world.add(rb(w, h, d, .08), PAL.wall, T(x, h / 2, z)); world.add(rb(w + .14, .14, d + .14, .05), PAL.cap, T(x, h + .05, z)); };
  wallSeg(10, .32, 19.6, .44, 1.0); wallSeg(.32, 7.5, .44, 14.2, .8); wallSeg(19.68, 7.5, .44, 14.2, .8);
  wallSeg(4.4, 14.68, 8.2, .4, .55); wallSeg(15.6, 14.68, 8.2, .4, .55);
  for (const [x, z, h] of [[.32, .32, 1.25], [19.68, .32, 1.25], [.32, 14.68, 1.0], [19.68, 14.68, 1.0], [.32, 7.5, 1.05], [19.68, 7.5, 1.05]]) { world.add(rb(.62, h, .62, .1), PAL.wall, T(x, h / 2, z)); world.add(rb(.74, .14, .74, .06), PAL.cap, T(x, h + .06, z)); world.add(sp(.12), PAL.gold, T(x, h + .2, z)); }

  /* ---- Chánh điện ---- */
  world.add(rb(6.3, .26, 4.0, .08), '#a14a33', T(10, .0, 3.0));
  for (let x = 7.25; x < 12.75; x += .5) for (let z = 1.45; z < 4.95; z += .5) world.add(tile, ((x * 2 + z * 2) | 0) % 2 ? PAL.tileHA : PAL.tileHB, T(x + .25, .1, z + .25));
  world.add(rb(1.3, .03, 2.6, .01), '#c0262a', T(10, .145, 3.55)); // thảm đỏ
  world.add(rb(1.1, .035, 2.5, .01), '#e4ad46', T(10, .14, 3.55));
  world.add(rb(1.0, .04, 2.4, .01), '#c0262a', T(10, .145, 3.55));
  for (let i = 0; i < 2; i++) world.add(rb(6.4 - i * .1, .1, .32, .04), PAL.stone, T(10, .03 + i * .06, 5.1 + i * .02 - i * .2)); // bậc thềm
  world.add(rb(6.0, 2.85, .3, .06), PAL.wall, T(10, 1.42, 1.25));
  world.add(rb(.28, 2.6, 3.7, .06), PAL.wall, T(7.14, 1.3, 2.95));
  world.add(rb(.28, 2.6, 3.7, .06), PAL.wall, T(12.86, 1.3, 2.95));
  for (const x of [7.4, 8.6, 11.4, 12.6]) {
    world.add(rb(.36, .14, .36, .05), PAL.stone, T(x, .17, 4.8));
    world.add(cy(.12, .13, 2.45, 14), PAL.red, T(x, .2, 4.8));
    world.add(cy(.15, .15, .1, 14), PAL.gold, T(x, 2.5, 4.8));
    world.add(cy(.135, .135, .06, 14), PAL.gold, T(x, .25, 4.8));
  }
  roof.add(rb(6.3, .24, .26, .05), PAL.redDk, T(10, 2.62, 4.8));
  roof.add(rb(6.32, .05, .28, .02), PAL.gold, T(10, 2.5, 4.8));
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
  const horn = (x, y, z, dir, s = 1, gg = roof) => { for (let i = 0; i < 5; i++) gg.add(sp(.1 * s * (1 - i * .1), 8), i === 4 ? PAL.gold : PAL.roofDk, T(x + dir[0] * i * .09 * s, y + i * i * .03 * s, z + dir[1] * i * .09 * s)); };
  roof.add(P.frustum(7.2, 5.0, 5.2, 2.3, .95, -.05), PAL.roof, T(10, 2.74, 3.0)); rods(roof, 10, 2.74, 3.0, 7.2, 5.0, 5.2, 2.3, .95, -.05);
  roof.add(rb(7.3, .1, 5.1, .05), PAL.roofDk, T(10, 2.74, 3.0));
  roof.add(rb(7.34, .05, 5.14, .02), PAL.gold, T(10, 2.8, 3.0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) horn(10 + sx * 3.6, 2.8, 3 + sz * 2.5, [sx * .7, sz * .7], 1.3);
  roof.add(rb(4.6, .4, 1.8, .06), PAL.wall, T(10, 3.85, 2.95));
  roof.add(P.frustum(5.8, 2.8, 3.8, .5, .78), PAL.roof, T(10, 4.0, 2.95)); rods(roof, 10, 4.0, 2.95, 5.8, 2.8, 3.8, .5, .78, 0, .28);
  roof.add(rb(5.9, .08, 2.9, .04), PAL.gold, T(10, 4.02, 2.95));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) horn(10 + sx * 2.9, 4.05, 2.95 + sz * 1.4, [sx * .7, sz * .7], 1);
  roof.add(rb(4.2, .22, .32, .08), PAL.roofDk, T(10, 4.86, 2.95));
  roof.add(rb(4.22, .05, .34, .02), PAL.gold, T(10, 4.98, 2.95));
  roof.add(sp(.2, 14), PAL.gold, T(10, 5.25, 2.95)); roof.add(cy(0, .12, .25, 10), PAL.gold, T(10, 5.38, 2.95));
  for (const s of [-1, 1]) { // rồng cách điệu
    for (let i = 0; i < 9; i++) { const t = i / 8; roof.add(sp(.11 - t * .03, 8), PAL.jade, T(10 + s * (1.9 - t * 1.4), 5.05 + Math.sin(t * Math.PI * 1.5) * .22, 2.95)); }
    roof.add(sp(.14, 10), PAL.jade, T(10 + s * .45, 5.2, 2.95)); roof.add(cy(0, .05, .2, 6), PAL.gold, T(10 + s * .45, 5.3, 2.95, 0, 1, 1, 1, 0, s * .5));
  }
  // ban thờ
  world.add(rb(4.4, .95, .72, .06), PAL.redDk, T(10, .6, 1.95));
  world.add(rb(4.46, .07, .78, .03), PAL.gold, T(10, 1.08, 1.95));
  for (let i = 0; i < 4; i++) { world.add(rb(.9, .26, .04, .04), '#9a3423', T(8.6 + i * .93, .5, 2.32)); world.add(rb(.12, .04, .04, .02), PAL.gold, T(8.6 + i * .93, .5, 2.35)); }
  world.add(rb(4.4, .08, .06, .02), PAL.gold, T(10, .3, 2.32));
  world.add(rb(4.3, 1.48, .44, .05), '#8f2a1c', T(10, .87, 1.5));
  world.add(rb(4.34, .06, .48, .02), PAL.gold, T(10, 1.61, 1.5));
  for (const x of [8.05, 11.95]) { world.add(cy(.07, .07, .4, 12), PAL.cream, T(x, 1.11, 2.05)); world.add(cy(.1, .12, .06, 12), PAL.gold, T(x, 1.11, 2.05)); glow.add(sp(.06, 8), '#ffcf5a', T(x, 1.58, 2.05, 0, 1, 1.7, 1)); }
  const plate = (x, fruits) => { world.add(cy(.26, .12, .08, 16), PAL.gold, T(x, 1.11, 2.0)); fruits.forEach(([dx, dy, dz, s, c]) => world.add(sp(s, 10), c, T(x + dx, 1.25 + dy, 2.0 + dz))); };
  plate(8.85, [[-.1, 0, 0, .1, '#f39a2b'], [.1, 0, .02, .1, '#f2c14e'], [0, 0, -.1, .1, '#e2493a'], [0, .14, 0, .09, '#7cbf3f'], [.05, 0, .12, .09, '#f39a2b']]);
  plate(11.15, [[-.08, 0, 0, .12, '#e6457a'], [.1, 0, .03, .1, '#f2c14e'], [0, .15, 0, .1, '#8bc34a'], [.02, -.02, .13, .08, '#f39a2b']]);
  for (const x of [9.45, 10.55]) { world.add(P.lathe([[0, 0], [.07, 0], [.1, .12], [.05, .26], [.08, .32]], 12), '#3b7fb8', T(x, 1.11, 1.9)); for (let i = 0; i < 5; i++) world.add(sp(.065, 8), i % 2 ? '#ffd23f' : '#ffb627', T(x + Math.cos(i * 1.3) * .09, 1.5 + (i % 2) * .06, 1.9 + Math.sin(i * 1.3) * .07)); }
  world.add(P.lathe([[0, 0], [.14, 0], [.2, .1], [.22, .2], [.19, .22]], 16), PAL.bronze, T(10, 1.11, 2.0));
  world.add(cy(.19, .19, .01, 16), '#d8c7a6', T(10, 1.31, 2.0));
  for (const x of [9.55, 10.45]) { world.add(cy(.28, .3, .1, 16), '#e9b949', T(x, .13, 3.0)); world.add(sp(.2, 10), '#f0c55a', T(x, .25, 3.0, 0, 1.3, .3, 1.3)); }
  // chuông/mõ trong điện
  world.add(sp(.24, 12), '#a8552b', T(8.3, .42, 2.9, 0, 1, .75, 1)); world.add(cy(.28, .28, .12, 14), '#e3b24a', T(8.3, .13, 2.9));

  /* ---- Lư hương lớn ---- */
  const bx = L.bowl.x * k, bz = L.bowl.y * k - .05;
  world.add(rb(1.15, .28, 1.15, .1), PAL.stone, T(bx, .14, bz));
  world.add(rb(.95, .14, .95, .06), PAL.stone2, T(bx, .34, bz));
  world.add(P.lathe([[0, 0], [.3, 0], [.48, .12], [.6, .32], [.62, .5], [.56, .52], [.54, .5]], 22), PAL.bronze, T(bx, .4, bz));
  world.add(cy(.55, .55, .01, 20), '#d9c8a6', T(bx, .86, bz));
  for (let i = 0; i < 3; i++) { const a = i * 2.09 + .5; world.add(cy(.07, .05, .2, 8), '#8a6020', T(bx + Math.cos(a) * .3, .32, bz + Math.sin(a) * .3)); }
  for (const s of [-1, 1]) world.add(rb(.1, .28, .2, .04), PAL.bronze, T(bx + s * .66, .85, bz));

  /* ---- Gác chuông ---- */
  const gx = L.bell.x * k, gz = L.bell.y * k;
  world.add(rb(1.7, .26, 1.3, .08), PAL.stone, T(gx, .13, gz));
  for (const [dx, dz] of [[-.65, -.45], [.65, -.45], [.65, .45], [-.65, .45]]) world.add(cy(.08, .09, 1.95, 10), PAL.red, T(gx + dx, .26, gz + dz));
  world.add(rb(1.55, .14, .14, .04), PAL.redDk, T(gx, 2.05, gz));
  world.add(P.frustum(2.1, 1.7, .9, .5, .6), PAL.roof, T(gx, 2.15, gz)); rods(world, gx, 2.15, gz, 2.1, 1.7, .9, .5, .6, 0, .24); world.add(rb(2.16, .07, 1.76, .03), PAL.gold, T(gx, 2.15, gz));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) horn(gx + sx * 1.05, 2.2, gz + sz * .85, [sx * .7, sz * .7], .8, world);
  world.add(sp(.12, 10), PAL.gold, T(gx, 2.85, gz));

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
  fence(g0x, g0z, g1x, g0z); fence(g0x, g1z, g1x, g1z); fence(g0x, g0z, g0x, g1z); fence(g1x, g0z, g1x, g1z, 8.6, 9.6, 'z');
  L.plots.forEach(p => {
    world.add(rb(.9, .2, .7, .1, 2), '#6b4024', T(p.x * k, .1, p.y * k - .05));
    for (let i = -1; i <= 1; i++) world.add(rb(.78, .02, .05, .02), '#56331c', T(p.x * k, .205, p.y * k - .05 + i * .2));
  });
  // đồ trang trí vườn
  world.add(P.lathe([[0, 0], [.2, 0], [.24, .2], [.22, .42], [.18, .44]], 14), '#8c5a33', T(1.75, 0, 7.55));
  for (let i = 0; i < 3; i++) world.add(rb(.5, .03, .05, .01), '#5e3a20', T(1.75, .1 + i * .14, 7.55 + .2));
  world.add(sp(.2, 10), '#d8c39a', T(5.55, .18, 10.45, 0, 1.2, .9, 1)); world.add(sp(.16, 10), '#cdb487', T(5.25, .14, 10.55, 0, 1.2, .9, 1));
  world.add(P.lathe([[0, 0], [.13, 0], [.15, .2], [.13, .22]], 12), '#5aa0c8', T(1.75, .02, 10.45)); world.add(cy(.02, .02, .3, 6), '#5aa0c8', T(1.9, .12, 10.45, 0, 1, 1, 1, 0, -1.0));

  /* ---- Vườn thú ---- */
  const pn = L.pen;
  world.add(rb(pn.w * k, .03, pn.h * k, .25), '#93c86b', T((pn.x + pn.w / 2) * k, .0, (pn.y + pn.h / 2) * k));
  const p0x = pn.x * k, p0z = pn.y * k, p1x = (pn.x + pn.w) * k, p1z = (pn.y + pn.h) * k;
  fence(p0x, p0z, p1x, p0z); fence(p0x, p1z, p1x, p1z); fence(p1x, p0z, p1x, p1z); fence(p0x, p0z, p0x, p1z, 8.6, 9.6, 'z');
  const pd = L.pond, px = pd.x * k, pz = pd.y * k, prx = pd.rx * k, prz = pd.ry * k;
  water.add(cy(1, 1, .06, 36), PAL.water, T(px, .0, pz, 0, prx, 1, prz));
  world.add(cy(1, 1, .02, 36), '#2f7f98', T(px, -.0, pz, 0, prx * .96, 1, prz * .96));
  for (let a = 0; a < Math.PI * 2; a += .2) world.add(sp(.17, 8), r() > .5 ? '#bdb6a6' : '#a59d8b', T(px + Math.cos(a) * (prx + .08), .05, pz + Math.sin(a) * (prz + .08), a, 1.3, .55, 1));
  [[-1.1, -.2], [-.6, .35], [.4, -.4], [1.0, .2], [1.3, -.15], [-.1, .45], [-1.4, .18]].forEach(([dx, dz], i) => {
    water.add(cy(.17, .17, .02, 14), i % 2 ? '#5d9c40' : '#4d8a33', T(px + dx, .07, pz + dz));
    if (i % 2 === 0) { for (let j = 0; j < 6; j++) { const a = j * 1.047; world.add(sp(.06, 8), j % 2 ? PAL.pink : PAL.pink2, T(px + dx + Math.cos(a) * .05, .14, pz + dz + Math.sin(a) * .05, -a, .6, 1.4, .6, 0, .5)); } world.add(sp(.035, 6), '#ffe27a', T(px + dx, .16, pz + dz)); }
  });
  world.add(sp(.8, 14), '#e8c35d', T(15.9, .05, 11.45, 0, 1, .32, .55)); // ổ rơm
  // chuồng chó
  const dhx = 18.6, dhz = 9.85;
  world.add(rb(.9, .7, .8, .06), '#c9763f', T(dhx, .35, dhz)); world.add(rb(.4, .45, .05, .1), '#4a2a18', T(dhx, .3, dhz + .41));
  world.add(P.frustum(1.1, 1.0, .1, 1.0, .45), '#d94f3a', T(dhx, .7, dhz));
  world.add(cy(.17, .14, .08, 14), '#3d8fd1', T(dhx - .7, 0, dhz + .5)); world.add(cy(.15, .15, .01, 14), '#c49a5b', T(dhx - .7, .08, dhz + .5));
  world.add(P.lathe([[0, 0], [.16, 0], [.22, .12], [.24, .3]], 14), '#a7764a', T(14.5, 0, 12.6)); // máng

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
    glow.add(sp(.15, 12), '#e8452f', T(x + side * .36, 1.2, z, 0, 1, 1.15, 1));
    world.add(cy(.07, .07, .04, 10), PAL.gold, T(x + side * .36, 1.0, z)); world.add(cy(.01, .02, .12, 6), '#f0c25a', T(x + side * .36, .88, z));
  }
  /* ---- Tam quan ---- */
  const tx = L.gate.x * k, tz = 14.75;
  for (const dx of [-2.1, -1.0, 1.0, 2.1]) { gate.add(rb(.38, .16, .38, .05), PAL.stone, T(tx + dx, .08, tz)); gate.add(cy(.13, .14, Math.abs(dx) > 2 ? 1.55 : 2.05, 12), PAL.red, T(tx + dx, .16, tz)); }
  gate.add(rb(1.9, .26, .34, .06), PAL.redDk, T(tx, 2.1, tz)); gate.add(rb(4.4, .16, .3, .05), PAL.redDk, T(tx, 1.62, tz));
  gate.add(P.frustum(2.8, 1.2, 1.6, .25, .55), PAL.roof, T(tx, 2.25, tz)); rods(gate, tx, 2.25, tz, 2.8, 1.2, 1.6, .25, .55, 0, .24); gate.add(rb(2.86, .06, 1.24, .02), PAL.gold, T(tx, 2.26, tz));
  for (const s of [-1, 1]) { gate.add(P.frustum(1.6, 1.0, .8, .2, .4), PAL.roof, T(tx + s * 1.6, 1.72, tz)); for (const sz of [-1, 1]) { for (let i = 0; i < 4; i++) gate.add(sp(.08 * (1 - i * .1), 8), i === 3 ? PAL.gold : PAL.roofDk, T(tx + s * (1.4 + i * .08), 2.28 + i * i * .025, tz + sz * (.6 + i * .05))); } }
  // biển tên chùa dựng trên nóc cổng, nghiêng về phía người xem
  for (const dx of [-.62, .62]) gate.add(cy(.035, .035, .5, 8), PAL.redDk, T(tx + dx, 2.72, tz));
  gate.add(rb(1.78, .5, .08, .05), PAL.redDk, T(tx, 3.18, tz, 0, 1, 1, 1, -.38));
  gate.add(sp(.12, 10), PAL.gold, T(tx, 3.55, tz - .1));
  for (const s of [-1, 1]) gate.add(sp(.07, 8), PAL.gold, T(tx + s * .92, 3.2, tz));

  // texture: hoành phi, câu đối, biển hiệu
  const addTex = (cv, w, h, m, em = .35, frame) => { const tex = R.texture(cv); if (frame) world.add(frame[0], frame[1], frame[2]); texItems.push({ mesh: R.mesh(new Geo().add(P.quad(w, h), '#ffffff')), m, tex, em }); };
  addTex(signCanvas('TỔ NGHIỆP DESIGNER', 1024, 160), 2.7, .42, T(10, 2.56, 1.42));
  addTex(verticalSign(['CTRL', '+S', 'THƯỜNG', 'XUYÊN'], 150, 600), .36, 1.44, T(7.56, 1.72, 1.43));
  addTex(verticalSign(['FILE', 'GỐC', 'MÃI', 'CÒN'], 150, 600), .36, 1.44, T(12.44, 1.72, 1.43));
  addTex(signCanvas('VẠN SỰ UNDO', 900, 130), 2.4, .32, T(10, .83, 2.345), .3);
  const gsign = (text, x, z) => { world.add(cy(.05, .05, .9, 8), PAL.woodDk, T(x, 0, z)); world.add(rb(1.9, .46, .08, .05), PAL.woodDk, T(x, .95, z)); addTex(signCanvas(text, 800, 180), 1.8, .4, T(x, .95, z + .045)); };
  gsign('VƯỜN RAU PHƯỚC ĐỨC', 3.65, 7.05); gsign('VƯỜN THÚ CƯNG', 15.5, 6.78);
  const gateSign = { mesh: R.mesh(new Geo().add(P.quad(1.66, .4), '#ffffff', T(0, 0, .045))), m: T(tx, 3.18, tz, 0, 1, 1, 1, -.38), tex: R.texture(signCanvas('CHÙA BA PHẢI', 800, 160)), em: .35 };

  return {
    world: { mesh: R.mesh(world) }, glow: { mesh: R.mesh(glow), em: .9, noShadow: true },
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
  m.fishW = mk(g => { g.add(sp(.12, 10), '#ffffff', T(0, 0, 0, 0, .55, .45, 1.3)); g.add(cy(0, .09, .14, 6), '#ffe0d0', T(0, 0, -.18, 0, 1, .4, 1, -1.57)); g.add(sp(.05, 6), '#ff5a2a', T(0, .04, .03)); });
  return m;
}

/* ---------------- Nhân vật ---------------- */
const avCache = {};
function avatarMeshes(R, color, hat) {
  const key = color + hat; if (avCache[key]) return avCache[key];
  const mk = fn => { const g = new Geo(); fn(g); return R.mesh(g); };
  const body = mk(g => {
    g.add(P.lathe([[0, .06], [.26, .06], [.27, .1], [.24, .3], [.17, .52], [.12, .58], [0, .6]], 18), color, T(0, 0, 0));
    g.add(cy(.215, .2, .06, 18), PAL.gold, T(0, .3, 0));
    g.add(rb(.05, .3, .02, .01), '#fff1d6', T(.04, .38, .19, 0, 1, 1, 1, -.3, -.4));
    for (const s of [-1, 1]) { g.add(sp(.075, 8), color, T(s * .22, .38, 0, 0, .9, 1.5, .9, 0, s * .25)); g.add(sp(.055, 8), PAL.skin, T(s * .26, .26, .02)); }
  });
  const sitBody = mk(g => { g.add(sp(.3, 14), color, T(0, .14, 0, 0, 1, .5, 1)); g.add(P.lathe([[.0, .1], [.2, .1], [.17, .4], [.12, .5], [0, .52]], 16), color, T(0, 0, 0)); g.add(sp(.06, 8), PAL.skin, T(-.05, .36, .17)); g.add(sp(.06, 8), PAL.skin, T(.05, .36, .17)); });
  const head = mk(g => {
    g.add(sp(.27, 16), PAL.skin, T(0, 0, 0));
    if (hat === 'none' || hat === 'headphone') g.add(sp(.285, 14), PAL.hair, T(0, .05, -.05, 0, 1, .95, .98));
    if (hat === 'beanie') { g.add(sp(.275, 12), PAL.hair, T(0, -.02, -.07, 0, 1, .9, .9)); }
    for (const s of [-1, 1]) { g.add(sp(.038, 8), '#2a1a10', T(s * .09, -.01, .245, 0, 1, 1.25, .6)); g.add(sp(.012, 4), '#ffffff', T(s * .09 + .012, .015, .27)); g.add(sp(.045, 8), '#f29a8f', T(s * .16, -.07, .2, 0, 1, .6, .5)); g.add(sp(.06, 8), PAL.skin, T(s * .27, -.02, 0, 0, .5, 1, .8)); }
    g.add(rb(.06, .015, .02, .007), '#7a3a2a', T(0, -.1, .262));
    if (hat === 'non') { g.add(cy(0, .4, .3, 22), '#efd28c', T(0, .15, 0)); g.add(cy(.4, .4, .015, 22), '#d4b166', T(0, .15, 0)); g.add(sp(.24, 12), PAL.hair, T(0, .04, -.04)); }
    else if (hat === 'beanie') {
      g.add(P.lathe([[.302, .02], [.3, .1], [.27, .2], [.21, .28], [.12, .33], [0, .345]], 20), '#d9b45e', T(0, .09, -.01));
      g.add(P.lathe([[.31, -.03], [.318, .0], [.318, .07], [.31, .1], [.28, .1]], 22), '#b8913f', T(0, .09, -.01));
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(cy(.012, .012, .09, 4), '#a8823a', T(Math.cos(a) * .318, .095, -.01 + Math.sin(a) * .318)); }
      g.add(sp(.075, 10), '#f6ecd9', T(0, .47, -.01));
    }
    else if (hat === 'headphone') { for (let i = 0; i <= 10; i++) { const a = Math.PI * i / 10; g.add(sp(.035, 6), '#262626', T(Math.cos(a) * .31, Math.sin(a) * .31 + .02, 0)); } for (const s of [-1, 1]) { g.add(cy(.1, .1, .08, 14), '#e8b54a', T(s * .3, .0, 0, 0, 1, 1, 1, 0, s * 1.57)); } }
  });
  return (avCache[key] = { body, sitBody, head });
}

window.WORLD = { build, dynamicMeshes, avatarMeshes, plaqueCanvas, T, PAL };
})();
