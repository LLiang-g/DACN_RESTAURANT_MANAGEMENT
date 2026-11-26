# E2E nghiệp vụ — bản 42 (bước 3)

Bộ này dùng môi trường bản 41 đã áp dụng ở `tests/e2e-infra`. Không chạy lên database demo. MySQL lấy DDL nền từ SQL đồ án rồi Hibernate update để giữ constraint chỉ có trong SQL. Mã Backend/frontend vẫn là source thật hiện tại; không mock toàn bộ API để tạo kết quả đạt giả.

## Chuẩn bị và chạy

Tại thư mục gốc project, cài dependency Playwright đã khai báo sẵn ở Admin nếu máy chưa có:

```powershell
npm --prefix frontend/admin ci
```

Cài Chromium bằng Playwright CLI tương ứng (trên GitHub/Linux dùng thêm `--with-deps`):

```powershell
cd frontend/admin
npx playwright install chromium
cd ../..
```

Khởi động stack test rồi chạy suite chính:

```powershell
node tests/e2e-infra/run.cjs reset
node tests/e2e/run.cjs test
```

Trên máy Windows đã có Edge, có thể dùng:

```powershell
$env:E2E_BROWSER_CHANNEL='msedge'
node tests/e2e/run.cjs test
```

Mặc định là Chromium do Playwright cài. Không ghi `msedge` cố định vào CI Linux.

Các lệnh khác:

```powershell
node tests/e2e/run.cjs all
node tests/e2e/run.cjs list
node tests/e2e/run.cjs vnpay
node tests/e2e/run.cjs auto-cancel
node tests/e2e/run.cjs known-gaps
node tests/e2e-infra/run.cjs down
```

- `test`: bộ chính gồm browser, API/state và request đồng thời thật. Không tự chạy nhóm lỗi đã biết hoặc profile đặc biệt.
- `vnpay`: tạm bật provider VNPay với merchant/secret giả và pay URL example.invalid; kiểm chữ ký Return/IPN và trang Customer bằng Backend thật. **Không gọi VNPay bên ngoài, không kiểm được kết nối Sandbox thực tế.** QueryDR vẫn tắt.
- `auto-cancel`: tạm giảm grace period hóa đơn rỗng về 0 và chu kỳ quét 1 giây trong container test, kiểm scheduler. Không thay cấu hình ứng dụng/demo và không tự hết hạn món PENDING.
- `known-gaps`: thực thi các kỳ vọng đúng đối với lỗi hiện có. Lỗi còn tồn tại thì lệnh trả mã khác 0. Không dùng `test.fail`, skip hay sửa kỳ vọng để biến lỗi nghiệp vụ thành PASS.
- Hai profile đặc biệt được runner phục hồi về cấu hình bản 41 khi kết thúc. Nếu máy/runner bị kill giữa chừng, chạy lại `node tests/e2e-infra/run.cjs up` trước lượt sau.
- Có thể thêm tên spec ở cuối, ví dụ `node tests/e2e/run.cjs test concurrency.spec.cjs`.

Đây là runner mới tập trung, không phải lệnh `npm run test:e2e` cũ trong frontend/admin. Bài Admin cũ vẫn được giữ nguyên để đối chiếu, không cần chạy cả hai bộ cùng lúc.

## Cách cô lập dữ liệu

Trước mỗi test, auto fixture kiểm tra nhãn Docker, trạng thái container, DSN restaurant_e2e và marker trong database. Sau đó TRUNCATE **chỉ schema test** và nạp lại seed bản 41. Không nhận database URL hoặc SQL từ dòng lệnh người dùng; các câu SQL trong support/spec chỉ phục vụ database test cố định đã xác minh.

ID hóa đơn/đơn/món/khoản thu được tạo mới và không tái sử dụng giữa các ca để tránh job hoặc thông báo cũ trỏ nhầm bản ghi mới. Fixture giữ ID menu/tài khoản/bàn chuẩn từ bản 41. Việc reset không phụ thuộc tài khoản còn đăng nhập được, vì ca lỗi có thể tạo username trùng; kiểm tra quyền sở hữu/DSN/marker vẫn bắt buộc.

Một file lock ở `.local` của e2e-infra ngăn hai runner nghiệp vụ chạy chung stack. Không chạy Postman/performance hay runner infra reset song song với suite. workers=1 để mỗi test có dữ liệu sạch; bên trong test tranh chấp vẫn gửi hai request đồng thời bằng Promise.all.

Sau mỗi lượt, runner reset dữ liệu test ngay cả khi có ca thất bại. Không sửa hoặc xóa dữ liệu demo; không sửa Java hay frontend để test đạt. Nếu cleanup thất bại thì lượt chạy trả mã lỗi. Các browser context tạo riêng cho vai trò được đóng bằng finally/fixture teardown.

## Phạm vi và cách đọc kết quả

- `admin.spec.cjs`: tách các phần Admin thành ca độc lập: món, ảnh, công thức, combo, kho, tài khoản, bàn/QR, nhật ký. Có cả kiểm tra giao diện và kiểm tra API ràng buộc.
- `browser-roles.spec.cjs`: đăng nhập/đăng xuất, gọi món/option/combo, lỗi mạng sau commit và gửi lại, liên thông Customer–POS–KDS–thu tiền mặt, đồng bộ hai POS.
- `additional-ui.spec.cjs`: gọi nhân viên, SLA có điều khiển đồng hồ, đơn hôm qua, lịch sử kho, in và reconnect WebSocket.
- `api-business.spec.cjs`, `payments.spec.cjs`: hậu điều kiện database/tổng tiền/giữ chỗ và các nhánh lỗi; không gọi các bài API thuần này là browser E2E.
- `concurrency.spec.cjs`: hai request thật, cùng MySQL, kiểm trạng thái cuối và số bản ghi; không mô phỏng khóa bằng mock repository.
- `vnpay.spec.cjs`: chữ ký callback cục bộ và luồng Return trên frontend; không khẳng định Sandbox ngân hàng đã hoạt động.
- `auto-cancel.spec.cjs`: scheduler thực với thời gian tăng tốc trong profile test.
- `known-gaps.spec.cjs` và ca username trùng: tái hiện các lỗi chưa sửa, tách lệnh để nhìn rõ baseline và phần còn tồn đọng. Không được coi suite chính đạt là đủ để tuyên bố mọi chức năng đều đạt.

ID trong tiêu đề liên kết với 74 kịch bản của TEST-MATRIX.md. Một ID có thể có nhiều test/biến thể; một test có thể đi qua nhiều ID. Số bài chạy khác số kịch bản ma trận. Các ca rộng như CRUD, phân quyền và mọi loại lỗi có thể mới kiểm được một số biến thể; đọc EXECUTION-COVERAGE.md thay vì coi việc xuất hiện ID là phủ kín mọi tổ hợp.

PAY-12 kiểm thử Sandbox thật được mô tả tại MANUAL-VNPAY.md. Không tạo test rỗng hoặc skip để giả nhận nó đã chạy. Bộ này không chứng minh khả năng chịu tải hay khắc phục các gap của code.

## Artifact

- `.local/summary-test.json`, `summary-vnpay.json`, `summary-auto-cancel.json`, `summary-known-gaps.json`: kết quả theo từng nhóm, tên ca, ID và thời gian.
- `.local/artifacts`: ảnh/trace khi lỗi, ảnh QR in. Trace có thể chứa token và dữ liệu tài khoản **test**; không công khai, không commit.
- `node tests/e2e/coverage.cjs` tổng hợp các nhóm đã chạy, xuất `.local/coverage.json` và `.local/coverage.md`. Nhóm chưa chạy ghi NOT_RUN, không tự coi PASS.

`test:list` chỉ liệt kê, không phải bằng chứng thực thi. Các file TEST-MATRIX.md/matrix.json vẫn là kế hoạch ban đầu; kết quả chạy nằm ở artifact và báo cáo tổng hợp.

## Trước khi đưa vào GitHub Actions

Ở bước CI, runner cần Node 22+, Docker/Compose và cài Playwright Chromium. Workflow sẽ dựng stack 41, gọi các suite, lưu artifact riêng tư và luôn down trong bước cuối. Chưa có workflow CI/CD trong bản 42.

**Chuyển từ bản 41:** cần chép cả cập nhật infra của bản 42 rồi reset stack một lần; schema thuần entity cũ không đủ để kết luận ràng buộc username/tên bàn. Các lần chạy sau có thể up thông thường. Ảnh upload nằm trong tmpfs của Backend, DB reset không dọn file ảnh; down/recreate Backend sẽ dọn phần này.

`all` chạy tuần tự test → vnpay → auto-cancel → known-gaps rồi tổng hợp coverage. Tiếp tục thu kết quả các nhóm nhưng mã thoát cuối khác 0 nếu bất kỳ nhóm nào lỗi. Hiện known-gaps chưa sửa nên all không được coi là xanh; khi sửa lỗi nghiệp vụ thì chuyển ca tương ứng vào suite chính. Đây là nhiều test độc lập chạy chung một lệnh, không phải một test dài duy nhất.
