# Đăng nhập admin và đổi mật khẩu

Backend: `POST /api/admin/auth/login` nhận JSON `{ "username": "...", "password": "..." }`.
Chỉ tài khoản trong `staff_account` có `role = 'ADMIN'` mới được cấp JWT admin.
`GET /api/admin/auth/me` xác minh phiên hiện tại; JWT hết hạn sau 8 giờ theo cấu hình JWT hiện có.
Giao diện bỏ đăng nhập demo, lưu JWT và kiểm tra lại phiên khi tải trang. Đăng xuất xóa phiên trên trình duyệt.

## Tạo hash mật khẩu trên Mac hoặc Windows

Cần Docker Desktop đang chạy và Python 3; không cần cài thêm thư viện Python.

1. Build backend mới: `docker compose build backend`.
2. Mac: `python3 scripts/hash-admin-password.py`.
   Windows: `py scripts/hash-admin-password.py` (hoặc `python` nếu máy dùng lệnh này).
3. Nhập mật khẩu hai lần. Khi nhập sẽ không hiển thị ký tự.
4. Sao chép hash 60 ký tự vào `staff_account.password_hash` của đúng tài khoản admin bằng công cụ quản lý MySQL.

Script dùng đúng BCryptPasswordEncoder của backend, không khởi động Spring và không kết nối MySQL.
Mỗi lần hash có thể khác nhau dù cùng mật khẩu; BCrypt tự tạo salt, backend vẫn kiểm tra được.

Ví dụ SQL trong công cụ quản lý database (thay hai giá trị ví dụ trước khi chạy):

```sql
UPDATE staff_account
SET password_hash = 'DAN_HASH_BCRYPT_VAO_DAY'
WHERE username = 'TEN_ADMIN_CUA_BAN' AND role = 'ADMIN';
```

Không dán mật khẩu gốc vào cột password_hash. Kết nối MySQL Docker ở localhost:3307 theo cấu hình mặc định.
Tài khoản phải tồn tại trước; câu UPDATE không tự tạo tài khoản mới.
Thay đổi mật khẩu không thu hồi ngay JWT đã cấp; các token đó hết hạn theo thời hạn hiện có.

## Chạy

`docker compose up --build -d`, mở http://localhost và nhập tài khoản admin trong database.
Phần seed demo đã dùng RECEPTIONIST cho tài khoản lễ tân để phù hợp cột role hiện tại;
không sửa quyền POS hay dữ liệu tài khoản đang có mật khẩu thật.
