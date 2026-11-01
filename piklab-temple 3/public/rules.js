// Luật chơi & danh mục vật phẩm — dùng chung cho server (Node) và trình duyệt (bản demo, giao diện)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RULES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
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
    { id: 'bald', name: 'Cạo trọc', price: 2, note: 'Cạo sạch, bỏ luôn mũ nón' }
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
  function filterText(text, banned) {
    let t = String(text || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
    for (const w of banned || []) if (w) t = t.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => '*'.repeat(m.length));
    return t;
  }
  return { BELL, bellPos, CHANT, CITIES, WEATHER, weatherKind, STAMINA_MAX, REGEN_MS, COST, COLORS, HATS, HAIRS, FOODS, TUG_BETS, TUG, DEFAULT_FORTUNES, DEFAULT_BANNED, stamina, useStamina, filterText };
});
