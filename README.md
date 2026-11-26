# Hệ thống quản lý nhà hàng — Smart POS & KDS

Hệ thống gồm giao diện Khách hàng, Lễ tân (POS), Bếp (KDS), Quản trị và backend Spring Boot.

## 1. Yêu cầu

- Cài đặt và mở Docker Desktop, sử dụng Linux containers.
- Có kết nối Internet để tải image và thư viện trong lần build đầu.
- Chạy các lệnh tại thư mục gốc project, nơi có file `docker-compose.yml`.

## 2. Chuẩn bị cấu hình

Nếu chưa có file `.env`, sao chép từ mẫu:

```powershell
Copy-Item .env.example .env
```

Không chép đè nếu đã có `.env`. Điền các giá trị sau:

```dotenv
MYSQL_ROOT_PASSWORD=mat_khau_mysql_cua_ban
JWT_SECRET=thay_bang_khoa_base64_vua_tao
API_DOCS_ENABLED=true
DEMO_ACCOUNTS_ENABLED=false
```

Tạo khóa JWT bằng PowerShell, rồi chép kết quả vào `JWT_SECRET`:

```powershell
$jwtBytes = New-Object byte[] 32
$jwtRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jwtRng.GetBytes($jwtBytes)
[Convert]::ToBase64String($jwtBytes)
$jwtRng.Dispose()
```

Lưu ý:

- Nếu database Docker đã tồn tại, dùng đúng mật khẩu MySQL khi khởi tạo database. Sửa `.env` không tự đổi mật khẩu trong database cũ.
- Các tài khoản demo được cung cấp trong dữ liệu SQL, không cần bật lại chức năng tạo tài khoản demo.
- Không đưa file `.env` chứa cấu hình thật lên Git.

## 3. Khởi động bằng Docker

```powershell
docker compose up -d --build
```

Lần chạy đầu có thể mất vài phút. Kiểm tra trạng thái:

```powershell
docker compose ps
docker compose logs --tail=100 backend
```

Chờ MySQL có trạng thái `healthy` và backend khởi động thành công.

Nếu backend local đang chiếm cổng `8080`, dừng backend local hoặc đặt biến sau trong `.env` trước khi chạy Docker:

```dotenv
BACKEND_PORT=8081
```

## 4. Địa chỉ và tài khoản kiểm thử

Các tài khoản dưới đây chỉ dùng với dữ liệu demo của đồ án.

| Màn hình / Vai trò | Địa chỉ mặc định | Tài khoản | Mật khẩu |
|---|---|---|---|
| Khách hàng — bàn 1 | http://localhost:5173/?table=1 | Không cần đăng nhập | — |
| Lễ tân / POS | http://localhost:5174 | letan1 | 123456 |
| Bếp nóng / KDS | http://localhost:5175 | bepnong | 123456 |
| Quản trị | http://localhost:5176 | admin | 123456 |

Trang khách hàng cần mã bàn tồn tại trong database.

Các cổng có thể thay đổi theo cấu hình trong `.env`.

## 5. Swagger và kiểm thử API

Địa chỉ mặc định:

- Swagger UI: http://localhost:8080/swagger-ui/index.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs

Nếu đặt `BACKEND_PORT=8081`, sử dụng:

http://localhost:8081/swagger-ui/index.html

Để bật Swagger, đặt trong `.env`:

```dotenv
API_DOCS_ENABLED=true
```

Phần `backend → environment` trong `docker-compose.yml` cần có:

```yaml
- API_DOCS_ENABLED=${API_DOCS_ENABLED:-false}
```

Sau khi đổi biến môi trường, cập nhật container:

```powershell
docker compose up -d backend
```

### Đăng nhập và sử dụng token

- POS/KDS: `POST /api/auth/login`.
- Admin: `POST /api/admin/auth/login`.

Ví dụ đăng nhập POS:

```json
{
  "username": "letan1",
  "password": "123456"
}
```

Trong Swagger:

1. Chọn nhóm `01-auth`, mở API đăng nhập và bấm `Try it out`.
2. Nhập tài khoản, mật khẩu và bấm `Execute`.
3. Sao chép token trong phản hồi.
4. Bấm `Authorize`, dán token và xác nhận. Không thêm tiền tố `Bearer`.
5. Chọn nhóm API phù hợp để kiểm thử.

API đọc dữ liệu có thể thử:

- POS: `GET /api/pos/tables`.
- KDS: `GET /api/kds/orders`.

Swagger gồm sáu nhóm: Auth, Customer, POS, KDS, Admin và Payment.

Các API Nấu, Hủy và Thanh toán thay đổi dữ liệu thật; chỉ thử trên dữ liệu demo phù hợp.

## 6. Kịch bản kiểm thử cơ bản

1. Mở trang khách hàng của một bàn hợp lệ, chọn món và gửi đơn.
2. Đăng nhập POS, kiểm tra đơn xuất hiện trong hàng đợi và duyệt món.
3. Đăng nhập KDS đúng khu bếp, kiểm tra món vừa duyệt xuất hiện.
4. Bấm `Bắt đầu nấu`, sau đó bấm `Hoàn thành` khi nút được mở khóa.
5. Kiểm tra trạng thái món tương ứng trên trang khách hàng và POS.
6. Kiểm tra phân quyền API:
   - Không có token: nhận `401`.
   - Token của tài khoản bếp gọi API POS: nhận `403`.

Luồng thanh toán VNPay/MOCK cần cấu hình và kiểm thử riêng.

## 7. Dữ liệu demo

- SQL trong `database/init/` chỉ tự import khi volume MySQL được khởi tạo lần đầu.
- Sửa file SQL không tự cập nhật database trong volume đã tồn tại.
- Database Docker và database local có thể có dữ liệu, tài khoản và mật khẩu khác nhau.
- Nếu không đăng nhập được, kiểm tra dữ liệu của đúng database đang sử dụng.
- Không xóa volume chỉ để xử lý lỗi đăng nhập.

## 8. Dừng hệ thống và xem log

Dừng hệ thống, giữ nguyên dữ liệu:

```powershell
docker compose stop
```

Khởi động lại các container đã tạo:

```powershell
docker compose start
```

Xem log khi gặp lỗi:

```powershell
docker compose logs --tail=100 backend mysql-db frontend
```

## 9. Chạy backend bằng IDE

Spring Boot chạy trực tiếp bằng IDE không tự đọc file `.env`.

Khai báo các biến cần thiết trong:

`Run/Debug → Environment variables`

Để bật Swagger khi chạy local, thêm:

```text
API_DOCS_ENABLED=true
```

Hoặc chạy trong cùng một cửa sổ PowerShell:

```powershell
$env:API_DOCS_ENABLED="true"
.\gradlew.bat bootRun --console=plain
```