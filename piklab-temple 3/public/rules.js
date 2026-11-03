// Luật chơi & danh mục vật phẩm — dùng chung cho server (Node) và trình duyệt (bản demo, giao diện)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RULES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const VERSION = '2.4.1';   // tăng mỗi đợt: server & trang game phải cùng phiên bản
  const STAMINA_MAX = 100;
  const REGEN_MS = 90e3;                 // tự hồi 1 sinh lực mỗi 90 giây (để không bao giờ bị kẹt)

  // Sinh lực tiêu hao cho mỗi hoạt động
  const COST = { incense: 2, dig: 6, feed: 2, bell: 1, sweep: 4, fortune: 3, shout: 2, tug: 8, chant: 1 };

  // Màu áo: 4 màu cơ bản khi tạo nhân vật, còn lại mua ở hàng Cô Sáu
  const COLORS = [
    { id: '#7a5a43', name: 'Nâu sồng', price: 0 },
    { id: '#6f7d8c', name: 'Lam xám', price: 0 },
    { id: '#efe7d6', name: 'Trắng ngà', price: 0 },
    { id: '#c9902e', name: 'Vàng nghệ', price: 0 },
    { id: '#a8382c', name: 'Đỏ son', price: 12 },
    { id: '#4f7a5a', name: 'Xanh lục', price: 12 },
    { id: '#3b4f7a', name: 'Xanh chàm', price: 12 },
    { id: '#5b4566', name: 'Tím than', price: 12 },
    { id: '#c47f86', name: 'Hồng đào', price: 15 },
    { id: '#3f8f8a', name: 'Xanh ngọc', price: 15 },
    { id: '#2b2b30', name: 'Đen tuyền', price: 18 },
    { id: '#b8862f', name: 'Gấm hoàng', price: 30 }
  ];
  // Đồ đội đầu: "Không" và nón lá có sẵn, còn lại mua ở gánh Cô Tư
  const HATS = [
    { id: 'none', name: 'Không đội', price: 0 },
    { id: 'non', name: 'Nón lá', price: 0 },
    { id: 'quaithao', name: 'Nón quai thao', price: 25 },
    { id: 'khan', name: 'Khăn xếp', price: 20 },
    { id: 'khanvan', name: 'Khăn vấn', price: 20 },
    { id: 'beanie', name: 'Mũ len', price: 12 },
    { id: 'headphone', name: 'Tai nghe', price: 15 }
  ];
  // Kiểu tóc ở quầy cắt tóc vỉa hè (trả tiền mỗi lần cắt, không cần sở hữu)
  const HAIRS = [
    { id: 'bun', name: 'Búi tó', price: 4, note: 'Để tóc dài búi gọn' },
    { id: 'short', name: 'Tóc ngắn', price: 3, note: 'Gọn gàng, mát mẻ' },
    { id: 'bald', name: 'Cạo trọc', price: 2, note: 'Cạo sạch, bỏ luôn mũ nón' },
    { id: 'long', name: 'Tóc dài xoã', price: 6, note: 'Thả dài ngang lưng, thướt tha' },
    { id: 'braid', name: 'Tết đuôi sam', price: 6, note: 'Bím tóc dài sau lưng' },
    { id: 'ponytail', name: 'Buộc đuôi ngựa', price: 5, note: 'Gọn gàng, năng động' },
    { id: 'bob', name: 'Tóc ngố mái bằng', price: 5, note: 'Mái bằng, ôm cằm' },
    { id: 'curly', name: 'Tóc xoăn mì tôm', price: 6, note: 'Xoăn tít, bồng bềnh' },
    { id: 'mohawk', name: 'Đầu đinh mào gà', price: 7, note: 'Hai bên cạo sát, chỏm dựng giữa đầu' }
  ];
  // Kiểu trang phục truyền thống: mặc với màu áo đang chọn (màu mua ở hàng Cô Sáu)
  const OUTFITS = [
    { id: 'trang', name: 'Áo tràng', price: 0, note: 'Áo giao lĩnh dài, thắt đai' },
    { id: 'baba', name: 'Áo bà ba', price: 14, note: 'Áo ngắn xẻ tà, quần đen ống rộng' },
    { id: 'aodai', name: 'Áo dài', price: 22, note: 'Cổ đứng, hai tà dài, quần trắng' },
    { id: 'nguthan', name: 'Áo ngũ thân', price: 20, note: 'Cổ đứng, cài khuy chéo vai phải' },
    { id: 'tuthan', name: 'Áo tứ thân', price: 24, note: 'Yếm đỏ, thắt lưng bao, váy đen' },
    { id: 'nhatbinh', name: 'Áo nhật bình', price: 35, note: 'Cổ vuông lớn viền thêu kim tuyến' }
  ];
  // Lời rao của Cô Ba bán cá (hiện thành bong bóng khi có người đi ngang sạp)
  const COBA_SAYS = [
    'Cá tươi đây! Thả một con, phước theo cả tuần nè!',
    'Cá rô đồng, cá chép đỏ, cá vàng… mua đi cưng, cô bớt cho!',
    'Mua cá bằng sức thôi, không lấy tiền đâu, ra bến thả là có phước!',
    'Cá chép đỏ thả xong khách duyệt bản đầu đó, cô thề!',
    'Thả cá vàng là render không crash, linh lắm nghen!',
    'Ủa con, deadline dí hả? Thả con cá cho nhẹ lòng đi.',
    'Giỏ đựng được năm con thôi nha, tham quá cá ngộp đó!',
    'Hồi nãy có đứa thả xong cô vớt lại… ờ mà phước nó vẫn đủ nha 🤭',
    'Cá rô rẻ nè, hợp túi sinh lực của dân thiết kế!',
    'Thả cá nhớ cầu nguyện nha, đừng cầu “logo to hơn” là được.',
    'Cô bán cá ở đây từ hồi Photoshop còn bản 7 lận đó!',
    'Câu brief bên kia hả? Câu xong ghé cô mua cá thả lấy hên nè.'
  ];
  // Quán ăn vỉa hè: trả phước để hồi sinh lực
  const FOODS = [
    { id: 'trada', name: 'Trà đá', icon: '🧊', price: 1, st: 6 },
    { id: 'che', name: 'Chè ba màu', icon: '🍧', price: 3, st: 15 },
    { id: 'banhmi', name: 'Bánh mì', icon: '🥖', price: 4, st: 22 },
    { id: 'banhgio', name: 'Bánh giò', icon: '🍙', price: 4, st: 22 },
    { id: 'banhbeo', name: 'Bánh bèo', icon: '🥟', price: 5, st: 26 },
    { id: 'pho', name: 'Phở bò', icon: '🍜', price: 8, st: 45 },
    { id: 'bunbo', name: 'Bún bò Huế', icon: '🌶️', price: 8, st: 45 },
    { id: 'comtam', name: 'Cơm tấm', icon: '🍚', price: 9, st: 50 },
    { id: 'bundau', name: 'Bún đậu mắm tôm', icon: '🍤', price: 10, st: 60 }
  ];
  const TUG_BETS = [5, 10, 20, 50];
  // Thỉnh chuông: kim chạy tam giác 0→1→0 trong 1 chu kỳ; vùng chuẩn quanh 0.5
  const BELL = { zone: .14, countdown: 700, maxMs: 20000, period: streak => Math.max(900, 1700 - streak * 160) };
  const bellPos = (ms, period) => { const f = ((ms % period) + period) % period / period; return f < .5 ? f * 2 : 2 - f * 2; };
  // Đệm ngồi: gõ mõ / lần tràng hạt
  const CHANT = { mo: { every: 6, minMs: 8000, perDay: 15 }, beads: { every: 27, minMs: 10000, perDay: 8 } };
  // Thời tiết: thành phố có thể chọn (Open-Meteo, miễn phí, không cần khoá)
  const CITIES = [
    { id: 'hanoi', name: 'Hà Nội', lat: 21.03, lon: 105.85 }, { id: 'hcm', name: 'TP.HCM', lat: 10.82, lon: 106.63 },
    { id: 'danang', name: 'Đà Nẵng', lat: 16.05, lon: 108.2 }, { id: 'hue', name: 'Huế', lat: 16.46, lon: 107.59 },
    { id: 'haiphong', name: 'Hải Phòng', lat: 20.86, lon: 106.68 }, { id: 'cantho', name: 'Cần Thơ', lat: 10.04, lon: 105.79 },
    { id: 'dalat', name: 'Đà Lạt', lat: 11.94, lon: 108.44 }, { id: 'sapa', name: 'Sa Pa', lat: 22.34, lon: 103.84 }
  ];
  const WEATHER = { clear: ['☀️', 'Trời quang'], cloudy: ['⛅', 'Nhiều mây'], rain: ['🌧️', 'Mưa'], storm: ['⛈️', 'Giông'], fog: ['🌫️', 'Sương mù'], snow: ['❄️', 'Tuyết rơi'] };
  // ---- Phóng sinh: mua cá của Cô Ba bằng sinh lực (cá vào giỏ), ra mép bến thả mới được cộng phước ----
  const FISH = [
    { id: 'ro', name: 'Cá rô', icon: '🐟', st: 4, reward: 3 },        // st = sinh lực để mua · reward = phước khi thả
    { id: 'chep', name: 'Cá chép đỏ', icon: '🎏', st: 8, reward: 6 },
    { id: 'vang', name: 'Cá vàng', icon: '🐠', st: 14, reward: 10 }
  ];
  const FISH_RULES = { perDay: 5, scoopRate: .1, bagMax: 5 };          // bagMax: giỏ chứa tối đa 5 con
  // ---- Bảng sám hối ----
  const SAMHOI = { ttl: 48 * 3600e3, max: 140, price: 2, perDay: 3, gapMs: 5 * 60e3, keep: 300, prayReward: 1, prayRewardPerDay: 5 };
  // ---- Lớp Thầy Đồ Bezier: bài tập Pen Tool (toạ độ khung 900 × 520) ----
  const Q = .5523;
  const arc = (cx, cy, r, a0, a1) => {   // cung tròn ≤ 90° thành 1 đường cong bậc 3
    const k = 4 / 3 * Math.tan((a1 - a0) / 4), p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)], d = a => [-Math.sin(a), Math.cos(a)];
    const P0 = p(a0), P3 = p(a1), D0 = d(a0), D1 = d(a1);
    return [P0, [P0[0] + D0[0] * r * k, P0[1] + D0[1] * r * k], [P3[0] - D1[0] * r * k, P3[1] - D1[1] * r * k], P3];
  };
  const ln = (a, b) => [a, [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3], [a[0] + (b[0] - a[0]) * 2 / 3, a[1] + (b[1] - a[1]) * 2 / 3], b];
  const PI = Math.PI;
  // Bài tập cho designer chuyên nghiệp: đường mẫu là đường cong toán học, sai lệch cho phép chỉ 12px
  const TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
  const PEN_LESSONS = [
    { name: 'Chữ S chuẩn nét', tip: 'Điểm neo giữa đặt đúng chỗ uốn, tay nắm dọc và cân.', anchors: 3, segs: [[[160, 440], [170, 260], [440, 380], [450, 260]], [[450, 260], [460, 140], [720, 260], [740, 110]]] },
    { name: 'Vòng tròn hoàn hảo', tip: 'Đúng 4 điểm neo ở 4 phương, tay nắm vuông góc bán kính. Click lại điểm đầu để khép.', anchors: 4, closed: true, f: t => [450 + 200 * cos(TAU * t), 260 + 200 * sin(TAU * t)] },
    { name: 'Giọt nước', tip: 'Đỉnh nhọn phải bẻ góc (giữ Alt). Đáy tròn đều.', anchors: 4, closed: true, f: t => { const T = TAU * t; return [450 + 190 * sin(T) * Math.pow(Math.abs(sin(T / 2)), 1.3), 260 - 215 * cos(T)]; } },
    { name: 'Sóng sin 3 chu kỳ', tip: 'Mỗi đỉnh và đáy sóng một điểm neo, biên độ đều nhau.', anchors: 8, f: t => [90 + 720 * t, 260 - 140 * sin(6 * Math.PI * t)] },
    { name: 'Trái tim cân đối', tip: 'Hai góc nhọn (đỉnh giữa và mũi dưới) phải giữ Alt khi kéo.', anchors: 6, closed: true, f: t => { const T = TAU * t, X = 16 * Math.pow(sin(T), 3), Y = 13 * cos(T) - 5 * cos(2 * T) - 2 * cos(3 * T) - cos(4 * T); return [450 + 13 * X, 232 - 13 * Y]; } },
    { name: 'Số 8 liền nét', tip: 'Một nét khép kín, đi qua tâm hai lần.', anchors: 6, closed: true, f: t => { const T = TAU * t; return [450 + 150 * sin(2 * T), 260 - 215 * sin(T)]; } },
    { name: 'Xoắn ốc hai vòng', tip: 'Bán kính nhỏ dần đều — mỗi phần tư vòng một điểm neo.', anchors: 9, f: t => { const th = 4 * Math.PI * t - Math.PI / 2, r = 220 - 185 * t; return [450 + r * cos(th), 262 + r * sin(th)]; } },
    { name: 'Đám mây 8 múi', tip: '8 khe lõm là góc nhọn, 8 múi tròn căng đều.', anchors: 16, closed: true, f: t => { const th = TAU * t, r = 165 + 45 * Math.abs(sin(4 * th)); return [450 + 1.3 * r * cos(th), 260 + .95 * r * sin(th)]; } },
    { name: 'Sao cong 5 cánh', tip: '5 mũi nhọn sắc (bẻ góc), cạnh lõm cong đều.', anchors: 10, closed: true, f: t => { const T = TAU * t, X = 184 * cos(T) + 46 * cos(4 * T), Y = 184 * sin(T) - 46 * sin(4 * T); return [450 + Y, 262 - X]; } },
    { name: 'Chữ ký Lissajous 3:2', tip: 'Bài tốt nghiệp: một nét khép kín, cắt nhau nhiều lần.', anchors: 12, closed: true, f: t => { const T = TAU * t; return [450 + 300 * sin(3 * T + Math.PI / 2), 260 + 200 * sin(2 * T)]; } }
  ];
  const bez = (s, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * s[0][i] + 3 * u * u * t * s[1][i] + 3 * u * t * t * s[2][i] + t * t * t * s[3][i]); };
  const sampleSegs = (segs, n = 40) => { const out = []; segs.forEach(sg => { for (let i = 0; i <= n; i++) out.push(bez(sg, i / n)); }); return out; };
  PEN_LESSONS.forEach(L => { L.pts = L.f ? Array.from({ length: 361 }, (_, i) => L.f(i / 360)) : sampleSegs(L.segs, 90); });   // đường mẫu dạng điểm dày
  // điểm neo người chơi: [x, y, ox, oy] (tay nắm ra; tay nắm vào đối xứng) hoặc [x, y, ox, oy, ix, iy] khi bẻ góc (Alt / chế độ góc nhọn)
  function penSegs(anchors, closed) {
    const segs = [], A = anchors, n = A.length;
    const inH = b => b.length >= 6 ? [b[4], b[5]] : [-b[2], -b[3]];
    const seg = (a, b) => { const h = inH(b); return [[a[0], a[1]], [a[0] + a[2], a[1] + a[3]], [b[0] + h[0], b[1] + h[1]], [b[0], b[1]]]; };
    for (let i = 0; i < n - 1; i++) segs.push(seg(A[i], A[i + 1]));
    if (closed && n >= 2) segs.push(seg(A[n - 1], A[0]));
    return segs;
  }
  function distPS(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy; let t = L2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
  function nearFrac(pts, line, tol) { let ok = 0; for (const p of pts) { let m = 1e9; for (let i = 0; i < line.length - 1 && m > tol; i++) m = Math.min(m, distPS(p, line[i], line[i + 1])); if (m <= tol) ok++; } return pts.length ? ok / pts.length : 0; }
  // Độ khớp 0–100: vừa phủ hết đường mẫu, vừa không vẽ lan ra ngoài; dùng quá nhiều điểm neo bị trừ điểm
  function penScore(lessonIdx, anchors, closed) {
    const L = PEN_LESSONS[lessonIdx]; if (!L || !Array.isArray(anchors) || anchors.length < 2 || anchors.length > 40) return 0;
    if (!anchors.every(a => Array.isArray(a) && (a.length === 4 || a.length === 6) && a.every(v => typeof v === 'number' && isFinite(v) && Math.abs(v) < 2000))) return 0;
    const tgt = L.pts.filter((p, i) => i % 3 === 0), mine = sampleSegs(penSegs(anchors, closed), 24);
    const cov = nearFrac(tgt, mine, PEN.tol), prec = nearFrac(mine, L.pts, PEN.tol);
    let sc = 100 * Math.sqrt(cov * prec);
    const extra = Math.max(0, anchors.length - Math.ceil(L.anchors * 1.5)); sc -= extra * 4;   // thừa điểm neo bị trừ nặng
    if (L.closed && !closed) sc = Math.min(sc, 60);                                                  // hình kín mà chưa khép → chưa đạt
    return Math.max(0, Math.min(100, Math.round(sc)));
  }
  const PEN = { pass: 90, perDay: 3, reward: 6, tol: 12 };
  // ---- Đào rau: đôi khi đào trúng… cức 💩 (ruồi bay quanh đầu tới khi rửa tay ở giếng) ----
  const POOP = { rate: 10, stinkMs: 3 * 60e3 };
  // ---- Bãi câu brief: brief khách hàng như cá, có độ hiếm; người chơi sưu tầm ----
  const RARITY = [
    { id: 'thuong', name: 'Phổ thông', color: '#8a8f98', weight: 60, reward: 1, hold: 1.0 },
    { id: 'kha', name: 'Trung bình', color: '#2f7d4a', weight: 28, reward: 3, hold: 1.6 },
    { id: 'hiem', name: 'Hiếm', color: '#2f6fb3', weight: 10, reward: 8, hold: 2.4 },
    { id: 'sieu', name: 'Cực hiếm', color: '#b8860b', weight: 2, reward: 25, hold: 3.4 }
  ];
  const CAU = { seats: 5, perDay: 12, cost: 2, biteMin: 2500, biteMax: 7000, hookMs: 1300 };
  const DEFAULT_BRIEFS = [
    ['logo-to', 'thuong', '🔍', 'Logo to hơn nữa em', 'Nhưng vẫn phải tinh tế, nhỏ nhắn nha.'],
    ['xanh-do', 'thuong', '🎨', 'Màu xanh nhưng hơi đỏ', 'Kiểu xanh mà nhìn vào thấy ấm áp ấy em.'],
    ['sang-re', 'thuong', '💸', 'Làm sang nhưng rẻ', 'Ngân sách ít thôi mà nhìn phải như hàng hiệu.'],
    ['gap', 'thuong', '⏰', 'Cần gấp chiều nay', 'Gửi lúc 5 giờ chiều, cần lúc 5 giờ 30.'],
    ['nhu-mau', 'thuong', '📎', 'Làm giống mẫu này nhưng khác', 'Đừng giống quá mà cũng đừng khác quá.'],
    ['wow', 'kha', '✨', 'Làm sao cho nó wow', 'Không biết wow là gì nhưng nhìn là biết.'],
    ['font-dep', 'kha', '🔤', 'Đổi font nào đẹp đẹp', 'Đẹp kiểu Comic Sans mà sang hơn.'],
    ['ban-dau', 'kha', '↩️', 'Quay lại bản đầu tiên', 'Sau 27 lần sửa, bản đầu là đẹp nhất.'],
    ['sep-duyet', 'kha', '👔', 'Để anh hỏi lại sếp', 'Sếp đi công tác, 2 tuần nữa về.'],
    ['ai-lam', 'hiem', '🤖', 'Sao AI làm 5 giây', 'Em làm 3 ngày thì báo giá rẻ lại đi.'],
    ['full-quyen', 'hiem', '🕊️', 'Em cứ sáng tạo tự do', 'Phiên bản hiếm: lần này là thật lòng.'],
    ['duyet-1', 'hiem', '✅', 'Duyệt ngay bản đầu', 'Không sửa chữ nào. Chuyển khoản luôn.'],
    ['tra-truoc', 'sieu', '💰', 'Thanh toán trước 100%', 'Truyền thuyết nói khách này có thật.'],
    ['brief-ro', 'sieu', '📜', 'Brief rõ ràng đầy đủ', 'Có moodboard, deadline hợp lý, file gốc đầy đủ.'],
    ['tip', 'sieu', '🎁', 'Tặng thêm tiền tip', 'Khách cảm ơn và còn giới thiệu thêm bạn bè.']
  ].map(([id, rarity, icon, name, desc]) => ({ id, rarity, icon, name, desc, active: true }));
  function rollBrief(briefs) {   // chọn độ hiếm theo trọng số, rồi chọn ngẫu nhiên một brief thuộc độ hiếm đó
    const live = (briefs || []).filter(b => b.active !== false); if (!live.length) return null;
    const avail = RARITY.filter(r => live.some(b => b.rarity === r.id)), tot = avail.reduce((a, r) => a + r.weight, 0);
    let x = Math.random() * tot, rr = avail[0]; for (const r of avail) { if ((x -= r.weight) < 0) { rr = r; break; } }
    const pool = live.filter(b => b.rarity === rr.id); return pool[Math.random() * pool.length | 0];
  }
  function weatherKind(code, temp) {             // mã thời tiết WMO → loại hiển thị
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ([95, 96, 99].includes(code)) return 'storm';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return temp !== undefined && temp < 1.5 ? 'snow' : 'rain';
    if (code === 45 || code === 48) return 'fog';
    if (code === 2 || code === 3) return 'cloudy';
    return 'clear';
  }
  // ---- Đình Cờ: cờ vua & cờ caro cược phước (luật dùng chung cho server, bản demo và giao diện) ----
  const CO = { bets: [5, 10, 20, 50], cost: 3, clock: { chess: 600e3, caro: 300e3 }, tables: 4, names: { chess: 'Cờ vua', caro: 'Cờ caro' } };
  // Cờ vua: ô = hàng * 8 + cột, hàng 0 là hàng 8 (phía Đen), hàng 7 là hàng 1 (phía Trắng). Quân: 'wK', 'bP'…
  const CHESS = (() => {
    const N = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]], K8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
    function init() {
      const b = [];
      for (const ch of 'rnbqkbnrpppppppp' + '-'.repeat(32) + 'PPPPPPPPRNBQKBNR') b.push(ch === '-' ? '' : (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase());
      return { b, turn: 'w', castle: 'KQkq', ep: -1, half: 0, moves: 0, last: null };
    }
    function attacked(b, sq, by) {                     // ô sq có bị phe `by` khống chế không
      const r = sq >> 3, c = sq & 7, pr = by === 'w' ? r + 1 : r - 1;
      for (const dc of [-1, 1]) if (on(pr, c + dc) && b[pr * 8 + c + dc] === by + 'P') return true;
      for (const [dr, dc] of N) if (on(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === by + 'N') return true;
      for (const [dr, dc] of K8) if (on(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === by + 'K') return true;
      for (const [dirs, pcs] of [[DIAG, 'BQ'], [ORTH, 'RQ']]) for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (on(rr, cc)) { const p = b[rr * 8 + cc]; if (p) { if (p[0] === by && pcs.includes(p[1])) return true; break; } rr += dr; cc += dc; }
      }
      return false;
    }
    function pseudo(s) {
      const { b, turn } = s, opp = turn === 'w' ? 'b' : 'w', out = [];
      for (let sq = 0; sq < 64; sq++) {
        const p = b[sq]; if (!p || p[0] !== turn) continue;
        const r = sq >> 3, c = sq & 7, t = p[1], add = (to, x) => out.push(Object.assign({ from: sq, to }, x));
        if (t === 'P') {
          const dir = turn === 'w' ? -1 : 1, start = turn === 'w' ? 6 : 1, last = turn === 'w' ? 0 : 7;
          const push = (to, x) => { if ((to >> 3) === last) for (const pr of 'QRBN') add(to, Object.assign({ promo: pr }, x)); else add(to, x); };
          const f = (r + dir) * 8 + c;
          if (on(r + dir, c) && !b[f]) { push(f); const f2 = (r + 2 * dir) * 8 + c; if (r === start && !b[f2]) add(f2, { dbl: 1 }); }
          for (const dc of [-1, 1]) { if (!on(r + dir, c + dc)) continue; const to = (r + dir) * 8 + c + dc; if (b[to] && b[to][0] === opp) push(to); else if (to === s.ep) add(to, { ep: 1 }); }
        } else if (t === 'N' || t === 'K') {
          for (const [dr, dc] of t === 'N' ? N : K8) { if (!on(r + dr, c + dc)) continue; const to = (r + dr) * 8 + c + dc; if (!b[to] || b[to][0] === opp) add(to); }
          const rank = turn === 'w' ? 7 : 0, cr = turn === 'w' ? 'KQ' : 'kq', k = rank * 8;
          if (t === 'K' && sq === k + 4 && !attacked(b, sq, opp)) {         // nhập thành: vua chưa đi, không bị chiếu, không đi qua ô bị khống chế
            if (s.castle.includes(cr[0]) && !b[k + 5] && !b[k + 6] && b[k + 7] === turn + 'R' && !attacked(b, k + 5, opp) && !attacked(b, k + 6, opp)) add(k + 6, { castle: 'K' });
            if (s.castle.includes(cr[1]) && !b[k + 3] && !b[k + 2] && !b[k + 1] && b[k] === turn + 'R' && !attacked(b, k + 3, opp) && !attacked(b, k + 2, opp)) add(k + 2, { castle: 'Q' });
          }
        } else {
          for (const [dr, dc] of t === 'B' ? DIAG : t === 'R' ? ORTH : DIAG.concat(ORTH)) {
            let rr = r + dr, cc = c + dc;
            while (on(rr, cc)) { const to = rr * 8 + cc; if (b[to]) { if (b[to][0] === opp) add(to); break; } add(to); rr += dr; cc += dc; }
          }
        }
      }
      return out;
    }
    function apply(s, m) {
      const b = s.b.slice(), p = b[m.from], turn = s.turn, opp = turn === 'w' ? 'b' : 'w', cap = b[m.to] || (m.ep ? opp + 'P' : '');
      let castle = s.castle;
      b[m.to] = m.promo ? turn + m.promo : p; b[m.from] = '';
      if (m.ep) b[m.to + (turn === 'w' ? 8 : -8)] = '';
      if (m.castle) { const k = (turn === 'w' ? 7 : 0) * 8; if (m.castle === 'K') { b[k + 5] = b[k + 7]; b[k + 7] = ''; } else { b[k + 3] = b[k]; b[k] = ''; } }
      if (p[1] === 'K') castle = castle.replace(turn === 'w' ? /[KQ]/g : /[kq]/g, '');
      const rookSq = { 56: 'Q', 63: 'K', 0: 'q', 7: 'k' };
      for (const sq of [m.from, m.to]) if (rookSq[sq]) castle = castle.replace(rookSq[sq], '');
      return { b, turn: opp, castle, ep: m.dbl ? (m.from + m.to) / 2 : -1, half: p[1] === 'P' || cap ? 0 : s.half + 1, moves: s.moves + 1, last: { from: m.from, to: m.to }, cap };
    }
    const kingSq = (b, color) => b.indexOf(color + 'K');
    const legal = s => pseudo(s).filter(m => { const n = apply(s, m); return !attacked(n.b, kingSq(n.b, s.turn), n.turn); });
    const inCheck = s => attacked(s.b, kingSq(s.b, s.turn), s.turn === 'w' ? 'b' : 'w');
    function status(s) {                                // 'mate' | 'stalemate' | 'material' | 'fifty' | 'check' | ''
      const chk = inCheck(s);
      if (!legal(s).length) return chk ? 'mate' : 'stalemate';
      const pcs = s.b.filter(Boolean).map(p => p[1]).sort().join('');
      if (pcs === 'KK' || pcs === 'BKK' || pcs === 'KKN') return 'material';
      if (s.half >= 100) return 'fifty';
      return chk ? 'check' : '';
    }
    const find = (s, from, to, promo) => legal(s).find(m => m.from === from && m.to === to && (!m.promo || m.promo === (promo || 'Q')));
    return { init, legal, apply, status, find, inCheck, attacked };
  })();
  // Cờ caro kiểu Việt Nam: bàn 20×20, X đi trước, 5 quân liền trở lên thắng — nhưng bị chặn cả hai đầu thì không tính
  const CARO = {
    size: 20,
    init: () => ({ b: Array(400).fill(0), turn: 1, moves: 0, last: -1, line: null }),
    win(b, idx, p, size = 20) {
      const x = idx % size, y = (idx / size) | 0;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const line = [idx]; let blocked = 0;
        for (const sg of [1, -1]) for (let k = 1; ; k++) {
          const xx = x + dx * k * sg, yy = y + dy * k * sg;
          if (xx < 0 || yy < 0 || xx >= size || yy >= size) break;     // mép bàn không tính là bị chặn
          const v = b[yy * size + xx];
          if (v === p) { line.push(yy * size + xx); continue; }
          if (v) blocked++;
          break;
        }
        if (line.length >= 5 && blocked < 2) return line;
      }
      return null;
    }
  };
  // Một ván: x = người đi trước (Trắng / X), o = người đi sau. Đồng hồ tính bằng ms còn lại tại lúc bắt đầu lượt hiện tại.
  function coNew(game, xId, oId, now) {
    return { game, x: xId, o: oId, s: game === 'chess' ? CHESS.init() : CARO.init(), clock: { [xId]: CO.clock[game], [oId]: CO.clock[game] }, turnStart: now, drawBy: null, over: false };
  }
  const coTurnId = g => g.game === 'chess' ? (g.s.turn === 'w' ? g.x : g.o) : (g.s.turn === 1 ? g.x : g.o);
  const coOther = (g, id) => id === g.x ? g.o : g.x;
  function coPlay(g, by, mv, now) {                    // → { err } | { ok, end?: { winner, reason } }
    if (g.over) return { err: 'over' };
    if (coTurnId(g) !== by) return { err: 'turn' };
    if (!mv || typeof mv !== 'object') return { err: 'bad' };
    const left = g.clock[by] - (now - g.turnStart);
    if (left <= 0) { g.clock[by] = 0; return { ok: true, end: { winner: coOther(g, by), reason: 'time' } }; }
    let end = null;
    if (g.game === 'chess') {
      const m = CHESS.find(g.s, mv.from | 0, mv.to | 0, 'QRBN'.includes(mv.promo) ? mv.promo : 'Q'); if (!m) return { err: 'illegal' };
      g.s = CHESS.apply(g.s, m);
      const st = CHESS.status(g.s);
      if (st === 'mate') end = { winner: by, reason: 'mate' };
      else if (st === 'stalemate' || st === 'material' || st === 'fifty') end = { winner: null, reason: st };
    } else {
      const i = mv.i | 0, n = CARO.size * CARO.size;
      if (i < 0 || i >= n || g.s.b[i]) return { err: 'illegal' };
      const p = g.s.turn, b = g.s.b.slice(); b[i] = p;
      const line = CARO.win(b, i, p);
      g.s = { b, turn: 3 - p, moves: g.s.moves + 1, last: i, line };
      if (line) end = { winner: by, reason: 'five' }; else if (g.s.moves >= n) end = { winner: null, reason: 'full' };
    }
    g.clock[by] = left; g.turnStart = now; g.drawBy = null;
    return { ok: true, end };
  }
  const coTimeout = (g, now) => { const id = coTurnId(g); return g.clock[id] - (now - g.turnStart) <= 0 ? id : null; };
  // Kèo thách đấu (kéo co, đánh cờ) tự huỷ nếu không ai nhận — phước chỉ bị trừ khi trận thật sự bắt đầu
  const OFFER_TTL = 90e3;
  // Bot đánh cờ (Đường Tăng trên server, bạn đồng tu trong bản demo): cờ vua nhìn trước 1 nước, caro chấm điểm thế công/thủ
  const PV = { P: 1, N: 3, B: 3.2, R: 5, Q: 9, K: 0 };
  function chessBot(s) {
    let best = null, bs = -1e9;
    for (const m of CHESS.legal(s)) {
      const n = CHESS.apply(s, m), st = CHESS.status(n), moved = m.promo || s.b[m.from][1];
      let sc = (n.cap ? PV[n.cap[1]] : 0) + (m.promo ? 8 : 0) + Math.random() * .4;
      if (st === 'mate') sc += 1000; else if (st === 'stalemate') sc -= 50; else if (st === 'check') sc += .3;
      if (CHESS.attacked(n.b, m.to, n.turn)) sc -= PV[moved] * .9;
      if (sc > bs) { bs = sc; best = m; }
    }
    return best && { from: best.from, to: best.to, promo: best.promo };
  }
  function caroBot(b, p) {
    const N = CARO.size, q = 3 - p, cand = [];
    for (let i = 0; i < b.length; i++) { if (b[i]) continue; const x = i % N, y = i / N | 0; let near = false; for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N && b[yy * N + xx]) { near = true; break; } } if (near) cand.push(i); }
    if (!cand.length) return { i: (N / 2 | 0) * N + (N / 2 | 0) };
    const lineScore = (i, who) => { let t = 0; const x = i % N, y = i / N | 0;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { let n = 1, open = 0;
        for (const s of [1, -1]) for (let k = 1; ; k++) { const xx = x + dx * k * s, yy = y + dy * k * s; if (xx < 0 || yy < 0 || xx >= N || yy >= N) break; const v = b[yy * N + xx]; if (v === who) n++; else { if (!v) open++; break; } }
        t += n >= 5 ? 1e6 : n === 4 ? (open === 2 ? 5e4 : open ? 4e3 : 0) : n === 3 ? (open === 2 ? 3e3 : open ? 150 : 0) : n === 2 ? (open === 2 ? 120 : 12) : 2; }
      return t; };
    let best = cand[0], bs = -1;
    for (const i of cand) { const sc = lineScore(i, p) * 1.1 + lineScore(i, q) + Math.random() * 5; if (sc > bs) { bs = sc; best = i; } }
    return { i: best };
  }
  const coBot = g => g.game === 'chess' ? chessBot(g.s) : caroBot(g.s.b, g.s.turn);
  // ---- Đường Tăng: đi lang thang trong chùa tìm Ngộ Không, thỉnh thoảng ra Đình Cờ nhận kèo ----
  const TANG = { id: 'tang', name: 'Đường Tăng', color: '#a8382c', hat: 'tylu', hair: 'bald', outfit: 'trang', speed: 95 };
  const TANG_SAYS = [
    'Ngộ Không ơi… con ở đâu rồi?',
    'Chư vị thí chủ có thấy con khỉ nào đi ngang qua đây không?',
    'Bát Giới bảo Ngộ Không đi mua cà phê sữa đá, ba tiếng chưa về…',
    'Ngộ Không lại cân đẩu vân đi đâu mất, để bần tăng tự xuất file một mình.',
    'A Di Đà Phật. Gậy Như Ý bỏ quên ở đây, mà chủ của nó thì không thấy đâu.',
    'Sa Tăng nói Ngộ Không đang Photoshop mặt khỉ thành mặt người…',
    'Thỉnh kinh thì dễ, tìm Ngộ Không mới khó.',
    'Ngộ Không ơi, về đi, khách đòi sửa logo lần thứ 81 rồi!',
    'Bần tăng đi khắp chùa rồi, chỉ còn chưa xem gốc cây đa thôi…',
    'Ai thấy Ngộ Không nhắn giùm: sư phụ không giận đâu, chỉ niệm chú nhẹ thôi.'
  ];
  const TANG_TALK = [                                  // khi người chơi bắt chuyện
    'Thí chủ có thấy đệ tử Ngộ Không của bần tăng đâu không?',
    'A Di Đà Phật. Thí chủ muốn đánh ván cờ thì ra Đình Cờ ra kèo, bần tăng rảnh sẽ ghé.',
    'Bần tăng đánh cờ không giỏi, nhưng tâm rất tĩnh.',
    'Đi thỉnh kinh mười bốn năm, chưa thấy brief nào khó bằng brief ở đây.',
    'Nếu thấy con khỉ cầm gậy vàng, thí chủ cứ gọi bần tăng nhé.'
  ];
  const TUG = { win: 18, ms: 12000, countdown: 3000, minGap: 70, grace: 300 };   // minGap: tối đa ~14 lần/giây, grace: bù độ trễ mạng   // kéo lệch 18 lần là thắng, tối đa 12 giây

  const DEFAULT_FORTUNES = [
    'Thượng cát: Khách duyệt file ngay bản đầu, còn khen “đúng ý anh luôn em ạ”.',
    'Trung bình: Hôm nay khách sẽ bảo “làm logo to hơn nhưng nhỏ lại một chút”.',
    'Đại cát: Deadline lùi 1 tuần mà không ai hỏi han gì.',
    'Hạ hạ: Máy sẽ treo đúng lúc chưa Ctrl+S. Hãy Ctrl+S ngay sau khi đọc quẻ này.',
    'Cát: Font bị thiếu sẽ tự xuất hiện như phép màu.',
    'Hung nhẹ: Sẽ có người gửi file .jpg chụp màn hình và bảo “dùng tạm file gốc này nhé”.',
    'Thượng cát: Render một phát ăn ngay, không đỏ một frame nào.',
    'Trung cát: Lương về đúng hẹn, nhưng tiền điện về sớm hơn.',
    'Cát: Hôm nay layer nào cũng có tên, không còn “Layer 1 copy 37”.',
    'Hung: Khách sẽ nói “em cứ sáng tạo thoải mái” rồi sửa 12 lần.',
    'Đại cát: Màu in ra giống y màu trên màn hình. Hãy mua vé số.',
    'Bình: Bạn sẽ mất 2 tiếng chọn font rồi quay lại dùng font đầu tiên.',
    'Cát: Có người gửi brief đầy đủ, có cả mã màu và kích thước.',
    'Hung nhẹ: Cái Wi-Fi sẽ rớt đúng lúc đang upload file 4GB.',
    'Thượng cát: Tổ Photoshop phù hộ, công cụ Content-Aware hôm nay hiểu ý bạn.',
    'Trung bình: Khách xin “thêm chút hiệu ứng cho nó sang”. Chúc may mắn.',
    'Cát: Tìm được file “final_final_v3_thật_sự_final” trong 5 giây.',
    'Hạ: Ổ cứng báo đầy. Xoá bớt thư mục “Ảnh tham khảo (2019)” đi.',
    'Đại cát: Feedback hôm nay chỉ có một chữ: “Duyệt”.',
    'Bình: Cà phê sữa đá hôm nay ngon hơn mọi ngày, deadline thì vẫn vậy.'
  ];
  const DEFAULT_BANNED = ['địt', 'đụ', 'lồn', 'cặc', 'buồi'];

  function stamina(p, now) {            // tính sinh lực hiện tại (có hồi theo thời gian)
    if (p.st === undefined) { p.st = STAMINA_MAX; p.stAt = now; }
    if (p.st < STAMINA_MAX) {
      const gain = Math.floor((now - (p.stAt || now)) / REGEN_MS);
      if (gain > 0) { p.st = Math.min(STAMINA_MAX, p.st + gain); p.stAt = (p.stAt || now) + gain * REGEN_MS; }
    } else p.stAt = now;
    return p.st;
  }
  function useStamina(p, n, now) { stamina(p, now); if (p.st < n) return false; if (p.st >= STAMINA_MAX) p.stAt = now; p.st -= n; return true; }
  function filterText(text, banned, max = 80) {
    let t = String(text || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
    for (const w of banned || []) if (w) t = t.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => '*'.repeat(m.length));
    return t;
  }
  return { OFFER_TTL, coBot, TANG, TANG_SAYS, TANG_TALK, CO, CHESS, CARO, coNew, coTurnId, coOther, coPlay, coTimeout, OUTFITS, COBA_SAYS, POOP, RARITY, CAU, DEFAULT_BRIEFS, rollBrief, VERSION, FISH, FISH_RULES, SAMHOI, PEN_LESSONS, PEN, penScore, penSegs, sampleSegs, BELL, bellPos, CHANT, CITIES, WEATHER, weatherKind, STAMINA_MAX, REGEN_MS, COST, COLORS, HATS, HAIRS, FOODS, TUG_BETS, TUG, DEFAULT_FORTUNES, DEFAULT_BANNED, stamina, useStamina, filterText };
});
