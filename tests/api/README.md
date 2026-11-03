# Kiểm thử tất cả REST API Smart POS

Bộ Postman bao phủ **78 endpoint REST** hiện có trong controller, gồm Admin, xác thực chung, khách hàng, bếp (KDS), và `/api/test`. Có **110 lượt gọi**, gồm CRUD, đọc lại dữ liệu đã ghi, kiểm tra quyền và một số đầu vào sai. Đây là kiểm thử tích hợp API; không có nghĩa đã kiểm tra mọi nhánh nghiệp vụ hoặc giao diện.

## Chuẩn bị (Mac và Windows)

Cần Docker Desktop đang chạy và Node.js 22 trở lên. Mở terminal tại thư mục dự án:

```sh
cd tests/api
npm ci
npm run up
```

Lệnh `up` tạo lại **riêng project Docker `dacn-api-test`**, dựng backend từ code hiện tại và nạp database mẫu + fixture thử. Backend kiểm thử ở `http://localhost:18080`. Database thử nằm trong bộ nhớ của container, tách khỏi database của ứng dụng ở cổng 3307. Mỗi lần `up` sẽ xóa dữ liệu kiểm thử cũ. Không sửa compose chính, mã FE hoặc BE.

## Dùng Postman

1. Chọn **Import**, nhập `Smart-POS.postman_collection.json` và `Local-Test.postman_environment.json` trong thư mục này.
2. Chọn environment **Smart POS · Disposable Docker :18080**.
3. Chọn collection → **Run collection**. Chạy tất cả thư mục theo thứ tự, **1 iteration**, không chạy song song. Token và ID được lưu tự động trong collection sau các request tạo/đăng nhập.
4. Xem kết quả từng request và assertion trong Runner. `PASS` nghĩa là phản hồi khớp điều kiện kiểm tra; ví dụ `/api/test/error` trả **404** là đúng thiết kế và được tính PASS.

Trước mỗi lần chạy lại toàn bộ collection, chạy `npm run up` để làm mới fixture KDS, tồn kho và yêu cầu gọi nhân viên; bộ test có kiểm tra chuyển trạng thái nên không thể chạy lặp trên cùng dữ liệu đã thay đổi. Sau khi import lại collection, chạy từ đầu để nhận token/ID mới.

Environment dùng tài khoản demo `admin.demo` / `Admin@123` chỉ trong database thử. Collection có chặn chạy ngoài environment thử tại localhost:18080. Không đổi URL sang database thật: các request có tạo đơn, hủy món, trừ kho và xóa dữ liệu CRUD.

## Chạy tự động, không cần mở Postman

```sh
npm run verify
```

Lệnh này tạo lại môi trường thử, chạy cùng collection bằng [Newman chính thức của Postman](https://github.com/postmanlabs/newman), rồi ghi:

- `results/report.md`: bảng PASS/FAIL, mã HTTP và lỗi theo request.
- `results/report.json`: kết quả dạng dữ liệu, chỉ xuất thông tin kiểm tra, không xuất JWT/mật khẩu.

Mã thoát khác 0 khi có kiểm tra lỗi. `npm test` chỉ chạy bộ test trên môi trường đã khởi động và chưa dùng. Khi xong:

```sh
npm run down
```

Có thể để môi trường thử đang chạy để xem request trong Postman, nhưng cần `npm run up` trước lần chạy collection tiếp theo. Lệnh `down` chỉ dừng và xóa container của project kiểm thử.

## Phạm vi và cách đọc kết quả

- [COVERAGE.md](COVERAGE.md) liệt kê từng method + đường dẫn được bao phủ. `python3 build_collection.py` tái tạo collection và kiểm tra các mapping REST trực tiếp trong controller. Python chỉ cần khi chỉnh/tạo lại bộ test, không cần khi chạy bằng Postman/Newman.
- Kiểm tra Admin gồm CRUD, dữ liệu đọc lại sau cập nhật, lịch sử kho, nhật ký, tài khoản, và 401/403.
- Khách hàng: menu, chi tiết món, khả dụng, đặt món lẻ, hóa đơn, hủy món, gọi nhân viên và chống tạo yêu cầu trùng.
- KDS: fixture có sẵn hai món `CONFIRMED`, thuộc khu bếp riêng; kiểm tra hai API bắt đầu nấu, trừ kho một lần và chuyển sang `DONE`. Fixture được nạp trực tiếp vào DB thử vì code hiện tại chưa có API duyệt đơn của POS.
- IMPORT/EXPORT/ADJUST được kiểm tra theo cách BE hiện tại hoạt động: ADJUST cộng lượng nhập vào tồn hiện có.
- `/api/test/broadcast` chỉ kiểm tra HTTP tiếp nhận lệnh. Chưa kiểm chứng client nhận sự kiện WebSocket/STOMP. WebSocket, hiệu năng, đồng thời và mọi tổ hợp món/combo/option nằm ngoài bộ này.
- Không có endpoint POS/thanh toán trong các controller hiện tại; không tạo request giả để đủ số lượng.

Nếu cổng 18080 bị chiếm, dừng dịch vụ đang chiếm cổng trước. Nếu backend không lên, xem `docker compose -f compose.yml logs backend db`. Không chạy riêng file `fixtures.sql` trên DB đang dùng.

Request upload ảnh dùng `fixtures/food.png`. Trong Postman, đặt working directory là `tests/api` hoặc chọn lại file này tại trường multipart `file` trước khi chạy collection. Newman dùng fixture tự động.
