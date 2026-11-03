# Database

Thư mục chứa file SQL để khởi tạo database MySQL cho đồ án Smart POS & KDS khi chạy bằng Docker.

## Cấu trúc

```
database/
├── README.md
├── init/        ← file SQL đang dùng (CHỈ ĐỂ ĐÚNG 1 FILE)
└── archive/     ← các bản SQL cũ, không được nạp vào Docker
```

## Quy ước

- `init/` được mount vào container MySQL. MySQL sẽ chạy **mọi file `.sql`** trong thư mục này, nên chỉ để một file duy nhất.
- Bản cũ chuyển sang `archive/`, không để lẫn trong `init/`.
- Đặt tên file theo định dạng `smart_pos_kds.năm.tháng.ngày.sql` để dễ nhận ra bản mới nhất, ví dụ `smart_pos_kds.26.10.11.sql`.
- Tên database trong file SQL phải là `smart_pos_kds` (khớp với `MYSQL_DATABASE` trong `.env` và URL của backend).

## Cách hoạt động

File SQL chỉ được nạp **một lần**, khi volume `mysql_data` còn trống (lần đầu chạy `docker compose up`). Các lần sau MySQL bỏ qua thư mục này, nên sửa file SQL xong sẽ không tự áp dụng.

## Khi có bản SQL mới

1. Chuyển file cũ trong `init/` sang `archive/`.
2. Bỏ file mới vào `init/`.
3. Commit và push cả hai thay đổi.
4. Mọi người pull về, rồi nạp lại DB:

```
docker compose down -v
docker compose up --build
```

## Lưu ý

- `docker compose down -v` **xóa toàn bộ dữ liệu** trong DB, kể cả dữ liệu test bạn đã thêm tay.
- Chỉ thêm bảng hoặc cột mà không muốn mất dữ liệu: chạy lệnh SQL trực tiếp (Workbench, DBeaver), rồi cập nhật luôn file trong `init/` để người khác nạp đúng bản mới.
- Đầu file SQL có `DROP DATABASE IF EXISTS smart_pos_kds`. **Không chạy tay file này trên MySQL cài sẵn** nếu không muốn mất dữ liệu cũ.
- Mật khẩu và cổng đặt trong file `.env` (copy từ `.env.example`), không commit file `.env`.