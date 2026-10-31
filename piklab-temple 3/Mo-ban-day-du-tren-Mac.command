#!/bin/bash
# Bản đầy đủ: chạy server (nhiều người chơi thật + trang admin). Cần cài Node.js.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display dialog "Bản đầy đủ cần Node.js (miễn phí). Trình duyệt sẽ mở trang tải Node.js — cài xong hãy mở lại file này.\n\nNếu chỉ muốn xem thử, mở file Chua-To-Nghiep-PikLab-DEMO.html là đủ." buttons {"OK"} default button 1 with title "Chùa Tổ Nghiệp Designer"'
  open "https://nodejs.org/vi/download"
  exit 1
fi
PORT=${PORT:-3000}
echo "🛕 Đang mở chùa tại http://localhost:$PORT  (admin: http://localhost:$PORT/admin)"
echo "   Đóng cửa sổ Terminal này để tắt server."
(sleep 1.5; open "http://localhost:$PORT"; open "http://localhost:$PORT/admin") &
PORT=$PORT node server.js
