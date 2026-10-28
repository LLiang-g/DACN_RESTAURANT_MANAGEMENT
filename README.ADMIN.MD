# Hướng dẫn chạy và sử dụng Admin / Quản lý

Tài liệu đối chiếu với code trên nhánh `nam_merge`, cập nhật ngày 26/10/2026.

## 1. Giới thiệu

Admin/Quản lý là phân hệ cấu hình dữ liệu vận hành nhà hàng Smart POS: khu bếp, thực đơn, nguyên liệu, công thức, tồn kho, bàn, tài khoản và nhật ký. Theo [đặc tả chức năng](DACN-08-Dac-Ta-Chuc-Nang.md), Admin và Quản lý dùng chung phân hệ; quyền truy cập hiện tại là `ADMIN`.

Frontend dùng React + TypeScript + Vite; backend dùng Spring Boot, Java 21, Spring Security/JWT và MySQL 8. Giao diện gọi API thật và backend lưu dữ liệu vào MySQL. Tuy nhiên, một số màn hình vẫn có dữ liệu mẫu và cập nhật local khi API lỗi; xem mục 8 để hiểu giới hạn của bản này.

## 2. Chạy bằng Docker trên macOS và Windows

Cài Git và Docker Desktop, mở Docker Desktop trước khi chạy. Các lệnh dưới đây dùng được trong Terminal macOS và PowerShell Windows. Docker tự build Java/Node nên không cần cài Java hoặc Node trên máy nếu chỉ chạy ứng dụng.

```sh
git clone --branch nam_merge https://github.com/LLiang-g/DACN_RESTAURANT_MANAGEMENT.git
cd DACN_RESTAURANT_MANAGEMENT
docker compose up --build -d
docker compose ps
```

Nếu đã có repository, chuyển sang nhánh `nam_merge` và cập nhật code sau khi đã lưu các thay đổi riêng của mình; không cần clone lại.

Lần đầu cần tải image, thư viện và nhập database mẫu nên có thể mất vài phút. Mở **http://localhost/** để đăng nhập. Nếu backend chưa sẵn sàng, xem log:

```sh
docker compose logs --tail=100 backend mysql-db
docker compose logs -f backend
```

| Thành phần | Địa chỉ mặc định | Ghi chú |
|---|---|---|
| Trang Admin | http://localhost/ | Frontend Nginx, cổng 80 |
| API qua frontend | http://localhost/api/admin/foods | Cần token Admin |
| Backend trực tiếp | http://localhost:8080/api/admin/foods | Cần token Admin; `/` của backend không phải trang web |
| MySQL | `127.0.0.1:3307` | Database `smart_pos_kds`, user `root`, mật khẩu demo `123456` |

Database được khởi tạo từ `sample_database.26.7.10.sql` khi volume MySQL mới được tạo. Build lại không tự nhập lại dữ liệu và không ghi đè database đang có.

Dừng dịch vụ và giữ dữ liệu:

```sh
docker compose down
```

Không thêm `-v` nếu muốn giữ database. Nếu trùng cổng, tạo file `.env` ở thư mục gốc, ví dụ:

```dotenv
FRONTEND_PORT=8088
BACKEND_PORT=8081
MYSQL_PORT=3308
```

Sau đó chạy lại `docker compose up --build -d`; trang Admin đổi thành `http://localhost:8088/`. Các URL trong tài liệu mặc định dùng cổng 80.

## 3. Đăng nhập và mật khẩu

Với database mới được khởi tạo:

- Tên đăng nhập: `admin.demo`
- Mật khẩu: `Admin@123`
- Vai trò: `ADMIN`

Seeder giữ nguyên tài khoản đã có mật khẩu thật, vì vậy database cũ có thể không dùng mật khẩu demo trên. `manager.demo` và `manager.test` hiện được seed với quyền `RECEPTIONIST`, không đăng nhập được Admin; đây là điểm chưa thống nhất với tên tài khoản, không phải một quyền Quản lý riêng.

Trang đăng nhập xuất hiện khi chưa có phiên hợp lệ; không có URL `/login` riêng. Đăng nhập thành công nhận JWT, lưu phiên trong trình duyệt và kiểm tra phiên khi tải lại. Đăng xuất xóa phiên trên trình duyệt. JWT hiện có thời hạn 8 giờ; đổi mật khẩu không tự thu hồi JWT đã cấp.

Tạo hash BCrypt bằng script dùng chính bộ mã hóa của backend (cần Docker và Python 3):

```sh
# macOS
python3 scripts/hash-admin-password.py
```

```powershell
# Windows
py scripts/hash-admin-password.py
```

Script hỏi mật khẩu hai lần và xuất hash; không tự thay đổi DB. Cập nhật hash vào `staff_account.password_hash` của đúng tài khoản có role `ADMIN`. Hướng dẫn SQL: [scripts/ADMIN-LOGIN.md](scripts/ADMIN-LOGIN.md).

## 4. Đường dẫn đầy đủ của từng chức năng

Giao diện sử dụng **hash routing**: phải có `#/` trong URL. Các tab và hộp thoại nằm trong trang cha, chưa có URL riêng; mở URL bên dưới rồi chọn tab/nút tương ứng. Khi chưa đăng nhập, mọi trang đều yêu cầu đăng nhập trước.

| Chức năng | URL đầy đủ | Cách mở và nội dung |
|---|---|---|
| Đăng nhập | http://localhost/ | Nhập tài khoản Admin khi chưa đăng nhập |
| Dashboard | http://localhost/#/dashboard | Tổng quan món, nguyên liệu, tồn thấp, bàn và khu bếp |
| Khu bếp | http://localhost/#/kitchen | Tab **Khu bếp**: xem, thêm, sửa, xóa khu bếp |
| Tài khoản bếp | http://localhost/#/kitchen | Tab **Tài khoản bếp**: tạo/sửa/xóa tài khoản, gán khu bếp |
| Món ăn | http://localhost/#/menu | Tab **Món ăn**: tên, danh mục, giá, ảnh, mô tả, thời gian nấu |
| Danh mục | http://localhost/#/menu | Tab **Danh mục**: tạo/sửa/xóa, gán khu bếp phụ trách |
| Nhóm tùy chọn | http://localhost/#/menu | Tab **Nhóm option**: cấu hình chọn một hoặc chọn nhiều |
| Tùy chọn món | http://localhost/#/menu | Tab **Option**: gán món/nhóm, chênh lệch giá, hệ số BOM, thêm/bớt nguyên liệu |
| Combo | http://localhost/#/menu | Tab **Combo**: tên, kiểu giá; bấm số món để thêm/xóa món con và số lượng |
| Nguyên liệu | http://localhost/#/inventory | Tab **Nguyên liệu**: tên, đơn vị, tồn kho, ngưỡng tồn thấp; tìm kiếm/lọc tồn thấp |
| Công thức BOM | http://localhost/#/inventory | Tab **Công thức**: chọn món, thêm/sửa/xóa nguyên liệu và định lượng |
| Giao dịch và lịch sử kho | http://localhost/#/inventory | Nút ghi nhận giao dịch kho; tab **Lịch sử kho** để xem nhập/xuất/điều chỉnh, số lượng, ghi chú, thời điểm |
| Bàn ăn | http://localhost/#/tables | Thêm/sửa/xóa bàn; tầng, số bàn, trạng thái AVAILABLE/SERVING; lọc theo tầng/trạng thái |
| QR một bàn | http://localhost/#/tables | Nút **Mã QR** của bàn → xem/in mã |
| QR nhiều bàn | http://localhost/#/tables | Mở **Bộ lọc & Mã QR**, chọn bàn → **In mã QR** → hộp thoại in (có thể lưu PDF) |
| Tài khoản nhân viên | http://localhost/#/staff | Tạo/sửa/xóa tài khoản, tên đăng nhập, mật khẩu, vai trò; đây không phải quản lý lương/ca làm |
| Nhật ký hoạt động | http://localhost/#/staff | Nút **Nhật ký hoạt động**: hành động, tài khoản thực hiện, đối tượng, nội dung và thời điểm |
| Đăng xuất | Trong thanh điều hướng Admin | Xóa phiên và trở lại màn hình đăng nhập |

Dashboard là số liệu tổng quan dữ liệu vận hành, chưa phải báo cáo doanh thu hoặc món bán chạy. Trang **Khu vực bếp** của Admin dùng để cấu hình khu bếp/tài khoản; màn hình KDS thao tác Nấu/Xong là phân hệ khác.

## 5. Luồng nhập dữ liệu gợi ý

1. Tạo khu bếp, sau đó tạo tài khoản bếp và gán vào khu tương ứng.
2. Tạo danh mục món và chọn khu bếp phụ trách.
3. Tạo nguyên liệu, đơn vị, tồn kho ban đầu và ngưỡng cảnh báo.
4. Tạo món ăn và cấu hình công thức BOM ở trang Kho.
5. Tạo nhóm option, các option của món; có thể đồng thời thay đổi giá và nguyên liệu.
6. Tạo combo và thêm các món con kèm số lượng.
7. Tạo bàn, tài khoản lễ tân, xem nhật ký để kiểm tra các thay đổi.

Dữ liệu có quan hệ với nhau: xóa khu bếp/danh mục/nguyên liệu đang được tham chiếu có thể bị DB từ chối. Khi kiểm tra thao tác lưu, tải lại trang và kiểm tra phản hồi API hoặc dữ liệu DB, vì bản hiện tại còn fallback local.

## 6. API Admin

Địa chỉ backend mặc định là `http://localhost:8080`. Có thể dùng cùng đường dẫn qua frontend tại `http://localhost/api/...`. Ngoại trừ đăng nhập, API Admin yêu cầu header `Authorization: Bearer <token>` với quyền `ADMIN`.

Đăng nhập bằng `POST http://localhost:8080/api/admin/auth/login`, body JSON:

```json
{"username":"admin.demo","password":"Admin@123"}
```

Lấy trường `token` trong phản hồi để gọi các API tiếp theo. `{id}`, `{foodId}`, `{comboId}` bên dưới là ID thực tế lấy từ API, không phải chuỗi gửi nguyên văn. Thông thường tạo mới trả 201, đọc/sửa trả 200, xóa trả 204; 401 là thiếu/không hợp lệ phiên, 403 là thiếu quyền.

| Method | URL đầy đủ |
|---|---|
| POST | `http://localhost:8080/api/admin/auth/login` |
| GET | `http://localhost:8080/api/admin/auth/me` |
| GET | `http://localhost:8080/api/admin/kitchen-stations` |
| GET | `http://localhost:8080/api/admin/kitchen-stations/{id}` |
| POST | `http://localhost:8080/api/admin/kitchen-stations` |
| PUT | `http://localhost:8080/api/admin/kitchen-stations/{id}` |
| DELETE | `http://localhost:8080/api/admin/kitchen-stations/{id}` |
| GET | `http://localhost:8080/api/admin/categories` |
| GET | `http://localhost:8080/api/admin/categories/{id}` |
| POST | `http://localhost:8080/api/admin/categories` |
| PUT | `http://localhost:8080/api/admin/categories/{id}` |
| DELETE | `http://localhost:8080/api/admin/categories/{id}` |
| GET | `http://localhost:8080/api/admin/foods` |
| GET | `http://localhost:8080/api/admin/foods/{id}` |
| POST | `http://localhost:8080/api/admin/foods` |
| PUT | `http://localhost:8080/api/admin/foods/{id}` |
| DELETE | `http://localhost:8080/api/admin/foods/{id}` |
| GET | `http://localhost:8080/api/admin/ingredients` |
| GET | `http://localhost:8080/api/admin/ingredients/{id}` |
| POST | `http://localhost:8080/api/admin/ingredients` |
| PUT | `http://localhost:8080/api/admin/ingredients/{id}` |
| DELETE | `http://localhost:8080/api/admin/ingredients/{id}` |
| GET | `http://localhost:8080/api/admin/foods/{foodId}/recipes` |
| POST | `http://localhost:8080/api/admin/recipes` |
| PUT | `http://localhost:8080/api/admin/recipes/{id}` |
| DELETE | `http://localhost:8080/api/admin/recipes/{id}` |
| GET | `http://localhost:8080/api/admin/stock-transactions` |
| POST | `http://localhost:8080/api/admin/stock-transactions` |
| GET | `http://localhost:8080/api/admin/option-groups` |
| GET | `http://localhost:8080/api/admin/option-groups/{id}` |
| POST | `http://localhost:8080/api/admin/option-groups` |
| PUT | `http://localhost:8080/api/admin/option-groups/{id}` |
| DELETE | `http://localhost:8080/api/admin/option-groups/{id}` |
| GET | `http://localhost:8080/api/admin/options` |
| GET | `http://localhost:8080/api/admin/options/{id}` |
| POST | `http://localhost:8080/api/admin/options` |
| PUT | `http://localhost:8080/api/admin/options/{id}` |
| DELETE | `http://localhost:8080/api/admin/options/{id}` |
| GET | `http://localhost:8080/api/admin/combos` |
| GET | `http://localhost:8080/api/admin/combos/{id}` |
| POST | `http://localhost:8080/api/admin/combos` |
| PUT | `http://localhost:8080/api/admin/combos/{id}` |
| DELETE | `http://localhost:8080/api/admin/combos/{id}` |
| GET | `http://localhost:8080/api/admin/combos/{comboId}/items` |
| POST | `http://localhost:8080/api/admin/combos/{comboId}/items` |
| DELETE | `http://localhost:8080/api/admin/combos/{comboId}/items/{foodId}` |
| GET | `http://localhost:8080/api/admin/tables` |
| GET | `http://localhost:8080/api/admin/tables/{id}` |
| POST | `http://localhost:8080/api/admin/tables` |
| PUT | `http://localhost:8080/api/admin/tables/{id}` |
| DELETE | `http://localhost:8080/api/admin/tables/{id}` |
| GET | `http://localhost:8080/api/admin/staff-accounts` |
| POST | `http://localhost:8080/api/admin/staff-accounts` |
| PUT | `http://localhost:8080/api/admin/staff-accounts/{id}` |
| DELETE | `http://localhost:8080/api/admin/staff-accounts/{id}` |
| GET | `http://localhost:8080/api/admin/kitchen-accounts` |
| POST | `http://localhost:8080/api/admin/kitchen-accounts` |
| PUT | `http://localhost:8080/api/admin/kitchen-accounts/{id}` |
| DELETE | `http://localhost:8080/api/admin/kitchen-accounts/{id}` |
| GET | `http://localhost:8080/api/admin/activity-logs` |

## 7. Phát triển và kiểm thử

Để sửa FE với hot reload: cài Node.js 22.12 trở lên (hoặc Node 24), chạy backend/MySQL bằng Docker rồi mở terminal riêng:

```sh
docker compose up --build -d mysql-db backend
cd frontend
npm ci
npm run dev
```

Mở `http://localhost:5173/`; các trang tương ứng là `http://localhost:5173/#/dashboard`, `http://localhost:5173/#/menu`... Vite chuyển `/api` sang backend `http://localhost:8080`. Nếu đổi BACKEND_PORT phải sửa đích proxy trong `frontend/vite.config.ts` cho phù hợp.

Kiểm tra frontend từ thư mục `frontend`:

```sh
npm run build
npm run test:admin
```

Bộ Postman/Newman nằm trong `tests/api`, có môi trường Docker và database thử riêng tại cổng 18080. Không dùng DB chính để chạy cả collection vì có thao tác tạo/xóa, đặt món và trừ kho.

```sh
cd tests/api
npm ci
npm run verify
```

Chạy các lệnh trên từ thư mục gốc repository (nếu đang ở `frontend`, quay về thư mục gốc trước). Kết quả được ghi ở `tests/api/results/report.md`. Hướng dẫn import vào Postman và chạy trên Mac/Windows: [tests/api/README.md](tests/api/README.md). Bộ test bao phủ 76 endpoint REST với 108 lượt gọi; PASS không đồng nghĩa đã đáp ứng mọi yêu cầu nghiệp vụ. WebSocket và toàn bộ luồng giao diện chưa được bao phủ bởi bộ này.

## 8. Các giới hạn đã xác định

- Một số màn hình Menu/Kho/Bàn/Tài khoản/Khu bếp có fallback dữ liệu mẫu hoặc thay đổi local khi API lỗi. Thông báo có chữ `(local)` không chứng minh DB đã lưu. Cần bỏ fallback này trước khi sử dụng thực tế.
- BOM hiện giả định công thức và nguyên liệu cùng đơn vị; chưa tự đổi kg/gram hoặc lít/ml như đặc tả yêu cầu.
- `ADJUST` ở BE hiện cộng lượng nhập vào tồn kho và chỉ nhận số dương. FE fallback lại hiểu là đặt tồn bằng số nhập. Chưa thống nhất nghiệp vụ kiểm kê/hao hụt.
- Giá combo `FIXED` ở BE là **giá bán cố định**; FE hiện ghi “Giảm số tiền cố định”, cần sửa nhãn để tránh nhập sai.
- QR hiện dùng dịch vụ `api.qrserver.com` và URL `${origin}/?table=<id>`. Với frontend Docker hiện tại, URL này trỏ vào ứng dụng Admin, chưa phải luồng khách gọi món hoàn chỉnh. Khi mở bằng localhost, QR cũng chứa localhost; chưa thể dùng link đó từ điện thoại khác.
- Tài khoản demo `manager.*` đang được gán quyền lễ tân; Admin/Quản lý trong đặc tả là cùng nhóm quyền.
- Báo cáo doanh thu/món bán chạy chưa triển khai đầy đủ; đặc tả xếp báo cáo vào chức năng mở rộng.
- Chức năng duyệt đơn, phục vụ, thanh toán thuộc POS/Lễ tân, không nằm trong trang Admin. Nhật ký chỉ hiển thị các hành động mà module tương ứng đã ghi.

## 9. Xử lý lỗi thường gặp

| Hiện tượng | Cách kiểm tra |
|---|---|
| Trang không mở | Kiểm tra Docker Desktop, `docker compose ps`, cổng frontend và log |
| Không đăng nhập được tài khoản demo | Kiểm tra role ADMIN, mật khẩu trong DB; seeder không thay mật khẩu thật đã tồn tại |
| API trả 401 | Đăng nhập lại và dùng token mới |
| API trả 403 | Kiểm tra tài khoản có role ADMIN; không dùng tài khoản lễ tân/bếp cho Admin |
| 404 khi mở chức năng | Dùng URL có `#/` theo bảng ở mục 4; API phải có tiền tố `/api/admin` |
| Sửa xong tải lại bị mất | Kiểm tra API có lỗi và giao diện có thông báo `(local)` hay không |
| Thay SQL mẫu nhưng DB không đổi | SQL init chỉ chạy khi volume mới; không tự xóa volume đang chứa dữ liệu cần giữ |
| QR không dẫn tới trang gọi món | Đây là hạn chế tích hợp đã nêu ở mục 8 |

## 10. Vị trí code

- `frontend/src/pages/`: các màn hình Admin.
- `frontend/src/services/adminApi.ts`: các lời gọi API; `http.ts`: token và xử lý HTTP.
- `frontend/src/router/Router.tsx`: hash routing.
- `src/main/java/com/sccgroup/restaurant_management/admin/`: controller, service, DTO, đăng nhập và phân quyền Admin.
- `src/main/java/com/sccgroup/restaurant_management/domain/`: entity, repository và nghiệp vụ dùng chung.
- `scripts/hash-admin-password.py`: tạo hash mật khẩu.
- `docker-compose.yml`, `Dockerfile`, `frontend/Dockerfile`: cấu hình chạy/build.
- `tests/api/`: collection, môi trường và bộ chạy API tự động.
