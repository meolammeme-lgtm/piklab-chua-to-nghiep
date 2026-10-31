// Gộp toàn bộ game thành 1 file HTML chạy offline (mở bằng double-click trên Mac/Windows)
const fs = require('fs'), path = require('path');
const pub = path.join(__dirname, 'public');
let html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${fs.readFileSync(path.join(pub, 'style.css'), 'utf8')}\n</style>`);
html = html.replace(/<script src="([\w.-]+\.js)"><\/script>/g, (_, f) => `<script>\n${fs.readFileSync(path.join(pub, f), 'utf8').replace(/<\/script/g, '<\\/script')}\n</script>`);
html = html.replace('<title>', '<script>window.PK_FORCE_DEMO = true;</script>\n<title>');
const out = path.join(__dirname, 'Chua-To-Nghiep-PikLab-DEMO.html');
fs.writeFileSync(out, html);
console.log('Đã tạo', out, (html.length / 1024).toFixed(0) + ' KB');
