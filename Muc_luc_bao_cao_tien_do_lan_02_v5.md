# MỤC LỤC CHI TIẾT – BÁO CÁO TIẾN ĐỘ LẦN 02 (TUẦN 09)

**Tên tài liệu:** Báo cáo tiến độ lần 02 – Hiện thực hóa hệ thống và Kiểm thử sơ bộ
**Đề tài:** Hệ thống Quản lý Nhà hàng, Gọi món không chạm & Điều phối bếp thông minh (Smart POS & KDS)
**Học phần:** Đồ án chuyên ngành – Mã 841476 – Nhóm/lớp 03 · **Nhóm:** 262701-DACN-08-Nhom4D · **GVHD:** ThS. Trần Đình Nghĩa
**Kế thừa:** Báo cáo tiến độ lần 01 (Tuần 06) gồm Phần 1–6: yêu cầu, BFD/BPMN, Use Case, Sequence, ERD, API & UI
**Phiên bản mục lục:** v5 – 03/11/2026 – đối chiếu mã nguồn `origin/zankhanh` commit `fed39cc`

---

## 0. HƯỚNG DẪN SỬ DỤNG MỤC LỤC

### 0.1 Căn cứ xây dựng

| Ký hiệu | Nguồn yêu cầu | Nội dung chính |
|---|---|---|
| `[PDF]` | Văn bản “Yêu cầu tiến độ lần 02” | 6 nội dung trọng tâm (Phần I) + 4 kênh nghiệm thu, demo, video (Phần II) |
| `[T6-7]` | Yêu cầu kỹ thuật Tuần 06–07 | Migration DDL, khóa, Index, cột Snapshot; Seeding 10–20 bản ghi; JWT + Refresh Token, RBAC theo UC01–UC02; Core Business Logic; API Contract First; Concurrency & Idempotency; kỷ luật Git |
| `[T8-9]` | Yêu cầu kỹ thuật Tuần 08–09 | UI bám Wireframe, Responsive, phân quyền hiển thị; Loading Skeleton – Success – Error; WebSocket realtime; triệt tiêu “trạng thái ảo”; CORS và `.env`; ưu tiên luồng xương sống |
| `[T9]` | Yêu cầu buổi báo cáo Tuần 09 | E2E không crash, không Mock Data; Demo Script 3–5 phút, 2 tài khoản ở 2 trình duyệt ẩn danh; Feature Freeze; Black-box theo UC; ca biên và ngoại lệ |
| `[BC1]` | Báo cáo tiến độ lần 01 | Mục được dẫn chiếu lại, không chép lại |

### 0.2 Ký hiệu trong mục lục

- Minh chứng: 📷 ảnh chụp · 📊 bảng · 💻 trích code/SQL/JSON · 🎬 video
- Trạng thái so với mã nguồn:
  - 🟢 đã có, chỉ cần chụp minh chứng
  - 🟡 có nhưng còn lỗi hoặc thiếu một phần (mã lỗi tra trong `Bug_log_tuan_09.md`)
  - 🔴 chưa có, phải bổ sung trước Feature Freeze hoặc ghi vào mục 8.3.3 (chức năng hoãn)

### 0.3 Quy cách trình bày (theo chuẩn báo cáo học thuật)

- Khổ A4; lề trái 3 cm, lề phải 2 cm, trên và dưới 2,5 cm; Times New Roman 13; giãn dòng 1,3; căn đều hai bên
- Tiêu đề tối đa 3 cấp đánh số (`x.y.z`); cấp thấp hơn dùng a), b), c)
- Đánh số trang: phần đầu dùng số La Mã (i, ii, iii…), từ Chương 1 dùng số Ả Rập
- Hình và bảng đánh số theo chương (Hình 3.2, Bảng 4.5); tên bảng đặt **trên** bảng, tên hình đặt **dưới** hình; mỗi hình/bảng đều được nhắc đến trong văn bản
- Ảnh chụp màn hình phải thấy URL hoặc tiêu đề cửa sổ và thời điểm; ảnh CSDL thấy tên schema `smart_pos_kds`
- Đoạn code chỉ trích phần cốt lõi (≤ 40 dòng/đoạn), ghi rõ `đường dẫn file:dòng`; không dán toàn bộ file
- Không đưa mật khẩu thật, khóa bí mật, JWT vào báo cáo
- Tài liệu tham khảo theo chuẩn IEEE, trích dẫn dạng [1], [2]

---

## PHẦN ĐẦU

- Trang bìa chính
- Trang bìa phụ
- Biên bản đánh giá tiến độ: điền đủ MSSV, họ tên, % cá nhân, điểm tự chấm cho **5/5 thành viên** `[PDF]` 🔴
- Nhận xét của giảng viên hướng dẫn
- Lời cam đoan
- Lời cảm ơn
- Tóm tắt báo cáo (≤ 1 trang: mục tiêu đợt, kết quả, số liệu kiểm thử, việc còn lại)
- Mục lục
- Danh mục hình ảnh
- Danh mục bảng biểu
- Danh mục từ viết tắt và thuật ngữ (POS, KDS, BOM, SLA, FR, NFR, BR, UC, JWT, RBAC, DTO, CRUD, STOMP, IPN, E2E, MVP, CORS, ACID)

---

## CHƯƠNG 1. TỔNG QUAN ĐỢT BÁO CÁO TIẾN ĐỘ LẦN 02

### 1.1 Bối cảnh và mục tiêu
- 1.1.1 Tóm tắt kết quả Báo cáo lần 01 (dẫn chiếu `[BC1]` Phần 1–6)
- 1.1.2 Mục tiêu đợt 02: hiện thực hóa CSDL, Backend, Frontend, tích hợp realtime, chạy được MVP, kiểm thử sơ bộ `[PDF]`
- 1.1.3 Phạm vi: không lặp lại sơ đồ tuần 06; chỉ trình bày phần đã hiện thực và minh chứng

### 1.2 Tóm tắt kết quả đạt được
- 1.2.1 Bảng số liệu tổng quan 📊: 4 giao diện web, 9 nhóm API, 21 bảng CSDL, 110 request Postman, 26 unit test, Docker Compose 1 lệnh
- 1.2.2 Mức độ hoàn thành theo phân hệ (biểu đồ cột, chi tiết ở 8.1)

### 1.3 Đối chiếu kế hoạch 12 tuần và thực tế
- 1.3.1 Bảng kế hoạch tuần 06 (`[BC1]` mục 1.9.2) so với thực tế tuần 06–09 📊
- 1.3.2 Hạng mục vượt/chậm tiến độ, nguyên nhân, điều chỉnh

### 1.4 Cấu trúc báo cáo
- Mô tả ngắn nội dung Chương 2 → Chương 9 và các phụ lục

---

## CHƯƠNG 2. TỔ CHỨC NHÓM VÀ PHÂN CÔNG GIAI ĐOẠN LẬP TRÌNH
*`[PDF]` Nội dung 1 · `[T6-7]` Kỷ luật Git*

### 2.1 Cơ cấu vai trò kỹ thuật 📊
- 2.1.1 Vai trò: Lead Backend, Lead Frontend, Lead CSDL, Tester/QA, DevOps (Docker/Cloud), phụ trách tài liệu
- 2.1.2 Phân công theo phân hệ: Customer, POS, KDS, Admin, Payment, hạ tầng chung

### 2.2 Bảng phân công chi tiết 📊
- 2.2.1 Thành viên – vai trò – module/thư mục phụ trách – công việc – trạng thái
- 2.2.2 Công việc theo tuần 06, 07, 08, 09

### 2.3 Tỷ lệ đóng góp thực tế 📊
- 2.3.1 Bảng % đóng góp (tổng = 100%) và tiêu chí đánh giá (khối lượng code, tài liệu, kiểm thử)
- 2.3.2 Đối chiếu thống kê commit/Contributors trên GitHub 📷 🟡
  > Thống kê hiện tại: một thành viên (`hnnnhu`) chưa có commit; có tên tác giả trùng (`kieunam`/“Kiều Hoài Nam”, `LuyenThienMaTon`/`thanhson`). Cần bổ sung commit hoặc giải thích, và gộp tên bằng `.mailmap`.

### 2.4 Quy trình phát triển và kỷ luật Git `[T6-7]`
- 2.4.1 Mô hình nhánh: `main` (chỉ có Initial commit, không commit thẳng), nhánh tích hợp `zankhanh`, nhánh cá nhân (`luong`, `nam_merge`, `son`, `an`, `nhu`) 📷 🟡
  > Yêu cầu là `main` – `develop` – `feature/*`. Cần chuẩn hóa (đổi/thêm `develop`, `feature/auth`, `feature/order`…) hoặc giải thích mô hình đang dùng.
- 2.4.2 Quy ước commit message, Pull Request, review trước khi merge
- 2.4.3 Network graph, lịch sử merge, minh chứng không nộp hộ 📷
- 2.4.4 Sự cố merge làm mất frontend customer (commit `e7857e0`) và quy trình khắc phục (`fed39cc`); bài học về quy trình merge 📊

---

## CHƯƠNG 3. HIỆN THỰC HÓA CƠ SỞ DỮ LIỆU
*`[PDF]` Nội dung 2 · `[T6-7]` Migration, khóa, Index, Snapshot, Seeding*

### 3.1 Môi trường và công cụ
- 3.1.1 MySQL 8.0 (InnoDB, utf8mb4) chạy trong Docker, cổng ngoài 3307 🟢
- 3.1.2 Công cụ quản trị: MySQL Workbench / DBeaver

### 3.2 Chuyển hóa ERD sang lược đồ vật lý (Migration)
- 3.2.1 Phương pháp: script DDL `database/init/sample_database.26.10.11.sql` nạp qua `docker-entrypoint-initdb.d` 🟢; Hibernate `ddl-auto=update` bổ sung cột/bảng mới 🟡 💻
- 3.2.2 Quy trình phiên bản hóa script (`init/` – `archive/`, quy ước tên file) và nạp lại CSDL (`docker compose down -v`) 🟢
- 3.2.3 Đề xuất chuyển sang Flyway để quản lý phiên bản migration 🔴
- 3.2.4 Minh chứng danh sách 21 bảng đã tạo 📷
- 3.2.5 Minh chứng cấu trúc các bảng trọng tâm: `order_item`, `invoice`, `customer_order`, `ingredient`, `recipe`, `food_option`, `payment_transaction`, `activity_log` 📷
- 3.2.6 ERD sinh ngược từ CSDL thật và đối chiếu ERD tuần 06 (`[BC1]` Hình 5.1) 📷📊
  > Khác biệt: thêm `payment_transaction`; thêm `activity_log.actor_name`, `target_name`; kiểu `DECIMAL(10,2)` thay vì `DECIMAL(12,3)` cho định lượng.

### 3.3 Ràng buộc toàn vẹn và chỉ mục `[T6-7]`
- 3.3.1 Khóa chính, khóa ngoại, UNIQUE (`(floor, table_number)`, `txn_ref`), NOT NULL, ENUM 📊 🟢
- 3.3.2 Chỉ mục (Index): chỉ mục khóa ngoại sẵn có + chỉ mục bổ sung cho truy vấn nóng (`order_item(status)`, `invoice(table_id, status)`, `customer_order(created_at)`) và lý do 💻 🔴

### 3.4 Cột Snapshot bất biến `[T6-7]`
- 3.4.1 Danh sách cột chốt giá tại thời điểm giao dịch: `order_item.unit_price` (đã gồm phụ thu Option), `order_combo.combo_price` 📊 🟢
- 3.4.2 Minh chứng: đổi giá món trên Admin → hóa đơn cũ giữ nguyên 📷💻
- 3.4.3 Giới hạn hiện tại: tổng hóa đơn không lưu; combo có món con bị hủy dùng giá hiện tại 🟡 (bug D-11)

### 3.5 Nạp dữ liệu mẫu (Database Seeding) `[T6-7]` `[PDF]`
- 3.5.1 Chiến lược: script SQL tự nạp khi khởi tạo container + `DemoAccountSeeder` tạo tài khoản demo khi backend khởi động 💻 🟢
- 3.5.2 Tài khoản demo theo vai trò (2–3 tài khoản mỗi vai trò) 📊 🟡 (bug A-10)
- 3.5.3 Dữ liệu danh mục: khu bếp, danh mục, món ăn, nhóm Option, Option, Combo 📷📊 🟡
  > Cần nâng lên ≥ 10 bản ghi: `kitchen_station` (3), `category` (7), `option_group` (3), `combo` (5), `staff_account` (3), `kitchen_account` (3).
- 3.5.4 Dữ liệu kho: nguyên liệu (60), công thức BOM (422), giao dịch kho (100) 📷📊 🟢
- 3.5.5 Dữ liệu bàn và tầng (60) 📷 🟢
- 3.5.6 Dữ liệu giao dịch mẫu: hóa đơn, order, gọi nhân viên; script `kds_seed_orders.sql` 📷 🟢
- 3.5.7 Bảng thống kê số bản ghi từng bảng (`SELECT COUNT(*)`) 📊💻

### 3.6 Truy vấn kiểm chứng
- 3.6.1 Tồn kho so với ngưỡng; lịch sử nhập/xuất theo nguyên liệu 💻📷
- 3.6.2 Doanh thu theo ngày, món bán chạy (SQL) 💻📷

---

## CHƯƠNG 4. HIỆN THỰC HÓA CORE BACKEND VÀ HỢP ĐỒNG API
*`[PDF]` Nội dung 3 · `[T6-7]` Auth & RBAC, Core Business Logic, API Contract First, Concurrency & Idempotency*

### 4.1 Kiến trúc Backend đã hiện thực
- 4.1.1 Sơ đồ triển khai: 4 frontend (Nginx) → REST `/api/**` + STOMP `/ws` → Spring Boot 3.4.5 (Java 21) → MySQL; VNPay gọi IPN qua URL công khai 📷
- 4.1.2 Tổ chức mã nguồn theo phân hệ: `common`, `config`, `domain`, `customer`, `pos`, `kds`, `payment`, `admin` 💻 🟢
- 4.1.3 Phân tầng Controller → Service → Repository, quy ước DTO, xử lý ngoại lệ tập trung

### 4.2 Hợp đồng API (API Contract First) `[T6-7]`
- 4.2.1 Quy ước đặt tên: tiền tố theo phân hệ, danh từ số nhiều, `camelCase`, ID kiểu `Long` 📊
- 4.2.2 Kiểu dữ liệu: tiền và định lượng `BigDecimal`, ngày giờ ISO-8601 (múi giờ `Asia/Ho_Chi_Minh`), enum dạng chuỗi 📊
- 4.2.3 Định dạng lỗi thống nhất `ErrorResponse {code, message}` 💻 🟢
- 4.2.4 Bảng mã HTTP: 200, 201, 204, 400, 401, 403, 404, 409, 500 và nguồn phát sinh 📊 🟡 (bug B-02)
- 4.2.5 Bảng mã lỗi nghiệp vụ (≈ 20 mã) 📊
- 4.2.6 Mốc công bố hợp đồng cho Frontend (giữa tuần 06–07) và minh chứng (commit/ảnh Postman) 📷
- 4.2.7 Quy trình thay đổi API sau khi chốt và nhật ký thay đổi so với `[BC1]` mục 6.2.3 📊

### 4.3 Xác thực và phân quyền (Auth & RBAC) `[T6-7]`
- 4.3.1 Luồng đăng nhập và cấp JWT Bearer Token (hạn 8 giờ, claims) cho POS/KDS 💻 🟢
- 4.3.2 Luồng đăng nhập Admin riêng: kiểm tra `accountType`, `accountId`, vai trò ở từng request 💻 🟢
- 4.3.3 **Refresh Token**: cấp mới, làm mới khi access token hết hạn, thu hồi khi đăng xuất 💻 🔴 (bắt buộc theo `[T6-7]`)
- 4.3.4 Mã hóa mật khẩu BCrypt, chống dò tài khoản 🟢
- 4.3.5 Ma trận Role – Permission – Route (ADMIN, RECEPTIONIST, KITCHEN, Khách) 📊 🟡 (bug B-01)
- 4.3.6 Đối chiếu đặc tả UC08 – Đăng nhập và FR-SYS-05 – Phân quyền (`[BC1]` mục 3.3) với kết quả 200/401/403 📊
  > Ghi chú: yêu cầu tuần 06–07 gọi chung là “UC01–UC02”; trong `[BC1]` hai chức năng này là UC08 và FR-SYS-05.
- 4.3.7 Phân quyền theo khu bếp ở tầng Service 💻 🟢

### 4.4 Hiện thực Core Business Logic (luồng xương sống) `[T6-7]`
*(mỗi mục: chức năng → endpoint → lớp xử lý → ảnh chạy thật)*
- 4.4.1 Phân hệ Khách hàng: xác nhận bàn, thực đơn có số suất, Option/Combo, gửi đơn, theo dõi đơn, hủy món/cả đơn, gọi nhân viên 🟢 📷💻
- 4.4.2 Phân hệ Lễ tân: duyệt/từ chối từng món, phục vụ, trả món/hoàn tác, sơ đồ bàn, hóa đơn gộp, hủy hóa đơn, trả bàn, gọi nhân viên 🟢; nhật ký thao tác POS 🔴; cảnh báo SLA 🔴 📷💻
- 4.4.3 Phân hệ Bếp: bảng món theo Order, Nấu (trừ kho BOM), Xong, tự chuyển đơn kế tiếp 🟢 📷💻 (bug F-01: gỡ endpoint Nấu trùng)
- 4.4.4 Thanh toán: tiền mặt; VNPay Sandbox (tạo giao dịch, ký HMAC-SHA512, IPN, đối chiếu số tiền) 🟢 📷💻 (bug E-01, E-02)
- 4.4.5 Phân hệ Quản trị: CRUD 13 nhóm dữ liệu, upload ảnh, in QR, nhật ký hoạt động 🟢 📷💻
- 4.4.6 Tác vụ nền: tự hủy hóa đơn rỗng 🟢; quét trễ SLA 🔴

### 4.5 Trích đoạn giải thuật cốt lõi `[T9]`
*(mỗi mục: bài toán → mô tả giải thuật → trích code → giải thích → kết quả minh họa)*
- 4.5.1 Trừ kho theo BOM trong một transaction khi bấm “Nấu” (theo BOM tổng, không quản lý lô FIFO) 💻
- 4.5.2 Tính số suất còn lại và giữ chỗ nguyên liệu (có Option, Combo) 💻
- 4.5.3 Gộp hóa đơn tự động theo lượt khách 💻
- 4.5.4 Tính giá Option, Combo (FIXED/PERCENT) và chốt giá Snapshot 💻 (bug G-01)
- 4.5.5 Tự hủy hóa đơn rỗng sau thời gian chờ 💻
- 4.5.6 Thanh toán VNPay: ký/kiểm chữ ký, IPN idempotent 💻
- 4.5.7 Nhật ký hoạt động sinh nội dung “cũ → mới” 💻
- 4.5.8 Bảng ánh xạ BR-01 → BR-20 (`[BC1]` mục 1.6) sang lớp/phương thức, kèm trạng thái 📊

### 4.6 Kiểm soát đồng thời (Concurrency) `[T6-7]`
- 4.6.1 Phân tích các điểm tranh chấp: hai khách đặt suất cuối, hai bếp bấm Nấu cùng nguyên liệu, hai lễ tân thanh toán một hóa đơn, IPN gửi lặp 📊
- 4.6.2 Cơ chế đã chọn: transaction ACID + khóa dòng `SELECT … FOR UPDATE` theo thứ tự id; lý do không dùng Redis Lock 💻 🟢
- 4.6.3 Trừ kho có điều kiện (`UPDATE … WHERE stock_quantity >= :amount`) làm chốt an toàn 💻 🟢
- 4.6.4 Điểm còn thiếu khóa và kế hoạch xử lý 📊 🔴 (bug D-02, D-03, F-01, G-03)

### 4.7 Chống thao tác lặp (Idempotency) `[T6-7]` `[T9]`
- 4.7.1 Đã có: kiểm tra trạng thái trước khi chuyển (Nấu 2 lần, duyệt 2 lần, resolve 2 lần), IPN idempotent theo `txnRef`, gọi nhân viên không tạo trùng 💻 🟢
- 4.7.2 Còn thiếu: khóa idempotency (Idempotency-Key) cho gửi đơn và tạo thanh toán khi mất mạng gửi lại 💻 🔴 (bug C-03)

### 4.8 Cơ chế realtime phía máy chủ
- 4.8.1 Cấu hình STOMP over SockJS: endpoint `/ws`, broker `/topic`, chỉ gửi sau khi commit 💻 🟢
- 4.8.2 Bảng topic – sự kiện – nơi phát – người nhận: `/topic/kds`, `/topic/pos`, `/topic/table/{tableId}`, `/topic/admin/activity` 📊 🟡 (bug D-01, F-02, C-01, D-04)

### 4.9 Minh chứng Swagger UI và Postman Collection `[PDF]` `[T6-7]`
- 4.9.1 Swagger UI (springdoc-openapi) nhóm theo phân hệ 📷 🔴
- 4.9.2 Postman Collection `tests/api`: 78 endpoint, 110 request, Environment riêng, chạy tự động bằng Newman 📷 🟢; bổ sung nhóm POS và Payment 🔴 (bug A-08)

### 4.10 Minh chứng response JSON và mã HTTP `[PDF]`
- 4.10.1 Ca thành công 200/201/204 📷💻
- 4.10.2 Ca lỗi nghiệp vụ 400/401/403/404/409 📷💻
- 4.10.3 Bảng tổng hợp API – tình huống – mã HTTP – kết quả 📊

### 4.11 Danh mục endpoint 📊
- Bảng method – URL – quyền – mô tả – trạng thái theo 6 nhóm (Auth, Customer, POS, Payment, KDS, Admin); bản đầy đủ ở Phụ lục B

---

## CHƯƠNG 5. HIỆN THỰC HÓA FRONT-END VÀ TÍCH HỢP HỆ THỐNG
*`[PDF]` Nội dung 4 · `[T8-9]` Wireframe, Responsive, phân quyền giao diện, 3 trạng thái, realtime, trạng thái ảo, CORS/.env*

### 5.1 Kiến trúc Front-end
- 5.1.1 Bảng ứng dụng – người dùng – công nghệ – cổng: Customer 5173, POS 5174, KDS 5175, Admin 5176 📊 🟢
- 5.1.2 Cấu trúc thư mục từng ứng dụng (pages, components, api/services, realtime, hooks, types) 💻
- 5.1.3 Thư viện sử dụng: React 18/19, TypeScript, Vite, `@stomp/stompjs`, `sockjs-client`, `axios`, `qrcode`

### 5.2 Tầng tích hợp API `[T8-9]`
- 5.2.1 Lớp gọi API (`fetch` cho Customer/KDS/Admin, `axios` cho POS), gắn Bearer Token tự động 💻 🟢
- 5.2.2 Xử lý lỗi tập trung: đọc `ErrorResponse`, phiên hết hạn → về màn hình đăng nhập (KDS, Admin 🟢; POS 🔴 bug B-05) 💻
- 5.2.3 Proxy phát triển (Vite) và reverse proxy triển khai (Nginx) cho `/api`, `/ws` 💻 🟢

### 5.3 Cấu hình môi trường và CORS `[T8-9]`
- 5.3.1 Tách cấu hình ra `.env`: Base URL, Secret Key, thông tin DB, cổng, VNPay 📊 🟡 (bug A-04)
- 5.3.2 Cấu hình CORS phía Spring: danh sách origin, phương thức (đã thêm PATCH), lý do bỏ header Origin ở proxy 💻 🟡
- 5.3.3 Minh chứng không commit bí mật (`.gitignore`, `.env.example`) 📷 🟡
- 5.3.4 Khác biệt cấu hình local – Docker – Cloud (URL, CORS, `wss://`) 📊

### 5.4 Giao diện theo vai trò và đối chiếu Wireframe `[T8-9]` `[PDF]`
*(mỗi màn hình: ảnh thật 📷 + mô tả + API sử dụng)*
- 5.4.1 Phân hệ Khách hàng (điện thoại): vào bàn từ QR, thực đơn và tab Combo, số suất còn lại, chọn Option, Combo, giỏ hàng, gửi đơn, hóa đơn realtime, hủy món/đơn, gọi nhân viên 🟢
- 5.4.2 Phân hệ Lễ tân: đăng nhập, sơ đồ bàn, hàng đợi duyệt, từ chối kèm lý do, gọi nhân viên, hóa đơn gộp, phục vụ/trả món, thanh toán tiền mặt và VNPay, in hóa đơn 🟢; cảnh báo trễ SLA 🔴
- 5.4.3 Phân hệ Bếp: đăng nhập theo khu, dải Order, Nấu/Xong, đồng hồ SLA, cảnh báo đơn ngày cũ 🟢
- 5.4.4 Phân hệ Quản trị: Dashboard (tồn thấp, nhật ký realtime), Thực đơn (món, BOM, Option, danh mục, Combo), Kho, Bàn và in QR, Khu bếp, Nhân sự và nhật ký 🟢
- 5.4.5 Bảng đối chiếu Wireframe – giao diện thật 📊 🔴
  > `[BC1]` mục “UI Mockup” chưa có nội dung. Cần bổ sung wireframe đã dùng khi thiết kế (hoặc ghi rõ thiết kế trực tiếp), rồi so sánh với ảnh thật.

### 5.5 Thiết kế đáp ứng (Responsive) `[T8-9]`
- 5.5.1 Khách hàng tối ưu điện thoại; KDS co giãn theo bề rộng (2–4 cột); POS/Admin cho máy tính 📷
- 5.5.2 Bảng thiết bị/trình duyệt đã thử 📊

### 5.6 Phân quyền hiển thị giao diện `[T8-9]`
- 5.6.1 Bảng vai trò → ứng dụng/màn hình được truy cập 📊
- 5.6.2 Chặn đăng nhập sai vai trò (POS chỉ RECEPTIONIST, KDS chỉ KITCHEN, Admin chỉ ADMIN) 📷💻 🟢
- 5.6.3 Kiểm tra lại phiên khi tải trang (Admin `GET /api/admin/auth/me`) 💻 🟢
- 5.6.4 Minh chứng truy cập API trái quyền bị chặn 📷

### 5.7 Ba trạng thái giao diện `[T8-9]`
- 5.7.1 Đang tải: hiện là dòng thông báo; bổ sung Loading Skeleton cho thực đơn, sơ đồ bàn, bảng Admin 📷 🔴
- 5.7.2 Thành công: dữ liệu từ API 📷 🟢
- 5.7.3 Lỗi: Toast/Alert và nút “Thử lại” (Admin, KDS) 📷 🟢
- 5.7.4 Bảng đối chiếu 3 trạng thái trên các màn hình chính 📊

### 5.8 Tích hợp realtime phía giao diện `[T8-9]`
- 5.8.1 Kết nối STOMP, tự kết nối lại, tải định kỳ dự phòng; hiển thị trạng thái kết nối (KDS, Admin) 💻 🟢
- 5.8.2 Màn hình nhận sự kiện: đơn mới (POS), gọi nhân viên (toast POS), món cần nấu (KDS), trạng thái món (Khách), tồn kho/nhật ký (Admin Dashboard) 📷 🟡

### 5.9 Triệt tiêu “trạng thái ảo” `[T8-9]`
- 5.9.1 Nguyên tắc: giao diện chỉ báo thành công khi máy chủ xác nhận, không cập nhật lạc quan
- 5.9.2 Nấu/Xong/Duyệt: tải lại dữ liệu thật sau phản hồi API 💻 🟢
- 5.9.3 Thanh toán VNPay: chỉ chuyển “Đã thanh toán” khi IPN khớp tiền và giao dịch SUCCESS (POS thăm dò 2 giây/lần) 💻 🟢
- 5.9.4 Khóa nút khi đang xử lý, chống bấm lặp 💻 🟢

### 5.10 Chứng minh dữ liệu động, không Mock Data `[T9]`
- 5.10.1 Bảng màn hình → API → bảng CSDL 📊
- 5.10.2 Sửa dữ liệu trên Admin → các giao diện khác thay đổi theo 📷
- 5.10.3 Kết quả tìm kiếm “mock” trong repo; xóa `frontend/admin/src/data/mock.ts` (không được dùng) 📷 🟡 (bug G-08)

---

## CHƯƠNG 6. LUỒNG NGHIỆP VỤ XƯƠNG SỐNG VÀ KỊCH BẢN DEMO MVP
*`[PDF]` Nội dung 4 · `[T8-9]` ưu tiên luồng chính · `[T9]` E2E không crash, Demo Script, 2 trình duyệt ẩn danh*

### 6.1 Kịch bản End-to-End User Story
- 6.1.1 Câu chuyện người dùng và tiêu chí chấp nhận
- 6.1.2 Dữ liệu chuẩn bị: bàn, món có Option, Combo, tồn kho ban đầu, tài khoản 📊

### 6.2 Thực thi luồng xương sống
**Đăng nhập → Tạo đơn → Xử lý nghiệp vụ → Lưu DB → Bắn realtime** `[T8-9]`
- 6.2.1 Bước 0: Admin cấu hình món, công thức BOM, in QR bàn 📷
- 6.2.2 Bước 1: Khách quét QR, xem thực đơn, chọn món/Option/Combo, gửi đơn 📷
- 6.2.3 Bước 2: Lễ tân nhận đơn realtime, duyệt 📷
- 6.2.4 Bước 3: Món hiện trên KDS, bếp bấm Nấu; tồn kho và `stock_transaction` trước/sau 📷📊
- 6.2.5 Bước 4: Bếp bấm Xong; Khách và Lễ tân cập nhật 📷
- 6.2.6 Bước 5: Lễ tân đánh dấu phục vụ 📷
- 6.2.7 Bước 6: Khách gọi thêm, hóa đơn tự gộp 📷
- 6.2.8 Bước 7: Thanh toán VNPay Sandbox, IPN xác nhận, hóa đơn PAID 📷
- 6.2.9 Bước 8: Trả bàn; Admin xem nhật ký và tồn kho 📷
- 6.2.10 Bảng tổng hợp: bước – vai trò – API – sự kiện realtime – bảng dữ liệu thay đổi 📊
- 6.2.11 Kiểm chứng CSDL trước/sau từng bước (`order_item`, `invoice`, `ingredient`) 💻📷
- 6.2.12 Minh chứng chạy thông suốt, không crash, không đứng màn hình 🎬

### 6.3 Các luồng phụ
- 6.3.1 Từ chối món kèm lý do
- 6.3.2 Khách hủy đơn; hóa đơn rỗng tự hủy
- 6.3.3 Trả món và hoàn tác
- 6.3.4 Món hết nguyên liệu → “tạm hết”; nhập kho → có lại
- 6.3.5 Thanh toán tiền mặt và tiền thối

### 6.4 Kịch bản Demo MVP 3–5 phút `[T9]`
- 6.4.1 Kịch bản theo mốc thời gian (mm:ss – thao tác – lời thuyết minh – màn hình) 📊
- 6.4.2 Phân công: 01 người thao tác, 01 người thuyết minh luồng nghiệp vụ
- 6.4.3 Cặp tài khoản và trình duyệt ẩn danh: Lễ tân ↔ Bếp (cặp bắt buộc), Khách trên điện thoại, Admin; điểm tương tác realtime sẽ trình diễn 📊
- 6.4.4 Checklist trước demo: mạng, tài khoản, dữ liệu reset, VNPay Sandbox, URL công khai
- 6.4.5 Phương án dự phòng: video, script reset dữ liệu

### 6.5 Đối chiếu hiện thực với BPMN/Sequence tuần 06
- 6.5.1 Bảng điểm khớp/khác kèm lý do (duyệt theo món; VNPay thay VietQR; giữ chỗ suy từ trạng thái món; trả bàn thủ công; Admin đăng nhập riêng) so với `[BC1]` Phần 2 và Phần 4 📊

---

## CHƯƠNG 7. KIỂM THỬ CHỨC NĂNG SƠ BỘ
*`[PDF]` Nội dung 5 · `[T9]` Black-box theo UC, ca biên và ngoại lệ · `[T6-7]` kiểm thử đồng thời*

### 7.1 Kế hoạch kiểm thử
- 7.1.1 Mục tiêu, phạm vi, tiêu chí bắt đầu/kết thúc
- 7.1.2 Phương pháp: kiểm thử hộp đen dựa trên danh mục UC01–UC31 (`[BC1]` mục 3.3); kiểm thử tích hợp API; unit test; E2E giao diện
- 7.1.3 Môi trường: Docker local, môi trường thử độc lập `dacn-api-test` (cổng 18080), Cloud; trình duyệt, thiết bị 📊
- 7.1.4 Công cụ: Postman/Newman, JUnit 5, Mockito, Playwright, `node --test`, JMeter
- 7.1.5 Tiêu chí Pass/Fail, mức độ ưu tiên; phân công kiểm thử 📊

### 7.2 Thiết kế ca kiểm thử
- 7.2.1 Mẫu ca kiểm thử: Mã TC – UC/FR – loại – tiền điều kiện – bước – dữ liệu – kết quả mong đợi – kết quả thực tế – Pass/Fail – minh chứng 📊
- 7.2.2 Kỹ thuật: phân hoạch tương đương, giá trị biên, bảng quyết định, chuyển trạng thái (vòng đời món)

### 7.3 Ca kiểm thử theo Use Case 📊
- 7.3.1 Đăng nhập và phân quyền (UC08, FR-SYS-05)
- 7.3.2 Khách hàng (UC01–UC07)
- 7.3.3 Lễ tân (UC09–UC18)
- 7.3.4 Bếp (UC19–UC21)
- 7.3.5 Quản trị (UC22–UC30)
- 7.3.6 Realtime: nhiều trình duyệt, mất kết nối, kết nối lại

### 7.4 Ca kiểm thử biên và ngoại lệ bắt buộc `[T9]` 📊
- 7.4.1 Nhập sai mật khẩu (nhiều lần) ở Admin, POS, KDS
- 7.4.2 Số lượng âm, bằng 0, vượt 99; giá ≤ 0; định lượng ≤ 0
- 7.4.3 Bỏ trống trường bắt buộc (lý do từ chối/trả món, tên món, số tiền khách đưa…)
- 7.4.4 Ngắt mạng đột ngột khi đang gửi đơn/thanh toán
- 7.4.5 Gửi lặp: gửi một đơn 2 lần, bấm Nấu 2 lần, thanh toán 2 lần, IPN 2 lần (tương ứng “quét 2 lần cùng một mã”)
- 7.4.6 Trừ kho khi hết hàng; hai bàn cùng đặt suất cuối
- 7.4.7 Bàn không tồn tại, dữ liệu sai định dạng, tệp ảnh giả mạo

### 7.5 Kiểm thử tự động
- 7.5.1 Unit/Integration Backend: 26/26 Pass (`ComboPriceCalculatorTest`, `IngredientRequirementCalculatorTest`, `AdminAuthTest`, `AdminImageServiceTest`) 📷 🟢; `InvoiceServiceTest` cần MySQL 🟡
- 7.5.2 Kiểm thử API bằng Newman: 110 request, báo cáo `tests/api/results/report.md` 📷 🟢
- 7.5.3 Frontend Admin: `npm run test:admin`, Playwright `e2e/admin.spec.ts` 📷 🟡 (bug A-06)

### 7.6 Kiểm thử phi chức năng sơ bộ
- 7.6.1 Kiểm thử đồng thời: nhiều request vào món sắp hết (Postman Runner/JMeter), kho không âm, không trừ sai 📷📊 🔴 `[T6-7]`
- 7.6.2 Hiệu năng: thời gian phản hồi API chính (so với NFR-01 < 2 giây), độ trễ realtime (NFR-02 < 1 giây) 📊
- 7.6.3 Bảo mật cơ bản: truy cập trái quyền, token giả, tệp tải lên độc hại

### 7.7 Kết quả kiểm thử
- 7.7.1 Thống kê Pass/Fail theo phân hệ và loại ca 📊
- 7.7.2 Biểu đồ kết quả
- 7.7.3 Ma trận truy vết UC ↔ FR ↔ Test Case (mỗi UC ít nhất 1 ca đúng + 1 ca lỗi) 📊
- 7.7.4 Phân tích nguyên nhân các ca Fail (liên kết 8.4)

---

## CHƯƠNG 8. ĐÓNG BĂNG TÍNH NĂNG VÀ DANH SÁCH LỖI TỒN ĐỌNG
*`[PDF]` Nội dung 6 · `[T9]` Feature Freeze*

### 8.1 Rà soát mức độ hoàn thành
- 8.1.1 Bảng rà soát FR-CUS, FR-REC, FR-KDS, FR-MNU, FR-INV, FR-SYS, FR-RPT: Hoàn thành / Một phần / Chưa làm 📊
- 8.1.2 Bảng rà soát NFR-01 → NFR-08 📊
- 8.1.3 Thống kê và biểu đồ % hoàn thành

### 8.2 Thay đổi so với thiết kế tuần 06 📊
- 8.2.1 CSDL
- 8.2.2 API (Admin đăng nhập riêng, duyệt theo món, VNPay thay VietQR + webhook)
- 8.2.3 Quy tắc nghiệp vụ (tính combo khi món con bị hủy, thanh toán khi chưa phục vụ hết, trả bàn thủ công)
- 8.2.4 Lý do và tác động

### 8.3 Kế hoạch Feature Freeze
- 8.3.1 Ngày đóng băng; quy tắc sau buổi demo tuần 09: chỉ sửa lỗi và kiểm thử, không thêm chức năng ngoài phạm vi
- 8.3.2 Danh sách hoàn thiện trước ngày đóng băng (các mục 🔴 bắt buộc) 📊
- 8.3.3 Chức năng hoãn sang giai đoạn 2 và lý do (quy đổi đơn vị kho, báo cáo doanh thu, gộp/tách bàn, xác thực WebSocket)

### 8.4 Danh sách lỗi tồn đọng (Bug log) 📊
- 8.4.1 Bảng: ID – mô tả – phân hệ – mức độ – vị trí – cách tái hiện – hướng khắc phục – người xử lý – hạn – trạng thái (nguồn `Bug_log_tuan_09.md`)
- 8.4.2 Thống kê theo mức độ và phân hệ
- 8.4.3 Lỗi đã khắc phục trong đợt này

### 8.5 Rủi ro và biện pháp
- 8.5.1 Khó khăn kỹ thuật và tổ chức; bài học kinh nghiệm
- 8.5.2 Bảng rủi ro triển khai Cloud, demo, dữ liệu 📊

### 8.6 Kế hoạch tuần 10–12 📊
- 8.6.1 Tuần 10: sửa lỗi Nghiêm trọng/Cao, đóng gói và deploy Cloud
- 8.6.2 Tuần 11: kiểm thử E2E trên Cloud, sửa lỗi còn lại
- 8.6.3 Tuần 12: hoàn thiện báo cáo cuối kỳ, slide, demo; hạn nộp 11h30 thứ Hai 23/11/2026

---

## CHƯƠNG 9. ĐÓNG GÓI VÀ BÀN GIAO SẢN PHẨM
*`[PDF]` Phần II – 4 kênh nghiệm thu*

### 9.1 Kho mã nguồn GitHub
- 9.1.1 Link repository; chế độ Public hoặc cấp quyền cho GVHD (`trandinhnghia`) 📷 🔴
- 9.1.2 Cấu trúc repository: `src/`, `frontend/{customer,pos,kds,admin}`, `database/`, `tests/api/`, `scripts/`, `docker-compose.yml` 🟡
  > Xóa các tệp Java bị chép nhầm vào `frontend/customer/{controller,dto,service}`.
- 9.1.3 Lịch sử commit theo tuần của từng thành viên 📷📊 (xem 2.3.2)

### 9.2 Tệp README.md tại thư mục gốc 🟡
- 9.2.1 Mô tả đề tài và sơ đồ kiến trúc
- 9.2.2 Bảng công nghệ và phiên bản
- 9.2.3 Hướng dẫn thiết lập từng bước (Docker một lệnh; chạy riêng từng phần)
- 9.2.4 Tệp `.env.example` đầy đủ 💻 🟡
- 9.2.5 Danh sách tài khoản kiểm thử 2–3 cặp mỗi vai trò; khách truy cập bằng link `?table={id}` 📊
- 9.2.6 Bảng URL các giao diện sau khi chạy 📊

### 9.3 Đóng gói Docker Compose 🟢
- 9.3.1 Các service: `mysql-db` (healthcheck, volume, seed), `backend`, `frontend` (Nginx 4 cổng) 💻
- 9.3.2 Dockerfile backend (đa giai đoạn) và frontend (build 4 ứng dụng) 💻
- 9.3.3 Seed tự động trong container 💻
- 9.3.4 Minh chứng `docker compose up -d` và `docker compose ps` 📷
- 9.3.5 Lỗi thường gặp và cách khắc phục

### 9.4 Triển khai trực tuyến (Live Demo URL) 🔴
- 9.4.1 Frontend (Vercel/Netlify), Backend (Render/Railway), MySQL (Aiven/TiDB Cloud/Railway) 📷
- 9.4.2 Bảng URL – dịch vụ – trạng thái 📊
- 9.4.3 Vấn đề khi lên Internet: `wss://`, mixed-content, CORS domain thật, URL IPN/Return VNPay, URL trong mã QR, lưu ảnh tải lên, dịch vụ miễn phí “ngủ”
- 9.4.4 Chạy lại luồng E2E trên Cloud 📷

### 9.5 Video demo dự phòng 🎬 🔴
- 9.5.1 Link video 2–3 phút (Unlisted trên YouTube/Google Drive)
- 9.5.2 Nội dung và thời lượng từng đoạn

### 9.6 Checklist nghiệm thu 📊

---

## KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN
- Kết quả đạt được so với mục tiêu đợt 02
- Hạn chế còn tồn tại
- Hướng hoàn thiện đến báo cáo cuối kỳ

## TÀI LIỆU THAM KHẢO
*(chuẩn IEEE)*
- Tài liệu Spring Boot, Spring Security, Spring Data JPA, Spring WebSocket
- Tài liệu React, Vite, STOMP.js, SockJS
- Tài liệu MySQL 8.0, Docker Compose
- Tài liệu tích hợp VNPay Sandbox
- RFC 7519 (JSON Web Token), OWASP Top 10
- Báo cáo tiến độ lần 01 và Đặc tả chức năng của nhóm

## PHỤ LỤC
- Phụ lục A. Script lược đồ và dữ liệu seed
- Phụ lục B. Đặc tả đầy đủ endpoint (request/response mẫu), Postman Collection, OpenAPI
- Phụ lục C. Bảng ca kiểm thử chi tiết và báo cáo Newman
- Phụ lục D. Từ điển dữ liệu cập nhật so với tuần 06
- Phụ lục E. Bug log đầy đủ
- Phụ lục F. Biên bản họp nhóm, nhật ký công việc
- Phụ lục G. Hướng dẫn cài đặt chi tiết

---

## BẢNG TRUY VẾT YÊU CẦU → MỤC LỤC

| # | Yêu cầu | Nguồn | Mục | Trạng thái |
|---|---|---|---|---|
| 1 | Trang hành chính, bảng phân công Lead BE/FE/CSDL, % = 100% | PDF | Phần đầu, 2.1–2.3 | 🔴 |
| 2 | Ảnh công cụ quản trị CSDL, bảng đã migrate từ ERD | PDF, T6-7 | 3.2 | 🟢 |
| 3 | Khóa chính, khóa ngoại, Index | T6-7 | 3.3 | 🟡 |
| 4 | Cột Snapshot bất biến | T6-7 | 3.4 | 🟢 |
| 5 | Seeding 10–20 bản ghi, tài khoản demo từng vai trò | PDF, T6-7 | 3.5 | 🟡 |
| 6 | JWT Bearer Token **kèm Refresh Token**, RBAC theo UC | T6-7 | 4.3 | 🔴 (Refresh Token) |
| 7 | Core Business Logic xương sống | T6-7 | 4.4, 4.5 | 🟢 |
| 8 | API Contract First: Swagger/Postman, camelCase, mã lỗi 400/401/404/409 | T6-7 | 4.2, 4.9 | 🟡 |
| 9 | Concurrency (race condition kho) | T6-7 | 4.6, 7.6.1 | 🟡 |
| 10 | Idempotency (token/kiểm tra trạng thái) | T6-7, T9 | 4.7, 7.4.5 | 🟡 |
| 11 | Kỷ luật Git: `main`/`develop`/`feature/*`, không commit `main`, không nộp hộ | T6-7 | 2.4, 9.1 | 🟡 |
| 12 | Swagger UI / Postman chạy live; JSON + mã HTTP | PDF | 4.9, 4.10 | 🟡 |
| 13 | Giao diện thật bám Wireframe, Responsive | PDF, T8-9 | 5.4, 5.5 | 🟡 (thiếu wireframe gốc) |
| 14 | Phân quyền hiển thị theo vai trò | T8-9 | 5.6 | 🟢 |
| 15 | Loading Skeleton – Success – Error | T8-9 | 5.7 | 🟡 |
| 16 | WebSocket realtime lên màn hình | T8-9 | 4.8, 5.8 | 🟡 |
| 17 | Triệt tiêu trạng thái ảo (chờ xác nhận thanh toán) | T8-9 | 5.9 | 🟢 |
| 18 | CORS, tách `.env` | T8-9 | 5.3 | 🟡 |
| 19 | Luồng xương sống E2E không crash | PDF, T8-9, T9 | 6.2 | 🟡 |
| 20 | Không Mock Data | T9 | 5.10 | 🟢 |
| 21 | Demo Script 3–5 phút, 1 thao tác + 1 thuyết minh, 2 tài khoản ẩn danh | PDF, T9 | 6.4 | 🔴 |
| 22 | Test case đúng/biên/ngoại lệ, Pass/Fail; Black-box theo UC | PDF, T9 | Chương 7 | 🔴 (chưa lập bảng) |
| 23 | Ca biên: sai mật khẩu, số âm, bỏ trống, ngắt mạng, gửi 2 lần | T9 | 7.4 | 🟡 |
| 24 | Rà soát chức năng, bug log, Feature Freeze | PDF, T9 | Chương 8 | 🟢 |
| 25 | GitHub (quyền GVHD, commit đều), README, `.env.example`, tài khoản demo | PDF | 9.1, 9.2 | 🟡 |
| 26 | Docker Compose một lệnh, seed tự động | PDF | 9.3 | 🟢 |
| 27 | Public URL | PDF | 9.4 | 🔴 |
| 28 | Video dự phòng 2–3 phút | PDF | 9.5 | 🔴 |
| — | Module chuyên biệt (nhận diện khuôn mặt, e-Consent, Wokwi), Redis Lock, MQTT, TimescaleDB, lô FIFO | T6-7, T8-9 | 1.1.3, 4.5.1, 4.6.2 | Không thuộc đề tài (ghi rõ lý do) |

---

## VIỆC CẦN BỔ SUNG ĐỂ ĐÁP ỨNG ĐỦ YÊU CẦU

### A. Trước buổi báo cáo tuần 09 (bắt buộc)

| # | Việc | Mục | Bug |
|---|---|---|---|
| 1 | Sửa realtime luồng xương sống: topic duyệt món, KDS báo khách, khách hủy báo bếp | 4.8, 6.2 | D-01, F-02, C-01 |
| 2 | Gỡ endpoint Nấu trùng; thống nhất nghĩa combo FIXED | 4.4.3, 4.5.4 | F-01, G-01 |
| 3 | Xóa các tệp Java nằm nhầm trong `frontend/customer/` | 9.1.2 | — |
| 4 | Bổ sung seed ≥ 10 bản ghi cho các bảng danh mục còn thiếu | 3.5 | A-10 |
| 5 | Chụp minh chứng CSDL, Postman/Newman, JSON và mã HTTP | 3.2, 3.5.7, 4.9, 4.10 | — |
| 6 | Chạy và chụp luồng E2E 8 bước; lập kịch bản demo, phân vai, cặp tài khoản ẩn danh | 6.2, 6.4 | — |
| 7 | Lập bảng test case theo UC + ca biên, có Pass/Fail và ma trận truy vết | Chương 7 | — |
| 8 | Điền biên bản, bảng phân công, % đóng góp cho 5 người | Phần đầu, Chương 2 | — |

### B. Theo yêu cầu kỹ thuật tuần 06–09 còn thiếu (hoàn thành trong tuần 10)

| # | Việc | Mục | Nguồn |
|---|---|---|---|
| 9 | Refresh Token: endpoint làm mới, thu hồi khi đăng xuất, frontend tự làm mới | 4.3.3 | T6-7 |
| 10 | Swagger UI (springdoc-openapi); bổ sung nhóm POS/Payment vào Postman | 4.9 | T6-7, PDF |
| 11 | Index cho truy vấn nóng | 3.3.2 | T6-7 |
| 12 | Khóa dòng cho duyệt/từ chối, thanh toán tiền mặt, sửa tồn kho Admin | 4.6.4 | T6-7 |
| 13 | Idempotency-Key cho gửi đơn và tạo thanh toán | 4.7.2 | T6-7, T9 |
| 14 | Chuẩn hóa nhánh `develop`, `feature/*`; quy tắc Pull Request | 2.4 | T6-7 |
| 15 | Loading Skeleton cho các màn hình chính | 5.7.1 | T8-9 |
| 16 | Hoàn thiện `.env.example`, đưa bí mật ra biến môi trường | 5.3 | T8-9 |
| 17 | Bổ sung wireframe hoặc giải thích; bảng đối chiếu giao diện | 5.4.5 | T8-9 |
| 18 | Sửa lỗi VNPay (E-01, E-02); 401 đúng chuẩn; POS tự đăng xuất | 4.4.4, 4.2.4, 5.2.2 | PDF |
| 19 | Kiểm thử đồng thời bằng JMeter/Postman Runner | 7.6.1 | T6-7 |
| 20 | README gốc; cấp quyền repo cho GVHD; Deploy Cloud; video dự phòng | Chương 9 | PDF |
