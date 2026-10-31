# 🛕 Chùa Tổ Nghiệp Designer · PikLab

Web game nhiều người chơi: dân thiết kế cùng đi lại trong khuôn viên chùa, thắp hương cho các vị "tổ" (Photoshop, Illustrator, Premiere Pro, After Effects, Blender, Figma, Canva, CapCut, InDesign, Lightroom), thỉnh chuông, cuốc đất trồng rau để nhận voucher PikLab, và mang rau cho thú cưng trong chùa ăn để tích phước.

## Chạy thử

Cần **Node.js 18 trở lên**. Không cần `npm install`, vì dự án không dùng thư viện ngoài.

```bash
node server.js
# Game:   http://localhost:3000
# Admin:  http://localhost:3000/admin   (mật khẩu mặc định: piklab@2026)
```

Biến môi trường:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng chạy |
| `ADMIN_PASSWORD` | `piklab@2026` | **Hãy đổi khi đưa lên mạng** |
| `DATA_FILE` | `data/db.json` | Nơi lưu voucher, người chơi, thống kê |

## Tính năng

**Người chơi**
- Đi lại bằng WASD hoặc phím mũi tên, hoặc chạm/bấm vào nơi muốn đến. Bấm vào bản đồ nhỏ cũng được. Chơi tốt trên điện thoại.
- Thấy người khác di chuyển theo thời gian thực. Có các biểu cảm: chắp tay, vái, tĩnh tâm…
- **Thắp hương** ở ban thờ trong chánh điện hoặc ở lư hương lớn ngoài sân: chọn vị tổ và viết lời nguyện. Cả chùa sẽ thấy nén nhang cắm vào lư và lời nguyện bay lên. Mỗi lần thắp được +3 phước.
- **Thỉnh chuông** ở gác chuông: mọi người trong chùa đều nghe thấy.
- **Vườn Rau Phước Đức** có 12 luống. Cuốc một luống sẽ quay thưởng theo tỉ lệ admin đặt:
  - Trúng thì nhận mã voucher, có nút sao chép và link dùng tại PikLab.
  - Không trúng thì nhận **1 bó rau**.
  - Luống đã đào sẽ mọc lại sau một khoảng thời gian, và mọi người trong chùa cùng thấy.
- **Vườn Thú Cưng** có Mèo Mướp, Cún Vàng, Gà Ri, Trâu Đất và đàn cá chép hồ sen. Mang rau đến cho ăn được +5 phước.
- 🎒 **Túi đồ** lưu điểm phước, số rau và các voucher đã trúng. Người chơi được nhận diện bằng mã lưu trên trình duyệt.

**Tự mở chùa mới.** Khi Chùa 1 đủ số người (mặc định 30, đổi được trong admin), người vào sau sẽ tự được đưa sang **Chùa 2**, rồi **Chùa 3**… Chùa phụ không còn ai sẽ tự đóng sau 60 giây.

**Admin (`/admin`)**
- **Tổng quan truy cập:** số người online, lượt truy cập, người dùng duy nhất, người mới, đỉnh online theo giờ (24h) và theo ngày (14 ngày). Có thêm số nén hương, lượt đào, voucher đã phát, lượt cho thú ăn, cùng danh sách các chùa đang mở và mức lấp đầy. Trang tự làm mới mỗi 5 giây.
- **Voucher & tỉ lệ:**
  - Tạo voucher với **tỉ lệ trúng (%)**.
  - Có hai loại mã: *danh sách mã riêng* (mỗi người một mã, có nút tạo nhanh 50 mã) hoặc *một mã chung + số lượng*.
  - Tuỳ chọn "mỗi người chỉ trúng 1 lần".
  - Bật/tắt voucher, sửa tỉ lệ trực tiếp trong bảng, thêm mã.
  - Có thanh trực quan cho thấy phần trăm của từng voucher so với phần "bó rau".
- **Người trúng thưởng:** danh sách người trúng, xuất ra file CSV mở được bằng Excel.
- **Cài đặt:**
  - Sức chứa mỗi chùa, lượt đào/ngày/người, thời gian rau mọc lại, giãn cách thắp hương, link PikLab.
  - Chỉnh **bài vị trên ban thờ**: tên, viết tắt, màu, **link ảnh icon**.

> Bài vị mặc định ghi tên viết tắt (Ps, Ai, Pr…), chưa dùng logo chính thức của các hãng. Nếu muốn hiện icon thật, hãy dán link ảnh icon vào cột "Ảnh icon" trong Cài đặt.

## Cách tính tỉ lệ

Mỗi lượt đào, server quay một số ngẫu nhiên từ 0 đến 100. Mỗi voucher đang bật và còn mã chiếm một khoảng bằng tỉ lệ của nó, phần còn lại là bó rau. Ví dụ: voucher A 5% và voucher B 10% thì 85% sẽ ra bó rau. Toàn bộ việc quay thưởng diễn ra trên server nên người chơi không gian lận được. Ngoài ra còn giới hạn lượt đào theo người chơi **và** theo IP (gấp 3 lần), và kiểm tra người chơi phải đứng gần luống đất.

## Triển khai

Chạy được trên bất kỳ máy chủ Node nào: VPS, Render, Railway, Fly.io…
- Lệnh chạy: `node server.js`
- Nếu đặt sau Nginx, cần bật proxy WebSocket cho đường dẫn `/ws`:
  ```nginx
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
  ```
- Thư mục `data/` cần được giữ lại giữa các lần deploy (persistent disk), nếu không sẽ mất voucher và thống kê.
- Bản này chạy trên một tiến trình và lưu dữ liệu ra file JSON. Mức đó phù hợp vài trăm đến vài nghìn người online. Nếu cần lớn hơn, có thể chuyển phần lưu trữ sang PostgreSQL hoặc Redis.

## Cấu trúc

```
server.js          Server HTTP + WebSocket, logic game, API admin, thống kê
public/index.html  Giao diện game
public/game.js     Engine canvas: vẽ chùa, nhân vật, động vật, hiệu ứng, điều khiển
public/layout.js   Bản đồ khuôn viên (dùng chung client/server)
public/style.css   Giao diện HUD & hộp thoại
public/admin.html  Trang quản trị
```
