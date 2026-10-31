// Bố cục khuôn viên chùa — dùng chung cho cả server (Node) và client (trình duyệt)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LAYOUT = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const W = 2000, H = 1500;

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
    { id: 'buffalo', name: 'Trâu Đất', x: 1800, y: 1240, range: 50 },
    { id: 'fish', name: 'Cá Chép Hồ Sen', x: 1620, y: 830, range: 0 }
  ];

  const trees = [
    [130, 180], [560, 150], [1440, 170], [1880, 160], [120, 520], [1880, 520],
    [640, 620], [1360, 620], [110, 1300], [300, 1350], [1700, 1360], [1890, 1300],
    [640, 1200], [1360, 1250], [120, 900]
  ].map(([x, y], i) => ({ x, y, kind: i % 3 }));

  const lanterns = [];
  for (let y = 760; y <= 1260; y += 125) { lanterns.push({ x: 905, y }); lanterns.push({ x: 1095, y }); }

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
    { x: 0, y: 0, w: 50, h: H },
    { x: W - 50, y: 0, w: 50, h: H }
  ];
  trees.forEach(t => solids.push({ x: t.x - 16, y: t.y - 6, w: 32, h: 20 }));

  return {
    W, H,
    spawn: { x: 1000, y: 1230 },
    hall: { x: 700, y: 110, w: 600, h: 380 },
    altar: { x: 1000, y: 365, radius: 120 },
    bowl: { x: 1000, y: 650, radius: 110 },
    bell: { x: 330, y: 330, radius: 120 },
    garden: { x: 140, y: 730, w: 450, h: 340 },
    pen: { x: 1400, y: 700, w: 520, h: 600 },
    pond: { x: 1620, y: 825, rx: 175, ry: 85 },
    gate: { x: 1000, y: 1440 },
    plots, animals, trees, lanterns, solids,
    plotRadius: 70,
    animalRadius: 130,
    fishRadius: 230
  };
});
