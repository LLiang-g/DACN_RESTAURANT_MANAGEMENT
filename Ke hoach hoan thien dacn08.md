# Kế hoạch hoàn thiện theo "Yêu cầu tiến độ lần 02"

**Đồ án:** DACN-08 · Nhóm 4D · Hệ thống Quản lý Nhà hàng, Gọi món không chạm & Điều phối bếp thông minh (Smart POS & Realtime KDS)
**Nguồn:** file PDF "Yêu cầu tiến độ lần 02"; hai đoạn "Yêu cầu kỹ thuật / Dặn dò" thầy gửi trong chat; `PROJECT_CONTEXT.md`; các phần code đã làm cùng nhau (POS, Customer).

> **Mức độ chắc chắn.** Phần POS mình nắm chi tiết vì cùng làm. Phần Customer đối chiếu theo code `CustomerOrderService` bạn gửi. Phần KDS và Admin chỉ dựa vào `PROJECT_CONTEXT.md`, có thể đã cũ. Chỗ nào ghi **(cần xác nhận)** là chỗ chưa có đủ thông tin về trạng thái thật, cả nhóm nên kiểm tra lại trước khi tin vào bảng này.

---

## 0. Mốc thời gian rút ra từ PDF

| Mốc | Nội dung |
|---|---|
| Tuần 09 | Buổi duyệt demo MVP (3–5 phút) + nộp **Báo cáo tiến độ lần 2** (bản thảo chương Hiện thực hóa + Kiểm thử sơ bộ) |
| Sau buổi demo Tuần 09 | **Feature Freeze**: cấm thêm tính năng mới, chỉ sửa lỗi và kiểm thử |
| Cuối Tuần 09 / đầu Tuần 10 | Deploy bản MVP lên cloud |
| Tuần 10–11 | Sửa lỗi, kiểm thử hộp đen, viết Chương 3 (Hiện thực hóa) và Chương 4 (Kiểm thử) |
| **11h30 Thứ Hai 23/11/2026** | Hạn chót nộp toàn bộ đồ án |

Hệ quả quan trọng: **mọi tính năng còn thiếu phải xong trước buổi demo Tuần 09.** Sau đó chỉ được sửa lỗi. Ngày cụ thể của Tuần 09 cần xác nhận với thầy (câu hỏi 13 ở mục 7).

---

## 1. Bảng đối chiếu nhanh

Ký hiệu: ✅ đạt · ⚠️ một phần / chưa chắc · ❌ chưa có.

| # | Yêu cầu | Hiện trạng | Mức |
|---|---|---|---|
| 1 | Migration script từ ERD | Có `Database.dbml` và `sample_database.26.10.9.sql`. Chưa rõ Hibernate đang tự tạo bảng (`ddl-auto`) hay có file DDL/Flyway tường minh **(cần xác nhận)** | ⚠️ |
| 2 | Ràng buộc PK/FK | Có qua entity JPA | ✅ |
| 3 | Index | Chưa thấy `@Index` tường minh | ⚠️ |
| 4 | Cột snapshot bất biến | `unitPrice`, `comboPrice` chốt lúc đặt. Nhưng phần trừ giá món combo bị trả đang dùng `food.getPrice()` **hiện tại** (xem B04) | ⚠️ |
| 5 | Seeding ≥10–20 bản ghi/bảng danh mục | Có SQL mẫu và `dev_reset_passwords.sql`. Chưa kiểm số bản ghi từng bảng | ⚠️ |
| 6 | Đăng nhập + JWT Bearer | Có, hết hạn sau 8 giờ | ✅ |
| 7 | **Refresh Token** | Chưa có | ❌ |
| 8 | RBAC Role/Permission | Có Role (ADMIN, RECEPTIONIST, KITCHEN). Chưa có Permission chi tiết | ⚠️ |
| 9 | API nghiệp vụ cốt lõi | Customer, POS, KDS đã có. Admin chưa thấy ghi nhận **(cần xác nhận)** | ⚠️ |
| 10 | Chống race condition | Đặt món đã khóa toàn bộ dòng `ingredient` (`findAllForUpdate`) và tính phần giữ chỗ qua `reservationService`. Bấm Nấu có khóa dòng. **`pay()`/`cancel()` chưa khóa** (B01). Chưa có test song song làm bằng chứng | ⚠️ |
| 11 | Trừ kho theo lô FIFO | Kho chỉ có một số tồn cho mỗi nguyên liệu, không có lô | ❌ (hỏi thầy, câu 2) |
| 12 | VietQR + webhook ngân hàng | Chỉ nhập tay mã giao dịch, chưa có ảnh QR, chưa có webhook | ❌ |
| 13 | Swagger UI / Postman Collection | Chưa thấy ghi nhận Swagger **(cần xác nhận)** | ❌ |
| 14 | Mã lỗi 400/401/404/409 | Có 400, 401, 404. **Chưa có 409.** Token hết hạn/sai có chỗ ghi 403 không nội dung, có chỗ ghi 401 (mâu thuẫn trong context, cần test thật) | ⚠️ |
| 15 | Frontend bám wireframe Tuần 06 | POS đã redesign theo theme riêng, chưa đối chiếu lại wireframe | ⚠️ |
| 16 | Responsive | Modal hóa đơn POS từng tràn ngang ở ~500px | ⚠️ |
| 17 | Phân quyền hiển thị theo vai trò | 4 app riêng, POS/KDS chặn sai role lúc đăng nhập. POS chưa tự đăng xuất khi 401/403 | ⚠️ |
| 18 | 3 trạng thái Loading / Success / Error | POS: chỉ có chữ "Đang tải...", lỗi dùng `alert()` hoặc `console.error`. KDS có toast lỗi | ⚠️ |
| 19 | Realtime (WebSocket) | Có ở Customer, POS, KDS. POS có toast gọi nhân viên | ✅ |
| 20 | Cảnh báo vượt ngưỡng tồn kho | Có cột `min_threshold`, chưa có giao diện | ❌ |
| 21 | Không "trạng thái ảo" khi thanh toán | Chuyển khoản vẫn tự gõ mã rồi bấm Thanh toán được | ❌ |
| 22 | CORS + `.env` | CORS đang né bằng proxy Vite xóa `Origin`. POS bỏ `.env`. Secret nhiều khả năng nằm trong `application.properties` **(cần xác nhận)** | ❌ |
| 23 | `docker compose up -d` | Chưa thấy | ❌ |
| 24 | README + `.env.example` + tài khoản demo | Chưa thấy **(cần xác nhận)** | ❌ |
| 25 | Git (branch, commit đều của từng thành viên) | Chưa biết hiện trạng **(cần xác nhận)** | ⚠️ |
| 26 | Deploy cloud | Chưa | ❌ |
| 27 | Kịch bản demo + video dự phòng | Chưa | ❌ |
| 28 | Test report + bug log | Chưa (mục 4 và 3 bên dưới là bản khởi đầu) | ❌ |

---

## 2. Việc cần làm, xếp theo ưu tiên

### P0: phải xong trước buổi demo Tuần 09 (vì sau đó là Feature Freeze)

**P0-1. Admin module** (nếu chưa ai làm, đây là rủi ro lớn nhất)
- [ ] Đăng nhập Admin, giao diện chỉ hiện chức năng của Admin.
- [ ] CRUD: danh mục, món, nhóm option/option, combo.
- [ ] CRUD nguyên liệu, công thức (BOM), nhập kho / điều chỉnh kho (ghi `StockTransaction` IMPORT/ADJUST).
- [ ] Tab **cảnh báo tồn thấp** (nguyên liệu có tồn ≤ `min_threshold`), kèm nút Nhập kho.
- [ ] CRUD bàn + sinh/in mã QR dán bàn (URL công khai của app khách, base URL lấy từ cấu hình).
- [ ] Quản lý tài khoản (staff, kitchen) và xem `activity_log`.
- Nếu thời gian không đủ, thu hẹp phạm vi tối thiểu nhưng phải hỏi thầy trước (câu 12).

**P0-2. Refresh Token**
- [ ] Access token ngắn (vd. 15–30 phút) + refresh token dài hơn, lưu DB (bảng `refresh_token`: băm token, tài khoản, hạn, đã thu hồi).
- [ ] `POST /api/auth/refresh`, nên xoay vòng (rotation) token.
- [ ] Axios interceptor ở cả 4 frontend: gặp 401 thì gọi refresh một lần rồi thử lại, thất bại thì đăng xuất.
- [ ] Cấu hình `AuthenticationEntryPoint` và `AccessDeniedHandler` trả JSON chuẩn `ErrorResponse` với 401/403, thay vì 403 trống.

**P0-3. API Contract: Swagger / Postman**
- [ ] Thêm `springdoc-openapi` (bản 2.x tương thích Spring Boot 3), khai báo Bearer security scheme.
- [ ] Mở `permitAll` cho `/swagger-ui/**`, `/v3/api-docs/**` trong `SecurityConfig` (không thì Swagger bị 403).
- [ ] Xuất Postman Collection cho các luồng chính, kèm ví dụ response 200/201/400/401/404/409.
- [ ] Thống nhất: JSON dùng camelCase (đang đúng), mọi lỗi theo `{code, message}`.

**P0-4. Mã lỗi 409**
- [ ] Thêm `ConflictException` → HTTP 409 trong `GlobalExceptionHandler` cho lỗi xung đột trạng thái: `INVOICE_ALREADY_PAID`, `TABLE_HAS_OPEN_INVOICE`, `INVOICE_HAS_COOKED_ITEMS`, `CALL_STAFF_REQUEST_ALREADY_RESOLVED`, `ORDER_ITEM_NOT_SERVABLE/RETURNABLE/UNDOABLE`.
- [ ] Giữ 400 cho lỗi dữ liệu đầu vào / quy tắc (`REJECT_REASON_REQUIRED`, `AMOUNT_RECEIVED_INSUFFICIENT`, `INVOICE_HAS_PENDING_ITEMS`).
- [ ] Hỏi thầy kỳ vọng dùng 409 cho trường hợp nào (câu 7) trước khi chốt.

**P0-5. VietQR + thanh toán không "ảo"** (hỏi thầy trước, câu 5)
- [ ] Sinh ảnh VietQR theo số tiền + nội dung chuyển khoản (vd. `DH{invoiceId}`), hiển thị trong modal hóa đơn và hóa đơn in.
- [ ] Endpoint webhook mô phỏng ngân hàng (có secret key trong header), khớp hóa đơn theo nội dung + số tiền.
- [ ] Khi webhook khớp: ghi nhận đã nhận tiền, đẩy WebSocket `/topic/pos`. Với chuyển khoản, nút Thanh toán chỉ mở khi nhận tín hiệu này.
- [ ] Tiền mặt vẫn do lễ tân xác nhận (hỏi thầy có chấp nhận, câu 5).
- [ ] Làm công cụ giả lập webhook để demo (Postman hoặc một trang nhỏ). Có thể thử dịch vụ như SePay/Casso nếu còn gói miễn phí **(cần xác nhận)**.

**P0-6. Seeding và minh chứng CSDL**
- [ ] Kiểm số bản ghi từng bảng:
  ```sql
  SELECT table_name, table_rows
  FROM information_schema.tables
  WHERE table_schema = 'smart_pos_kds'
  ORDER BY table_rows;
  ```
  (`table_rows` chỉ gần đúng với InnoDB; cần số chính xác thì dùng `COUNT(*)`.)
- [ ] Bổ sung dữ liệu cho bảng danh mục còn dưới 10 (món, option, combo, nguyên liệu, công thức, bàn, tài khoản). Bảng vốn nhỏ như `kitchen_station` thì hỏi thầy (câu 6).
- [ ] 2–3 tài khoản demo cho **mỗi vai trò** (Admin, Lễ tân, Bếp theo từng khu bếp), hash bcrypt hợp lệ (script `dev_reset_passwords.sql`).
- [ ] Chụp ảnh MySQL Workbench/DBeaver: danh sách bảng + vài bảng có dữ liệu.
- [ ] Làm rõ nguồn tạo schema: chọn **một** nguồn sự thật (Flyway/Liquibase hoặc file `schema.sql` xuất từ entity), tắt `ddl-auto=update` khi dùng migration. Hỏi thầy có bắt buộc Flyway không (câu 3).
- [ ] Rà index cho các cột tra cứu nhiều: `order_item.status`, `invoice.status`, `call_staff_request.status`, `customer_order.invoice_id`, `order_item.order_id`.

**P0-7. Kiểm chứng KDS trên MySQL thật**
- [ ] Context ghi Nấu/Xong/tự chuyển đơn "đã viết, chưa ghi nhận test". Chạy thử trọn vòng (kèm trừ kho) trước khi demo.

**P0-8. Bằng chứng chống race condition** (tuần dặn "viết mã kiểm soát ngay từ tuần này")
- [ ] Thêm `PESSIMISTIC_WRITE` cho `pay()` và `cancel()` (khóa hóa đơn theo id, giống cách `InvoiceService.getOrCreateOpenInvoice` đã làm).
- [ ] Viết test song song (JUnit + nhiều luồng): (a) hai khách đặt cùng món cuối cùng, chỉ một đơn thành công; (b) hai request thanh toán cùng một hóa đơn, chỉ một thành công.
- [ ] Cân nhắc idempotency cho gửi đơn (chống bấm đúp "Gửi đơn" tạo hai Order). Hiện chưa thấy cơ chế này.

### P1: chất lượng, nên làm trước demo nếu còn thời gian

- [ ] **Giao diện:** bộ Toast dùng chung + Skeleton loading cho POS (lấy mẫu từ toast của KDS), POS tự đăng xuất khi 401/403, kiểm responsive ở các cỡ màn hình (điện thoại cho Customer, màn hình rộng cho KDS).
- [ ] **CORS thật:** cấu hình `CorsConfig` cho đúng các origin (cổng 5173/5174/5175 và domain deploy), gồm cả endpoint SockJS `/ws`. Bỏ phụ thuộc vào mẹo xóa `Origin` của Vite.
- [ ] **`.env`:** `VITE_API_BASE_URL` cho từng frontend; backend dùng biến môi trường cho `jwt.secret`, DB URL/user/password, bí mật webhook. Không commit secret.
- [ ] **Snapshot giá combo (B04):** lưu giá bán lẻ/phần phân bổ của từng món con lúc đặt, thay vì dùng giá hiện tại khi trừ.
- [ ] **Đối chiếu giao diện với wireframe Tuần 06**, ghi lại chỗ lệch có chủ ý.
- [ ] **Múi giờ:** đặt JVM `Asia/Ho_Chi_Minh` (và `TZ` trong Docker) để đồng hồ SLA của KDS không lệch 7 giờ.

### P2: sau Feature Freeze (không thêm tính năng)

- [ ] Sửa lỗi theo bug log, kiểm thử hộp đen theo mục 4.
- [ ] Deploy cloud (mục 2.3).
- [ ] Quay video dự phòng 2–3 phút (Unlisted).
- [ ] Viết Chương 3 (chụp màn hình thật, trích đoạn code giải thuật cốt lõi) và Chương 4 (bảng Test Cases Pass/Fail).

---

## 2.1. Phần I của PDF: sáu nội dung báo cáo tiến độ lần 2

| # | Nội dung | Việc cần làm |
|---|---|---|
| 1 | Trang 1 hành chính + bảng phân công lập trình + % đóng góp (tổng 100%) | Họp nhóm điền bảng ở mục 5. Ghi rõ Lead Backend / Frontend / CSDL. Đề tài này không có vai trò AI/IoT. % nên khớp lịch sử commit |
| 2 | Minh chứng CSDL + seeding | Mục P0-6 |
| 3 | Swagger/Postman live + JSON + 200/201/400/401/409 | Mục P0-3 và P0-4 |
| 4 | Ảnh giao diện thật + một luồng End-to-End | Luồng gợi ý: Khách quét QR → gọi món/combo → Lễ tân duyệt → Bếp Nấu/Xong → Lễ tân Phục vụ → Thanh toán VietQR → In hóa đơn → Trả bàn. Chụp ảnh từng bước từ 2–3 trình duyệt |
| 5 | Bảng Test Report Pass/Fail | Mục 4 (bản khởi đầu) |
| 6 | Kế hoạch Feature Freeze + bug log | Mục 3 (bản khởi đầu). Thêm cột "Còn trong phạm vi demo?" |

## 2.2. Phần II của PDF: bàn giao

**GitHub/GitLab**
- [ ] Repo Public hoặc cấp quyền cho giảng viên `trandinhnghia`.
- [ ] Branch chuẩn `main`, `develop`, `feature/*`. Cấm commit thẳng `main`, làm Pull Request để review.
- [ ] Commit history thể hiện từng thành viên qua từng tuần, không nộp `.zip`, không commit dồn phút chót. Kiểm tra ngay xem mỗi người đã có commit chưa (câu 10).
- [ ] Rà lịch sử Git xem có lộ `jwt.secret`/mật khẩu DB không. Nếu có, đổi secret.

**README.md** (bắt buộc có)
- [ ] Mô tả đề tài + sơ đồ kiến trúc (4 frontend, backend, MySQL, WebSocket).
- [ ] Bảng công nghệ và phiên bản: Java 21, Spring Boot 3.4.5, Gradle (Kotlin DSL), MySQL (bản nào, cần xác nhận), Node (cần xác nhận), React/Vite (cần xác nhận).
- [ ] Hướng dẫn thiết lập từng bước.
- [ ] `.env.example` cho backend và từng frontend.
- [ ] Tài khoản demo: 2–3 cặp cho mỗi vai trò (Admin, Lễ tân, Bếp). App khách không đăng nhập nên cung cấp link QR từng bàn, hỏi thầy có chấp nhận không (câu 6).

**Docker Compose** (`docker compose up -d` chạy được toàn hệ thống)
- [ ] `Dockerfile` backend nhiều giai đoạn (build Gradle Kotlin DSL, chạy Java 21).
- [ ] Service `mysql` + script khởi tạo trong `/docker-entrypoint-initdb.d` (schema rồi seed). Chọn một nguồn tạo bảng, không để Hibernate và script cùng tạo.
- [ ] Service backend đọc cấu hình từ biến môi trường, `TZ=Asia/Ho_Chi_Minh`, `depends_on` kèm healthcheck của MySQL.
- [ ] Frontend: build tĩnh rồi phục vụ bằng nginx (4 cổng hoặc một nginx nhiều đường dẫn), nginx proxy `/api` và `/ws` sang backend (nhớ cấu hình nâng cấp WebSocket).
- [ ] Không cần Redis/MQTT vì đề tài không dùng. Hỏi thầy xem Redis có bắt buộc không (câu 4).
- [ ] Thử trên một máy sạch: `git clone` rồi `docker compose up -d` rồi đăng nhập bằng tài khoản demo.

**2.3. Triển khai cloud** (Cuối Tuần 09 / đầu Tuần 10)
- [ ] Frontend: 4 project riêng trên Vercel hoặc Netlify (mỗi project trỏ một thư mục con). Có thể làm thêm một trang đích liệt kê 4 link + tài khoản demo.
- [ ] Backend: Render (cần Dockerfile, **cần kiểm tra Render free có chạy Docker/Java không**). Gói free tự ngủ sau 15 phút, lần đầu truy cập chờ ~1 phút, ghi chú này trên trang đích và mở trước khi demo.
- [ ] Database: MySQL trên Aiven (hoặc TiDB Cloud, nhưng project dùng nhiều `PESSIMISTIC_WRITE` nên cần kiểm tra khác biệt khóa). Không dùng Postgres miễn phí của Render (hết hạn 30 ngày).
- [ ] Frontend gọi API bằng URL tuyệt đối từ `.env`, backend cấu hình CORS cho domain frontend, dùng HTTPS/WSS (tránh mixed content), đặt múi giờ JVM, chạy seed lên DB cloud.
- [ ] Mã QR dán bàn trỏ đúng URL công khai của app khách.

**Demo + video**
- [ ] Kịch bản 3–5 phút (bản nháp ở mục 6), phân công 1 người thao tác, 1 người thuyết minh.
- [ ] Chuẩn bị 2 tài khoản ở 2 trình duyệt ẩn danh khác nhau để diễn tập tương tác realtime.
- [ ] Video dự phòng 2–3 phút, đăng Unlisted trên YouTube/Google Drive.
- [ ] Dữ liệu hiển thị phải truy vấn từ DB thật, không có mock tĩnh.

---

## 3. Bug log khởi đầu (từ những gì đã biết)

| ID | Mô tả | Mức | Trạng thái |
|---|---|---|---|
| B01 | `pay()`/`cancel()` thiếu khóa `PESSIMISTIC_WRITE`, hai request đồng thời có thể ghi đè nhau | Trung bình | Mở |
| B02 | Chưa có Refresh Token, token 8 giờ hết hạn thì phải đăng nhập lại | Cao (yêu cầu thầy) | Mở |
| B03 | Kênh WebSocket `/ws` chưa kiểm JWT, ai cũng đăng ký được `/topic/*` | Trung bình | Mở (đã ghi trong backlog) |
| B04 | Khấu trừ combo khi trả món dùng giá bán lẻ **hiện tại** (`food.getPrice()`), giá menu đổi sau này làm hóa đơn cũ tính lại khác. Không đúng tinh thần snapshot bất biến | Trung bình | Mở, hướng sửa: lưu phần giá phân bổ lúc đặt |
| B05 | POS không tự đăng xuất khi 401/403; lỗi `refresh()` chỉ `console.error`, người dùng không biết | Thấp–TB | Mở |
| B06 | Modal hóa đơn tràn ngang trên màn hình hẹp | Thấp | Đã gửi CSS, cần xác nhận đã áp dụng |
| B07 | `BusinessException` luôn trả 400, chưa có 409 | TB (yêu cầu thầy) | Mở |
| B08 | Token sai/hết hạn: context ghi cả 401 lẫn 403 (không nội dung), hành vi thật chưa kiểm | TB | Cần test |
| B09 | KDS Nấu/Xong/tự chuyển đơn chưa ghi nhận đã test trên MySQL thật | Cao nếu chưa test | Cần xác nhận |
| B10 | Ghi chú của khách cho từng món chưa có chỗ lưu (`OrderItem.note` đang dùng cho lý do từ chối/trả) | Thấp | Hạn chế đã biết |
| B11 | Đơn vị kho và đơn vị công thức không quy đổi | Thấp | Lệch đặc tả có chủ ý, đã ghi nhận |
| B12 | Chưa có giao diện cảnh báo tồn thấp (`min_threshold`) | TB | Gộp vào Admin |
| B13 | CORS đang né bằng proxy Vite xóa `Origin`, sẽ vỡ khi deploy | Cao khi deploy | Mở |
| B14 | `.env` chưa tách, secret có thể nằm trong `application.properties` | TB | Cần xác nhận |
| B15 | Múi giờ server khi deploy làm lệch SLA của KDS và giờ hiển thị 7 giờ | Cao khi deploy | Mở |
| B16 | Báo cáo Phần 6 (artifact) chưa cập nhật các mã lỗi mới | Thấp | Mở |

---

## 4. Test cases khởi đầu (chưa chạy: ghi ☐ cho đến khi thử thật, rồi đổi thành Pass/Fail)

| ID | Nhóm | Kịch bản | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|
| TC01 | Đăng nhập | Đúng tài khoản Lễ tân | 200 + JWT, vào POS | ☐ |
| TC02 | Đăng nhập | Sai mật khẩu | 401, thông báo chung "Sai tài khoản hoặc mật khẩu" | ☐ |
| TC03 | Phân quyền | Tài khoản Bếp đăng nhập vào POS | Bị chặn ở giao diện, gọi `/api/pos/**` bằng token Bếp trả 403 | ☐ |
| TC04 | Phân quyền | Gọi `/api/pos/**` không có token | 401 hoặc 403 (xác định hành vi thật) | ☐ |
| TC05 | Token | Token hết hạn khi đang dùng | Tự refresh hoặc đăng xuất về trang đăng nhập | ☐ |
| TC06 | Đặt món | Gửi đơn hợp lệ (món lẻ + combo) | 201, Order mới ở PENDING, POS nhận realtime | ☐ |
| TC07 | Đặt món | Số lượng 0, âm, hoặc 100 | 400, thông báo từ 1 đến 99 | ☐ |
| TC08 | Đặt món | Bỏ trống nhóm option bắt buộc (SINGLE_CHOICE) | 400, báo phải chọn | ☐ |
| TC09 | Đặt món | Món hết nguyên liệu | 400, "tạm hết" | ☐ |
| TC10 | Đồng thời | Hai khách đặt cùng món cuối cùng cùng lúc | Chỉ một đơn thành công | ☐ |
| TC11 | Đặt món | Bấm "Gửi đơn" hai lần liên tiếp | Chỉ một Order được tạo | ☐ |
| TC12 | Duyệt | Từ chối món không nhập lý do | 400 `REJECT_REASON_REQUIRED` | ☐ |
| TC13 | Duyệt | Duyệt món đã duyệt rồi | Lỗi xung đột (409 sau khi sửa) | ☐ |
| TC14 | Bếp | Bấm Nấu khi thiếu nguyên liệu | Lỗi "Không đủ nguyên liệu", món vẫn CONFIRMED, kho không đổi | ☐ |
| TC15 | Bếp | Bấm Nấu rồi Xong | Kho trừ đúng theo BOM, có dòng `StockTransaction` EXPORT, POS thấy DONE | ☐ |
| TC16 | Thanh toán | Thanh toán khi còn món PENDING | 400 `INVOICE_HAS_PENDING_ITEMS` | ☐ |
| TC17 | Thanh toán | Tiền mặt khách đưa thiếu | 400 `AMOUNT_RECEIVED_INSUFFICIENT` | ☐ |
| TC18 | Thanh toán | Thanh toán lại hóa đơn đã PAID | Lỗi xung đột `INVOICE_ALREADY_PAID` | ☐ |
| TC19 | Thanh toán | Hai request thanh toán đồng thời | Chỉ một thành công | ☐ |
| TC20 | Thanh toán | Chuyển khoản khi chưa nhận webhook | Nút Thanh toán bị khóa | ☐ |
| TC21 | Hủy hóa đơn | Hủy khi chỉ có món PENDING/CONFIRMED | Món thành REJECTED, bàn tự về Trống, bếp gỡ món khỏi màn hình | ☐ |
| TC22 | Hủy hóa đơn | Hủy khi có món COOKING/DONE/SERVED | Bị chặn `INVOICE_HAS_COOKED_ITEMS` | ☐ |
| TC23 | Combo | Trả một món trong combo rồi Hoàn tác | Giá combo giảm đúng giá món rồi cộng lại đúng như cũ | ☐ |
| TC24 | Combo | Từ chối toàn bộ món trong combo | Giá combo về 0 | ☐ |
| TC25 | Bàn | Đưa bàn về Trống khi hóa đơn còn OPEN | Bị chặn `TABLE_HAS_OPEN_INVOICE` | ☐ |
| TC26 | Bàn | Hóa đơn PAID, mọi món SERVED | Bàn **không** tự về Trống, phải lễ tân bấm tay | ☐ |
| TC27 | Gọi NV | Khách bấm Gọi nhân viên nhiều lần | Chỉ một yêu cầu PENDING, POS hiện toast một lần | ☐ |
| TC28 | Gọi NV | Hai lễ tân cùng bấm "Đã xử lý" | Lần hai báo đã xử lý, không ghi đè | ☐ |
| TC29 | Mạng | Ngắt mạng khi đang gửi đơn/thanh toán | Giao diện báo lỗi rõ ràng, không báo thành công giả, dữ liệu không nhân đôi | ☐ |
| TC30 | Realtime | WebSocket rớt rồi kết nối lại | Tự nối lại, dữ liệu đồng bộ lại | ☐ |
| TC31 | Kho | Admin nhập kho/điều chỉnh | Tồn đổi đúng, cảnh báo tồn thấp cập nhật | ☐ |

Nên chuyển TC10, TC11, TC19 thành test tự động (JUnit, nhiều luồng) để có bằng chứng cho phần concurrency.

---

## 5. Mẫu bảng phân công + % đóng góp (điền khi họp nhóm)

| Thành viên | Vai trò | Phần phụ trách | % đóng góp |
|---|---|---|---|
| (điền) | Lead Backend | | |
| (điền) | Frontend | Customer (theo context: son) | |
| (điền) | Frontend / Backend | KDS (theo context: Liang) | |
| Khanh | Frontend / Backend | POS (Lễ tân) | |
| (điền) | CSDL / Admin | | |
| **Tổng** | | | **100%** |

Cột phụ trách là suy từ `PROJECT_CONTEXT.md` và phiên làm việc này, cần nhóm xác nhận lại.

---

## 6. Kịch bản demo nháp (khoảng 4,5 phút)

**Vai trò:** A thao tác, B thuyết minh. **Cửa sổ:** (1) điện thoại hoặc cửa sổ ẩn danh cho Khách; (2) POS Lễ tân; (3) KDS Bếp; (4) Admin (nếu đã có).

| Thời điểm | Thao tác | Điểm nhấn khi thuyết minh |
|---|---|---|
| 0:00 | Giới thiệu hệ thống + sơ đồ kiến trúc | 4 phân hệ, một backend, MySQL, WebSocket |
| 0:20 | Khách quét QR bàn, xem menu ("còn N suất"), chọn món + combo, gửi đơn | Giá chốt tại server, kiểm tra kho lúc đặt |
| 0:50 | POS nhận đơn realtime (badge), duyệt | Duyệt trước khi xuống bếp |
| 1:20 | KDS nhận món, bấm Nấu rồi Xong | Trừ kho theo BOM, ghi `StockTransaction` |
| 2:00 | Khách thấy trạng thái cập nhật, bấm Gọi nhân viên | POS hiện toast thời gian thực |
| 2:30 | POS: Phục vụ món, trả một món trong combo | Giá combo trừ đúng phần món bị trả |
| 3:10 | Thanh toán (QR/webhook hoặc tiền mặt), in hóa đơn | Thanh toán chỉ mở khi có tín hiệu khớp tiền |
| 3:50 | Đưa bàn về Trống; Admin xem cảnh báo tồn thấp | Vòng đời bàn, kho |
| 4:20 | Ca ngoại lệ ngắn: thanh toán khi còn món chờ duyệt bị chặn, hoặc sai mật khẩu | Xử lý lỗi nghiệp vụ |

Đã chuẩn bị sẵn: dữ liệu mẫu sạch, tài khoản demo, backend đã "đánh thức" (nếu chạy Render free).

---

## 7. Những điều còn mông lung, nên hỏi thầy

Mỗi câu kèm lý do và **phương án tạm thời nếu thầy chưa trả lời**, để nhóm không bị chặn việc.

1. **Đề tài Nhà hàng có "End-to-End User Story" và "module chuyên biệt" tương đương là gì?** PDF chỉ nêu ví dụ cho EMR, Sự kiện, IoT. *Tạm thời:* luồng Khách đặt → Lễ tân duyệt → Bếp nấu trừ kho → Thanh toán VietQR → Trả bàn; module chuyên biệt là VietQR + webhook (và mã QR bàn).
2. **"Trừ kho theo lô FIFO" và "Redis Lock" có áp dụng cho nhà hàng không?** Kho hiện chỉ có một số tồn mỗi nguyên liệu và chống tranh chấp bằng khóa DB (`PESSIMISTIC_WRITE`), không dùng Redis. *Tạm thời:* giữ cách khóa DB, chuẩn bị test song song làm bằng chứng.
3. **Migration có bắt buộc dùng công cụ (Flyway/Liquibase) không, hay file SQL DDL + seed là đủ?** *Tạm thời:* xuất schema ra file SQL tường minh, dùng chung cho Docker.
4. **Docker Compose có cần Redis không** (khi đề tài không dùng Redis)? Compose có phải gồm cả 4 frontend không, hay chỉ backend + DB? *Tạm thời:* gồm cả backend, DB và 4 frontend (nginx).
5. **Thanh toán:** (a) thầy chấp nhận webhook ngân hàng **mô phỏng** (endpoint giả lập + công cụ gọi) hay yêu cầu tích hợp thật (SePay/Casso...)? (b) "Nút thanh toán chỉ mở khóa khi có webhook" có áp dụng cho tiền mặt không, hay lễ tân xác nhận tay là hợp lệ? *Tạm thời:* webhook mô phỏng cho chuyển khoản, tiền mặt do lễ tân xác nhận.
6. **Seeding:** "10–20 bản ghi mỗi bảng danh mục" có áp dụng cả bảng vốn nhỏ như khu bếp (`kitchen_station`) không? Bảng giao dịch (đơn, hóa đơn) có cần dữ liệu mẫu không? Khách không đăng nhập thì "tài khoản demo vai trò Khách hàng" có thể thay bằng link QR từng bàn không? *Tạm thời:* tối thiểu 10 bản ghi ở các bảng danh mục chính, giải thích riêng bảng nhỏ; QR bàn thay cho tài khoản khách.
7. **Mã lỗi:** thầy kỳ vọng 409 cho những trường hợp nào, và 401 vs 403 khi token hết hạn? *Tạm thời:* 409 cho xung đột trạng thái, 400 cho dữ liệu không hợp lệ, 401 khi thiếu/hết hạn token, 403 khi sai quyền.
8. **Refresh Token và Permission:** Refresh Token có bắt buộc không? "Role/Permission" thì 3 role cố định có đủ không hay cần bảng permission? *Tạm thời:* làm Refresh Token, giữ 3 role.
9. **"Phân quyền hiển thị theo vai trò":** 4 ứng dụng frontend riêng (mỗi vai trò một app) có được xem là đáp ứng không, hay thầy muốn một app duy nhất đa vai trò? *Tạm thời:* giữ 4 app.
10. **Git:** dự án đã chạy nhiều tuần mà lịch sử commit có thể chưa đều giữa các thành viên, thầy đánh giá thế nào và nhóm nên làm gì từ bây giờ (một repo monorepo hay nhiều repo)? *Tạm thời:* một repo, bắt đầu theo branch chuẩn ngay.
11. **Test report:** tối thiểu bao nhiêu test case? Test tự động (JUnit) là bắt buộc hay điểm cộng? *Tạm thời:* ~30 test case thủ công + vài test song song tự động.
12. **Phạm vi Feature Freeze:** "phạm vi đã đăng ký" là theo bản Đặc tả chức năng DACN-08. Admin cần ở mức nào cho MVP, và các điều chỉnh nghiệp vụ nhóm đã thêm (quy tắc hủy hóa đơn, hoàn tác trả món, in hóa đơn) có tính là "tính năng mới" không? *Tạm thời:* làm Admin tối thiểu trước Tuần 09, không thêm gì mới sau đó.
13. **Lịch:** ngày cụ thể của buổi demo Tuần 09, hạn nộp Báo cáo tiến độ lần 2 và định dạng nộp (PDF hay Docs)? Hạn 23/11 11h30 là hạn nộp toàn bộ đồ án hay hạn của Tuần 10?
14. **Triển khai cloud:** việc deploy là "khuyến khích" nhưng có tính điểm không? Backend chạy qua Render free (có thể ngủ 15 phút), thầy chấp nhận lần truy cập đầu phải chờ không? 4 frontend 4 URL có ổn không? *Tạm thời:* deploy đủ, ghi chú chờ ~1 phút trên trang đích.
15. **Tỷ lệ % đóng góp** tính theo commit, theo khối lượng công việc, hay theo bảng phân công? Đề tài này không có vai trò AI/IoT nên ghi vai trò như thế nào?

---

## 8. Tài liệu nội bộ cần cập nhật

- **`PROJECT_CONTEXT.md`**:
    - Mục 14.1 "Giữ chỗ nguyên liệu" đang ghi "việc để sau", nhưng code đặt món đã có khóa kho + tính phần giữ chỗ qua `reservationService`, cập nhật cho khớp.
    - Mục 11: thanh toán bất kỳ lúc nào (chỉ chặn khi còn món PENDING), combo vẫn tính tiền khi có món con bị trả/từ chối (trừ giá bán lẻ phần đó, sàn ở 0), bàn chỉ tự về Trống khi hóa đơn `CANCELLED` (hóa đơn `PAID` luôn do lễ tân bấm tay).
    - Hủy hóa đơn chỉ khi mọi món đang PENDING/CONFIRMED/REJECTED; khi hủy, món chưa nấu tự chuyển REJECTED và bếp được báo gỡ món.
    - Thêm hoàn tác trả món (RETURNED → SERVED), nút Phục vụ/Trả món/Hoàn tác (cả món lẻ và món trong combo), in hóa đơn (`window.print()`), `InvoiceDetailResponse` có thêm thông tin thanh toán.
    - `LoginResponse` thật là `{token, accountType, role, stationId, stationName}`, không có `username`.
- **Báo cáo Phần 6 (artifact):** bảng mã lỗi thêm `INVOICE_HAS_PENDING_ITEMS`, `INVOICE_HAS_COOKED_ITEMS`, `TABLE_HAS_OPEN_INVOICE`, `CALL_STAFF_REQUEST_ALREADY_RESOLVED`, `ORDER_ITEM_NOT_SERVABLE/RETURNABLE/UNDOABLE`.

---

## 9. Checklist nộp bài cuối

- [ ] Repo GitHub (quyền cho `trandinhnghia`) + README đầy đủ + `.env.example`
- [ ] `docker compose up -d` chạy thành công trên máy sạch, có seed
- [ ] Link 4 frontend + backend chạy trên cloud, tài khoản demo hoạt động
- [ ] Swagger UI/Postman Collection
- [ ] Báo cáo (Chương 3, Chương 4, bug log, test report) có ảnh chụp thật
- [ ] Video dự phòng 2–3 phút (Unlisted)
- [ ] Kịch bản demo đã diễn tập 2 lần với 2 trình duyệt ẩn danh
- [ ] Nộp trước **11h30 Thứ Hai 23/11/2026**