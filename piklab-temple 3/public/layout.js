// Bố cục khuôn viên chùa — dùng chung cho cả server (Node) và client (trình duyệt)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LAYOUT = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const W = 2000, H = 2300;   // 0–1500: trong chùa · 1500–2300: chợ ngoài cổng chùa

  // Ô đất trồng rau (4 cột x 3 hàng)
  const plots = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      plots.push({ id: r * 4 + c, x: 200 + c * 110, y: 790 + r * 108 });
    }
  }

  const animals = [
    { id: 'cat', name: 'Mèo Mướp', x: 1470, y: 1010, range: 70 },
    { id: 'dog', name: 'Cún Vàng', x: 1730, y: 1030, range: 80 },
    { id: 'chicken', name: 'Gà Ri', x: 1590, y: 1140, range: 60 },
    { id: 'buffalo', name: 'Trâu Đất', x: 1790, y: 1170, range: 50 },
    { id: 'fish', name: 'Cá Chép Hồ Sen', x: 1620, y: 830, range: 0 }
  ];

  const trees = [
    [130, 180], [560, 150], [1440, 170], [1880, 160], [120, 520], [1880, 520],
    [640, 620], [1360, 620], [110, 1300], [300, 1350], [1560, 1400], [1890, 1395],
    [640, 1200], [1290, 1380], [120, 900],
    [1880, 1560], [120, 2200], [1880, 2200], [1880, 1880]
  ].map(([x, y], i) => ({ x, y, kind: i % 3 }));

  const lanterns = [];
  for (let y = 820; y <= 1320; y += 125) { lanterns.push({ x: 835, y }); lanterns.push({ x: 1165, y }); }
  for (const y of [1590, 1710, 2010, 2130]) { lanterns.push({ x: 875, y }); lanterns.push({ x: 1125, y }); }

  // ---- Khu chợ ngoài cổng chùa ----
  const market = {
    banyan: { x: 380, y: 1640 },                                       // cây đa đầu chợ – khu quét lá
    hat: { x: 560, y: 1790, name: 'Cô Tư bán nón' },                   // hàng rong ngồi quay mặt ra đường
    cloth: { x: 740, y: 1790, name: 'Cô Sáu bán áo' },
    food: { x: 1300, y: 1775, name: 'Quán Ăn Vỉa Hè' },
    barber: { x: 1500, y: 1790, name: 'Cắt Tóc Vỉa Hè' },
    fortune: { x: 1650, y: 1590, name: 'Am Gieo Quẻ' },
    tug: { x: 450, y: 2080, w: 520, h: 190 },                          // sân kéo co
    shout: { x: 1560, y: 2090, r: 210 }                                // bãi khẩu nghiệp
  };
  const leaves = [];                                                   // các ụ lá đa quanh gốc cây
  // vòng cung quanh gốc đa, chừa phía đông-nam (gần gánh hàng rong) để không bấm nhầm
  for (let i = 0; i < 12; i++) { const a = (100 + i * 25) * Math.PI / 180, r = 185 + (i % 3) * 38; leaves.push({ id: i, x: Math.round(380 + Math.cos(a) * r), y: Math.round(1640 + Math.sin(a) * r * .6) }); }

  // Vật cản (hình chữ nhật)
  const solids = [
    { x: 700, y: 110, w: 600, h: 140 },   // tường sau chánh điện
    { x: 700, y: 110, w: 26, h: 380 },    // vách trái
    { x: 1274, y: 110, w: 26, h: 380 },   // vách phải
    { x: 760, y: 250, w: 480, h: 66 },    // bàn thờ
    { x: 268, y: 300, w: 124, h: 64 },    // chân gác chuông
    { x: 1470, y: 770, w: 300, h: 110 },  // hồ sen
    { x: 970, y: 615, w: 60, h: 45 },     // lư hương lớn
    { x: 0, y: 0, w: W, h: 60 },          // tường bao
    { x: 0, y: H - 60, w: W, h: 60 },
    { x: 0, y: 1445, w: 925, h: 50 },     // tường ngăn chùa / chợ (chừa lối qua tam quan)
    { x: 1075, y: 1445, w: 925, h: 50 },
    { x: 345, y: 1622, w: 70, h: 40 },    // gốc đa
    { x: 520, y: 1765, w: 80, h: 36 },    // gánh nón
    { x: 700, y: 1765, w: 80, h: 36 },    // gánh áo
    { x: 1220, y: 1745, w: 160, h: 46 },  // bàn quán ăn
    { x: 1470, y: 1765, w: 64, h: 34 },   // ghế cắt tóc
    { x: 1600, y: 1555, w: 100, h: 66 },  // am gieo quẻ
    { x: 1550, y: 2080, w: 20, h: 14 },   // cột loa phường
    { x: 0, y: 0, w: 50, h: H },
    { x: W - 50, y: 0, w: 50, h: H }
  ];
  trees.forEach(t => solids.push({ x: t.x - 16, y: t.y - 6, w: 32, h: 20 }));

  return {
    W, H,
    spawn: { x: 1000, y: 2110 },
    hall: { x: 700, y: 110, w: 600, h: 380 },
    altar: { x: 1000, y: 365, radius: 120 },
    bowl: { x: 1000, y: 650, radius: 110 },
    bell: { x: 330, y: 330, radius: 120 },
    garden: { x: 140, y: 730, w: 450, h: 340 },
    pen: { x: 1400, y: 700, w: 520, h: 600 },
    pond: { x: 1620, y: 825, rx: 175, ry: 85 },
    gate: { x: 1000, y: 1440 },
    plots, animals, trees, lanterns, solids, market, leaves, leafRadius: 75,
    plotRadius: 70,
    animalRadius: 130,
    fishRadius: 230
  };
});
