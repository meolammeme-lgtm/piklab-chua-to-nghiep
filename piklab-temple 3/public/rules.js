// Luật chơi & danh mục vật phẩm — dùng chung cho server (Node) và trình duyệt (bản demo, giao diện)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RULES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const VERSION = '2.3.3';   // tăng mỗi đợt: server & trang game phải cùng phiên bản
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
  return { OUTFITS, COBA_SAYS, POOP, RARITY, CAU, DEFAULT_BRIEFS, rollBrief, VERSION, FISH, FISH_RULES, SAMHOI, PEN_LESSONS, PEN, penScore, penSegs, sampleSegs, BELL, bellPos, CHANT, CITIES, WEATHER, weatherKind, STAMINA_MAX, REGEN_MS, COST, COLORS, HATS, HAIRS, FOODS, TUG_BETS, TUG, DEFAULT_FORTUNES, DEFAULT_BANNED, stamina, useStamina, filterText };
});
