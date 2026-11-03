// Bố cục khuôn viên chùa — dùng chung cho cả server (Node) và client (trình duyệt)
// Đơn vị: px (1 px = 0.01 đơn vị 3D). 0–2040: trong chùa · 2040–3280: chợ trước cổng chùa · 3280–3500: sông
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LAYOUT = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const W = 2800, H = 3500;
  const river = { y0: 3290, y1: 3480 };                 // dòng sông cuối đường
  const wharf = { x: 1400, y: 3330, w: 170, h: 200 };    // bến phóng sinh nhô ra sông (tâm)
  const release = { x: 1400, y: 3390, radius: 120 };     // mép bến: thả cá
  const GATE_Y = 2040;                                   // tường ngăn chùa / chợ

  // Chánh điện được dựng theo toạ độ gốc (tâm x=1000) rồi phóng to s lần và dời bằng (ox, oy)
  const HALL = { ox: -100, oy: -65, s: 1.5 };
  const hp = (x, y) => ({ x: HALL.ox + HALL.s * x, y: HALL.oy + HALL.s * y });
  const h0 = hp(700, 110);
  const hall = { x: h0.x, y: h0.y, w: 600 * HALL.s, h: 380 * HALL.s };          // 950,100 · 900×570
  const altar = Object.assign(hp(1000, 365), { radius: 210 });
  const cushions = [[790, 330], [860, 330], [1140, 330], [1210, 330], [790, 400], [860, 400], [1140, 400], [1210, 400]]
    .map(([x, y], i) => Object.assign({ id: i }, hp(x, y)));

  // Gác chuông, am xin quẻ: mỗi nơi có sân gạch riêng nối thẳng xuống sân lớn
  const bell = { x: 430, y: 560, radius: 175, s: 1.4 };
  const bellYard = [260, 410, 600, 790];
  const bowl = { x: 1400, y: 960, radius: 150, s: 1.4 };          // lư hương chung giữa sân
  const gate = { x: 1400, y: GATE_Y - 5 };
  const rockeries = [{ x: 1060, y: 1150 }, { x: 1740, y: 1150 }];   // bể non bộ
  const stupas = [{ x: 1110, y: 1780 }, { x: 1690, y: 1780 }];      // tháp đá

  // Vườn rau: 5 × 4 = 20 luống
  const garden = { x: 130, y: 1230, w: 700, h: 540 };
  const plots = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) plots.push({ id: r * 5 + c, x: garden.x + 95 + c * 115, y: garden.y + 90 + r * 115 });
  const well = { x: garden.x + garden.w - 55, y: garden.y + 85 };
  const scarecrow = { x: garden.x + garden.w - 55, y: garden.y + garden.h - 90 };
  const hut = { x: garden.x + 90, y: garden.y - 75 };

  // Nông trại + hồ sen
  const pen = { x: 1960, y: 1180, w: 740, h: 760 };
  const pond = { x: pen.x + 280, y: pen.y + 180, rx: 240, ry: 115 };
  const coop = { x: pen.x + 150, y: pen.y + 660 };          // chuồng gà
  const shed = { x: pen.x + 600, y: pen.y + 670 };          // chuồng trâu
  const kennel = { x: pen.x + 640, y: pen.y + 180 };        // chuồng chó
  const nest = { x: pen.x + 110, y: pen.y + 420 };          // ổ rơm của mèo
  const animals = [
    { id: 'cat', name: 'Mèo Mướp', x: nest.x + 40, y: nest.y + 20, range: 70 },
    { id: 'dog', name: 'Cún Vàng', x: kennel.x - 80, y: kennel.y + 200, range: 80 },
    { id: 'chicken', name: 'Gà Ri', x: coop.x + 130, y: coop.y - 60, range: 70 },
    { id: 'buffalo', name: 'Trâu Đất', x: shed.x - 150, y: shed.y - 90, range: 50 },
    { id: 'fish', name: 'Cá Chép Hồ Sen', x: pond.x, y: pond.y + 5, range: 0 }
  ];

  // ---- Khu chợ trước cổng chùa ----
  const market = {
    banyan: { x: 330, y: 2300, s: 1.5 },
    hat: { x: 760, y: 2390, w: 300, h: 200, name: 'Cô Tư bán nón' },
    cloth: { x: 1100, y: 2390, w: 300, h: 200, name: 'Cô Sáu bán áo' },
    food: { x: 2020, y: 2370, w: 470, h: 260, name: 'Quán Ăn Vỉa Hè' },
    barber: { x: 2420, y: 2400, w: 250, h: 180, name: 'Cắt Tóc Gốc Cây' },
    fortune: { x: 2370, y: 560, s: 1.5, name: 'Am Xin Quẻ' },          // trong khuôn viên chùa
    tug: { x: 640, y: 2860, w: 600, h: 220 },
    thayDo: { x: 1640, y: 2385, w: 300, h: 230, name: 'Thầy Đồ Bezier' },   // cạnh quán ăn; khoảng trống phía dưới để dành làm sân câu cá
    fishSeller: { x: 1640, y: 3190, name: 'Cô Ba bán cá' },
    cau: { x: 2150, y: 3262, name: 'Bãi Câu Brief' },                            // 5 ghế câu dọc bờ sông, câu thẳng xuống sông
    co: { x: 2080, y: 2930, w: 560, h: 270, name: 'Đình Cờ' }                   // sân đánh cờ: 4 bàn đá, mỗi bàn 2 ghế đối diện
  };
  const fortuneYard = [2170, 410, 2580, 790];
  const samhoi = { x: 1760, y: 870, w: 360, name: 'Bảng Sám Hối' };   // bảng gỗ ở sân lớn
  const cauSeats = [0, 1, 2, 3, 4].map(i => ({ id: i, x: market.cau.x - 250 + i * 125, y: market.cau.y }));
  // 4 bàn cờ: người đi trước ngồi phía tây (quay mặt sang đông), người đi sau ngồi phía đông
  const coTables = [0, 1, 2, 3].map(i => { const x = market.co.x - 195 + i * 130, y = market.co.y + 15; return { id: i, x, y, seats: [{ x: x - 52, y, yaw: Math.PI / 2 }, { x: x + 52, y, yaw: -Math.PI / 2 }] }; });
  // Đường đi tuần của Đường Tăng: các điểm nối nhau bằng đoạn thẳng không vướng vật cản (dọc lối lát gạch)
  const tangNodes = { A: [1400, 1900], K: [1400, 1490], B: [1400, 1300], C: [1250, 1200], D: [1150, 760], E: [700, 740], F: [430, 690], G: [1650, 760], H: [2085, 740], I: [2370, 690], L: [960, 1490], M: [1830, 1490],
    X1: [1400, 2110], X2: [1400, 2620], X3: [1830, 2620] };                    // X*: đường ra cổng xuống phố chợ tới Đình Cờ
  const tangEdges = [['A', 'K'], ['K', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'F'], ['D', 'G'], ['G', 'H'], ['H', 'I'], ['K', 'L'], ['K', 'M'], ['A', 'X1'], ['X1', 'X2'], ['X2', 'X3']];
  const tangStops = ['F', 'I', 'L', 'M', 'D', 'G', 'C'];                         // chỗ dừng chân chắp tay, ngó nghiêng tìm Ngộ Không
  const leaves = [];
  for (let i = 0; i < 12; i++) { const a = (70 + i * 24) * Math.PI / 180, r = 175 + (i % 3) * 35; leaves.push({ id: i, x: Math.round(market.banyan.x + Math.cos(a) * r), y: Math.round(market.banyan.y + Math.sin(a) * r * .62) }); }

  // Lối đi lát đá (hình chữ nhật px) – dùng cho cảnh 3D và bản đồ nhỏ
  const paths = [
    [1310, 690, 1490, 3240],              // trục chính từ thềm điện tới bến sông
    [260, 3150, 2560, 3240],              // đường ven sông
    [800, 690, 2000, 1250],               // sân lớn trước chánh điện
    bellYard, [600, 690, 800, 790],       // sân gác chuông + lối nối
    fortuneYard, [2000, 690, 2170, 790],  // sân am xin quẻ + lối nối
    [830, 1440, 1310, 1540],              // sang vườn rau
    [1490, 1440, 1960, 1540],             // sang nông trại
    [260, 2540, 2560, 2700],              // phố chợ
    [market.co.x - market.co.w / 2, market.co.y - market.co.h / 2, market.co.x + market.co.w / 2, market.co.y + market.co.h / 2]   // sân gạch Đình Cờ
  ];
  const box = (o, pad = 30) => [o.x - o.w / 2 - pad, o.y - o.h / 2 - pad, o.x + o.w / 2 + pad, o.y + o.h / 2 + pad];
  // Những vùng không mọc cỏ (ngoài lối đi)
  const noGrass = [
    [hall.x - 30, hall.y - 30, hall.x + hall.w + 30, hall.y + hall.h + 50],
    [garden.x - 20, garden.y - 20, garden.x + garden.w + 20, garden.y + garden.h + 20],
    box(market.tug, 20), [0, GATE_Y - 40, W, GATE_Y + 50],
    box(market.hat), box(market.cloth), box(market.food), box(market.barber), box(market.thayDo, 10),
    [0, river.y0 - 30, W, H], [market.fishSeller.x - 120, market.fishSeller.y - 80, market.fishSeller.x + 140, market.fishSeller.y + 60],
    [hut.x - 70, hut.y - 60, hut.x + 70, hut.y + 60],
    [coop.x - 110, coop.y - 80, coop.x + 110, coop.y + 80], [shed.x - 130, shed.y - 90, shed.x + 130, shed.y + 90]
  ];

  const trees = [
    [150, 180], [680, 250], [2100, 230], [2680, 200], [150, 950], [2680, 980], [620, 1060], [2160, 1060],
    [1225, 1330], [1575, 1330], [1225, 1660], [1575, 1660], [1225, 1930], [1575, 1930], [1000, 1995], [1800, 1995], [2660, 1990],
    [2520, 460],                                           // cây bồ đề cạnh am xin quẻ
    [150, 2650], [2680, 2300], [150, 3060], [2680, 3060], [1000, 3070], [2600, 3090], [2680, 2700]
  ].map(([x, y], i) => ({ x, y, kind: i === 17 ? 0 : i % 3 }));

  const hs = (x, y, w, h) => { const a = hp(x, y); return { x: a.x, y: a.y, w: w * HALL.s, h: h * HALL.s }; };
  const solids = [
    hs(700, 110, 600, 140),                                // tường sau chánh điện
    hs(700, 110, 26, 380), hs(1274, 110, 26, 380),
    hs(760, 250, 480, 70),                                 // bàn thờ
    { x: bell.x - 90, y: bell.y - 45, w: 180, h: 90 },
    { x: market.fortune.x - 75, y: market.fortune.y - 55, w: 150, h: 95 },
    { x: pond.x - 205, y: pond.y - 75, w: 410, h: 150 },
    { x: bowl.x - 45, y: bowl.y - 50, w: 90, h: 65 },
    ...rockeries.map(o => ({ x: o.x - 50, y: o.y - 35, w: 100, h: 60 })),
    ...stupas.map(o => ({ x: o.x - 32, y: o.y - 22, w: 64, h: 40 })),
    { x: well.x - 30, y: well.y - 25, w: 60, h: 45 },
    { x: hut.x - 55, y: hut.y - 40, w: 110, h: 70 },
    { x: coop.x - 80, y: coop.y - 50, w: 160, h: 80 }, { x: shed.x - 110, y: shed.y - 55, w: 220, h: 90 }, { x: kennel.x - 45, y: kennel.y - 35, w: 90, h: 60 },
    { x: 0, y: 0, w: W, h: 60 },
    { x: 0, y: river.y0, w: wharf.x - wharf.w / 2, h: H - river.y0 }, { x: wharf.x + wharf.w / 2, y: river.y0, w: W - wharf.x - wharf.w / 2, h: H - river.y0 },   // sông, chừa bến
    { x: wharf.x - wharf.w / 2, y: wharf.y + wharf.h / 2, w: wharf.w, h: H },
    { x: market.fishSeller.x - 70, y: market.fishSeller.y - 50, w: 170, h: 60 },
    { x: market.thayDo.x - 135, y: market.thayDo.y - 70, w: 270, h: 140 },
    { x: samhoi.x - samhoi.w / 2, y: samhoi.y - 20, w: samhoi.w, h: 34 },
    ...coTables.map(t => ({ x: t.x - 26, y: t.y - 20, w: 52, h: 40 })),   // bàn đá
    { x: 0, y: 0, w: 50, h: H }, { x: W - 50, y: 0, w: 50, h: H },
    { x: 0, y: GATE_Y, w: gate.x - 75, h: 50 }, { x: gate.x + 75, y: GATE_Y, w: W - gate.x - 75, h: 50 },
    { x: market.banyan.x - 55, y: market.banyan.y - 30, w: 110, h: 60 },
    { x: market.hat.x - 130, y: market.hat.y - 80, w: 260, h: 110 },
    { x: market.cloth.x - 130, y: market.cloth.y - 80, w: 260, h: 110 },
    { x: market.food.x - 210, y: market.food.y - 110, w: 220, h: 70 },
    { x: market.barber.x - 110, y: market.barber.y - 60, w: 60, h: 50 },
  ];
  trees.forEach(t => solids.push({ x: t.x - 16, y: t.y - 6, w: 32, h: 20 }));

  return {
    W, H, GATE_Y, HALL, hp,
    spawn: { x: 1400, y: 3010 }, river, wharf, release, samhoi, cauSeats, coTables, tangNodes, tangEdges, tangStops,
    hall, altar, bowl, bell, bellYard, garden, pen, pond, gate, cushions, rockeries, stupas, well, scarecrow, hut, coop, shed, kennel, nest, fortuneYard,
    plots, animals, trees, lanterns: [], solids, market, leaves, paths, noGrass,
    leafRadius: 75, plotRadius: 70, animalRadius: 130, fishRadius: 270, cushionRadius: 60
  };
});
