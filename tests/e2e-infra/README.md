# Môi trường E2E độc lập — bước 2

Đây là hạ tầng cho test, không phải cấu hình deploy và chưa phải bộ E2E nghiệp vụ hoàn chỉnh.

## Chạy

Yêu cầu Docker Engine Linux đang chạy, Docker Compose hỗ trợ `mem_limit` và Node.js 22+. Chạy từ thư mục gốc project:

```powershell
node tests/e2e-infra/run.cjs config
node tests/e2e-infra/run.cjs up
node tests/e2e-infra/run.cjs smoke
```

`up` build Backend và cả 4 frontend, chờ Backend/seed sẵn sàng rồi kiểm tra môi trường. Lần đầu cần mạng tải image/Gradle/npm, có thể lâu. Không chạy đồng thời test performance hoặc nhiều Backend trên máy thiếu RAM. Hạn mức runtime trong Compose không giới hạn tài nguyên khi build image.

Nếu chưa chép bản vá vào project chính, vẫn chạy được trực tiếp:

```powershell
node proposed-fixes/42-e2e-business-suites/tests/e2e-infra/run.cjs up
```

Runner tự tìm thư mục gốc có gradlew; nó build **source hiện tại trong project chính**, không tự áp dụng các bản vá đang hoãn. Không dùng compose gốc hoặc `.env` gốc.

## Địa chỉ và tài khoản

| Thành phần | Địa chỉ |
|---|---|
| Backend | http://127.0.0.1:18089 |
| Customer | http://127.0.0.1:15173/?table=900002 |
| POS | http://127.0.0.1:15174 |
| KDS | http://127.0.0.1:15175 |
| Admin | http://127.0.0.1:15176 |

Tất cả cổng chỉ bind loopback, không công khai ra mạng. Không đổi sang database demo để chạy bộ test này.

| Vai trò | Username | Password chỉ dùng test |
|---|---|---|
| Admin | admin.e2e | E2eOnly!2026 |
| POS | pos.e2e | E2eOnly!2026 |
| Bếp nóng | kitchen.hot.e2e | E2eOnly!2026 |
| Quầy nước | kitchen.bar.e2e | E2eOnly!2026 |

Dữ liệu chuẩn nằm trong `fixtures.cjs` và `seed.sql`: 2 khu bếp/danh mục, 3 nguyên liệu (một loại hết), 3 món (một món hết), 1 option thêm phần, 1 combo và 4 bàn trống. Món chính 20.000đ dùng 0,25 kg; đồ uống 10.000đ dùng 0,10 kg; thêm phần +5.000đ/+0,10 kg; combo 25.000đ. Không có hóa đơn hay món đang nấu lúc khởi tạo. Các ca nghiệp vụ tự tạo giao dịch của mình ở bước 3.

Admin test cũ dùng admin.demo/18080 nên **chưa chạy ngay bằng hạ tầng mới**. Việc tách bài, thay credential/URL bằng fixture, thêm guard và cleanup thuộc bước 3. Không sửa biến Postman cũ để chạy mutation lên database demo.

## Reset và dọn dẹp

```powershell
node tests/e2e-infra/run.cjs logs
node tests/e2e-infra/run.cjs reset
node tests/e2e-infra/run.cjs down
```

- `reset`: kiểm tra nhãn sở hữu → dừng/xóa riêng container của project `restaurant-e2e` → dựng lại, schema/seed trở về ban đầu → smoke. Không tác động Compose ứng dụng.
- `down`: dừng/xóa riêng stack test. Database dùng tmpfs nên dữ liệu test mất khi container DB dừng/xóa; ảnh upload cũng là tmpfs.
- MySQL khởi tạo từ `schema-base.sql` (chỉ DDL trích từ SQL gốc, không có dữ liệu demo); Hibernate dùng `ddl-auto=update` để bổ sung phần entity hiện tại. `boot-reset.sql` xóa dữ liệu test rồi mới nạp seed. **Mỗi lần Backend khởi động lại đều tạo lại dữ liệu test**. Đây là chủ đích; không dùng profile/seed này trong production.
- Các lệnh TRUNCATE chỉ ở schema restaurant_e2e đã cố định; không có lệnh DELETE/TRUNCATE trên database do người dùng nhập. Không nhận biến URL database hoặc tên project tùy ý từ CLI.
- Khi chuyển từ chạy trực tiếp trong proposed-fixes sang bản đã chép, `down` bằng runner cũ trước, rồi `up` bằng runner mới để tránh mount/config và state secret cũ.

`.local/state.json` giữ các khóa ngẫu nhiên của môi trường test để các lần up dùng cùng cấu hình. `.local` và `results` có `.gitignore` riêng. Không commit hay chia sẻ state/Postman environment đã xuất. Mật khẩu test ở bảng trên không dùng lại cho ứng dụng thật. Quyền mode 0600 chỉ có ý nghĩa ở hệ điều hành hỗ trợ; trên Windows vẫn dựa vào quyền truy cập thư mục của bạn.

## Postman và kiểm tra môi trường

```powershell
node tests/e2e-infra/run.cjs export-postman
```

Tạo `.local/E2E.postman_environment.json` sau khi kiểm tra đúng Docker ownership, URL database và marker dữ liệu. Import file này vào Postman, chọn **ISOLATED E2E ONLY**. Nó không tự tạo invoiceId/itemId/callId: các request nghiệp vụ phải tạo và lấy ID từ response, không dùng ID demo. Một request được bỏ qua/thiếu fixture không tính là đã kiểm thử thành công nghiệp vụ đó.

`smoke` kiểm tra:

- Ba container đúng project và nhãn `e2e-v1`; Backend dùng đúng DSN `restaurant_e2e`.
- Marker danh mục và đăng nhập đủ 4 vai trò.
- Món/giá chuẩn, món hết kho, bàn chuẩn.
- Bốn frontend phục vụ HTML, API yêu cầu login trả 401 và POS truy cập Admin bị 403.

Báo cáo `results/environment-smoke.json` chỉ xuất tên kiểm tra/trạng thái, không xuất token. Smoke môi trường không đồng nghĩa 74 kịch bản E2E đã đạt.

## Quy tắc cho bước 3

- Import fixture ID/tài khoản từ fixtures.cjs; gọi assertFixture trước mọi bộ test có ghi dữ liệu, dùng runner kiểm tra ownership trước khi chạy suite.
- Ban đầu dùng workers=1; ca tranh chấp tạo hai context/request đồng thời ngay trong một test. Chỉ tăng workers khi mỗi test đã có tập fixture riêng.
- Test dùng tên có case ID và mã duy nhất; lưu ID tạo được. Cleanup trong fixture teardown/finally; nếu lỗi không dọn được thì reset stack trước bộ tiếp theo. Không dùng một bài dài phụ thuộc thứ tự cho toàn bộ nghiệp vụ.
- API/mạng lỗi được inject ở trình duyệt hoặc mock callback test; chưa thêm endpoint ép thời gian/reset DB vào Backend thật.
- MOCK được bật, VNPay/QueryDR/Swagger/demo seeder bị tắt. Các ca Return/IPN chữ ký VNPay cần profile riêng ở bước sau; không tự bật sandbox trong CI chính.
- QR bàn của frontend test được build với VITE_CUSTOMER_URL trỏ Customer test. Frontend.Dockerfile thêm build argument này và ép VITE_API_URL=/api, tránh .env frontend cục bộ trỏ sang Backend khác.

Các lệnh này chưa chạy Playwright, chưa tạo workflow CI/CD. Đó là bước 3–5.

## Đổi cổng khi cần

Các địa chỉ ở bảng là mặc định. Có thể tạo `.local/ports.json` trước khi up, ví dụ `{"api":18090,"customer":15273,"pos":15274,"kds":15275,"admin":15276}`. Runner, guard, Compose, URL Return/mock và build QR Customer đọc cùng cấu hình. Chỉ cho phép loopback, cổng riêng khác các cổng ứng dụng phổ biến; không nhận URL Backend/database bên ngoài. Down stack hiện tại trước khi đổi cổng.

Chỉ chạy một runner/lượt E2E trên cùng Docker Engine tại một thời điểm vì project test có tên cố định. Các job CI tương lai cần runner/VM độc lập; chưa hỗ trợ nhiều job cùng chia sẻ stack này. Các ca tranh chấp vẫn chạy đồng thời bên trong một lượt test.

## Khớp schema với đồ án (bổ sung bản 42)

Bản 41 tạo schema thuần entity có thể thiếu ràng buộc chỉ khai báo trong SQL init, ví dụ UNIQUE username hoặc cặp tầng/số bàn. Bản 42 nạp DDL của `database/init/sample_database.26.11.22.sql` trước, rồi Hibernate update như luồng khởi động đồ án, sau đó reset và seed test. Không import dữ liệu mẫu. Không coi kết quả trên schema thiếu constraint là lỗi production.

Khi thay SQL nền, cập nhật schema-base.sql từ các CREATE TABLE, kiểm tra không chứa INSERT/USE/CREATE DATABASE và khởi tạo mới stack. Cấu hình này kiểm tra cold-start schema hiện tại, chưa kiểm thử nâng cấp từ mọi phiên bản database lịch sử.

Có thể chạy `node tests/e2e-infra/refresh-schema.cjs --check` để kiểm tra DDL contract còn khớp source. Khi thay DDL nền, chạy không có --check để tái tạo rồi review diff, sau đó reset stack. Hash chuẩn hóa LF để chạy giống nhau trên Windows/Linux.
