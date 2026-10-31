[README.md](https://github.com/user-attachments/files/34222787/README.md)
# 🛕 Chùa Tổ Nghiệp Designer · PikLab

Web game nhiều người chơi: dân thiết kế cùng đi lại trong khuôn viên chùa, thắp hương cho các vị "tổ" (Photoshop, Illustrator, Premiere Pro, After Effects, Blender, Figma, Canva, CapCut, InDesign, Lightroom), thỉnh chuông, cuốc đất trồng rau để nhận voucher PikLab, và mang rau cho thú cưng trong chùa ăn để tích phước.

## Xem nhanh trên Macbook

- **Bản DEMO (không cần cài gì):** nhấp đúp file `Chua-To-Nghiep-PikLab-DEMO.html`. File mở bằng Safari hoặc Chrome và chạy offline. Tài khoản đăng ký trong demo chỉ lưu trên máy đó. Các "bạn đồng tu" trong bản demo là bot mô phỏng. Bấm **⚙️ Demo** để tải icon ứng dụng lên ban thờ và chỉnh tỉ lệ trúng.
- **Bản đầy đủ (nhiều người chơi thật + admin):** cài [Node.js](https://nodejs.org), rồi nhấp đúp `Mo-ban-day-du-tren-Mac.command`. Lần đầu macOS có thể chặn file này: bấm chuột phải → **Open** → **Open**.

Điều khiển: WASD/phím mũi tên hoặc bấm vào nơi muốn đến · `E` để tương tác · cuộn chuột hoặc `+`/`−` để thu phóng.

## Chạy bằng dòng lệnh

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
| `DATA_FILE` | `data/db.json` | Nơi lưu voucher, người chơi, thống kê (khi không dùng Redis) |
| `UPSTASH_REDIS_REST_URL` | (trống) | Lưu dữ liệu bền vững trên Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | (trống) | Token đi kèm URL ở trên |

## Giữ dữ liệu khi deploy lại (bắt buộc nếu dùng Render gói miễn phí)

Render gói miễn phí **xoá ổ đĩa mỗi lần deploy hoặc khởi động lại**. Nếu chỉ lưu vào file, mọi tài khoản, voucher và thống kê sẽ mất. Cách khắc phục miễn phí là lưu dữ liệu lên **Upstash Redis**: gói free có 256 MB và 500.000 lệnh/tháng, không cần thẻ.

1. Vào https://console.upstash.com, đăng ký bằng Google hoặc GitHub, rồi bấm **Create Database**. Đặt tên bất kỳ, chọn vùng **Singapore** (gần Việt Nam và gần Render Singapore nhất), gói **Free**.
2. Mở database vừa tạo, tìm mục **REST API** và copy 2 giá trị `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`.
3. Trên Render, vào service của game → **Environment** → **Add Environment Variable**, thêm 2 biến trên với đúng tên và giá trị. Bấm **Save, rebuild, and deploy**.
4. Vào `/admin`. Ô thông báo màu xanh *"Dữ liệu đang lưu trên Upstash Redis"* nghĩa là đã xong.

Cách hoạt động:
- Server chỉ gửi những phần dữ liệu thay đổi, gom lại 30 giây một lần. Sự kiện quan trọng như đăng ký, trúng voucher hay thao tác admin được lưu ngay trong 1–2 giây. Khi Render tắt máy cũ để deploy, server lưu nốt trước khi thoát.
- Lúc không có ai chơi, server không tốn lệnh Redis nào.
- Nếu URL hoặc token sai, server sẽ **dừng lại** và báo lỗi trong tab Logs thay vì chạy với dữ liệu trống, để tránh ghi đè.

Cách thay thế có trả phí: gắn **Persistent Disk** của Render (khoảng 7 USD/tháng trở lên) vào thư mục `/var/data`, rồi đặt `DATA_FILE=/var/data/db.json`.

## Tính năng

**Tài khoản & chống spam**
- Lần đầu vào chùa, khách đăng ký bằng **email + mật khẩu + pháp danh** (chọn luôn màu áo và phụ kiện). Những lần sau chỉ cần nhập email và mật khẩu là vào đúng nhân vật cũ. Trên cùng một máy, game còn nhớ phiên đăng nhập 60 ngày.
- **Email chỉ admin thấy**, trong tab *Người chơi* và file CSV người trúng thưởng. Người chơi với nhau chỉ thấy pháp danh.
- Các lớp chống spam:
  - Pháp danh không được trùng.
  - Mỗi mạng (IP) chỉ tạo tối đa 3 tài khoản/ngày (chỉnh được trong admin).
  - Sai mật khẩu 5 lần thì khoá 15 phút. Một mạng đăng nhập sai quá 15 lần cũng bị chặn 15 phút.
  - Giới hạn tần suất gọi API.
  - Mỗi tài khoản chỉ ở **một nơi cùng lúc**: vào ở tab hoặc máy khác thì nơi cũ bị đẩy ra.
  - Lượt đào giới hạn theo tài khoản và theo IP.
  - Admin có thể **khoá tài khoản** (người bị khoá bị đẩy ra ngay) và **đặt mật khẩu mới** khi khách quên mật khẩu.
- Mật khẩu được băm bằng scrypt kèm salt riêng cho từng tài khoản, không lưu dạng thô.

**Ánh sáng theo giờ Việt Nam (UTC+7):** bình minh hồng nhạt, ban ngày sáng dịu, hoàng hôn vàng, tối xanh trầm. Khi trời tối, đèn lồng và nến sáng lên và có đom đóm bay. Bấm vào đồng hồ trên thanh trên cùng để xem thử từng khung giờ.

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
- **Người chơi:** danh sách tài khoản (pháp danh, email, ngày tạo, lần đăng nhập, điểm phước, lượt đào, số lần trúng, IP). Có ô tìm kiếm, nút khoá/mở khoá và xuất CSV.
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

> Bài vị mặc định ghi tên viết tắt (Ps, Ai, Pr…). Để hiện icon chính thức của từng hãng, bấm **⬆ Tải icon** trong Cài đặt (bản server) hoặc trong **⚙️ Demo** (bản demo). Hãy dùng file icon từ trang chính thức của hãng.

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
public/engine.js   Engine 3D WebGL2 tự viết: ánh sáng, đổ bóng mềm, khối bo tròn
public/world.js    Dựng khuôn viên 3D: chánh điện, ban thờ, vườn rau, vườn thú, nhân vật
public/game.js     Logic game, camera, điều khiển, hiệu ứng, giao diện
public/local.js    Chế độ demo offline (giả lập server + bot)
build-demo.js      `node build-demo.js` → gộp thành 1 file DEMO.html
public/layout.js   Bản đồ khuôn viên (dùng chung client/server)
public/style.css   Giao diện HUD & hộp thoại
public/admin.html  Trang quản trị
```
