# 🎄 Thiệp Giáng Sinh

Trang web thiệp Giáng Sinh tĩnh (HTML/CSS/JS thuần, không cần build).

- Phong bì mở ra → thiệp hiện lên với cây thông nhấp nháy, lời chúc gõ từng chữ
- Tuyết rơi, pháo sáng khi mở thiệp, đồng hồ đếm ngược đến Giáng Sinh
- Nhạc *Jingle Bells* tổng hợp bằng Web Audio (không cần file nhạc)
- **Tạo thiệp**: nhập tên người nhận, lời chúc, người gửi → sao chép link để gửi

## Chạy

Mở `index.html` trong trình duyệt, hoặc:

```bash
python3 -m http.server 8000
```

Link thiệp dùng tham số URL: `?to=Mẹ yêu&msg=...&from=Con`.
Có thể deploy lên GitHub Pages (Settings → Pages → branch này, thư mục root).
