# Kết quả đối chiếu ma trận — 26/11/2026

Bản chụp kết quả local của bản 42. Chạy coverage.cjs để tạo kết quả mới trong .local.

- IMPLEMENTED_VARIANTS_PASS: những biến thể đã viết và chạy đều đạt, không đồng nghĩa mọi biến thể trong dòng ma trận đã được phủ kín.
- HAS_FAILED_VARIANTS: có ca thực thi đang lỗi; xem KNOWN-GAPS.md.
- MANUAL_NOT_RUN: chưa kiểm Sandbox thực tế.
- API-only không phải browser E2E. CRUD/validation/phân quyền còn biến thể chưa tự động hóa đầy đủ; xem giới hạn trong KNOWN-GAPS.md.

# Execution coverage

2026-11-26T09:07:40.427Z

Implemented variants passing does not mean complete business coverage. API-only cases are not browser E2E. PAY-12 remains manual.

- test: passed; passed=97, failed=0
- vnpay: passed; passed=4, failed=0
- auto-cancel: passed; passed=2, failed=0
- known-gaps: failed; passed=0, failed=4

| ID | Scenario | Result of implemented variants |
|---|---|---|
| AUTH-01 | Đăng nhập Admin/POS/Bếp hợp lệ | IMPLEMENTED_VARIANTS_PASS |
| AUTH-02 | Sai mật khẩu hoặc username không tồn tại | IMPLEMENTED_VARIANTS_PASS |
| AUTH-03 | Không token, token giả/hết hạn gọi chức năng bảo vệ | IMPLEMENTED_VARIANTS_PASS |
| AUTH-04 | Tài khoản gọi API khác vai trò | IMPLEMENTED_VARIANTS_PASS |
| AUTH-05 | Đăng xuất rồi Back/tải lại/truy cập URL riêng | IMPLEMENTED_VARIANTS_PASS |
| AUTH-06 | Khách đăng ký topic POS/KDS/Admin trái phép | HAS_FAILED_VARIANTS |
| ADMIN-01 | Thêm/sửa món qua giao diện rồi tải lại | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-02 | Tên rỗng, giá âm, dữ liệu món không hợp lệ | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-03 | Xóa món chưa sử dụng / món đã phát sinh đơn | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-04 | Quản lý danh mục và khu bếp liên kết | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-05 | Upload ảnh hợp lệ, lưu và truy cập lại | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-06 | Ảnh sai loại, quá dung lượng hoặc nội dung hỏng | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-07 | Thêm/sửa/xóa định lượng công thức | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-08 | Định lượng sai/thiếu nguyên liệu/công thức trùng | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-09 | Combo FIXED/PERCENT, thêm/sửa/xóa món con | HAS_FAILED_VARIANTS |
| ADMIN-10 | Combo rỗng, số lượng âm, giảm vượt giá | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-11 | Nhóm option SINGLE/MULTI và option thay đổi nguyên liệu | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-12 | Thêm/sửa/xóa nguyên liệu | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-13 | Nhập/xuất/điều chỉnh kho hợp lệ | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-14 | Xuất quá tồn, số tiền/số lượng sai, gửi phiếu lỗi | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-15 | Lọc lịch sử kho theo ngày/loại | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-16 | Tạo/sửa/xóa nhân viên và username trùng | HAS_FAILED_VARIANTS |
| ADMIN-17 | Quản lý khu bếp và tài khoản bếp | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-18 | Tạo/sửa/xóa bàn, mã bàn trùng, bàn đang sử dụng | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-19 | QR một bàn và nhiều bàn | IMPLEMENTED_VARIANTS_PASS |
| ADMIN-20 | Thao tác Admin tạo nhật ký và tìm/lọc nhật ký | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-01 | QR bàn hợp lệ, bàn không tồn tại hoặc thiếu ID | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-02 | Xem menu/chi tiết, chọn option và combo | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-03 | Gửi món lẻ/option/combo hợp lệ | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-04 | Thiếu kho, món không tồn tại, số lượng sai | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-05 | Gửi lại cùng idempotency key và payload | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-06 | Key trùng khác payload; key thiếu/sai định dạng | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-07 | Mất mạng sau commit rồi gửi lại | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-08 | Khách hủy món còn được phép / món đang nấu | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-09 | Gọi nhân viên và lễ tân xác nhận đã xử lý | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-10 | Gửi đơn khi hóa đơn đã bắt đầu thu tiền | IMPLEMENTED_VARIANTS_PASS |
| CUSTOMER-11 | Trợ lý Hôm nay ăn gì | IMPLEMENTED_VARIANTS_PASS |
| POS-01 | Duyệt và từ chối món | IMPLEMENTED_VARIANTS_PASS |
| POS-02 | Từ chối/trả món thiếu lý do | IMPLEMENTED_VARIANTS_PASS |
| POS-03 | Phục vụ chỉ món DONE | IMPLEMENTED_VARIANTS_PASS |
| POS-04 | Trả món và hoàn tác trả | IMPLEMENTED_VARIANTS_PASS |
| POS-05 | Hủy hóa đơn chưa có món đưa vào nấu | IMPLEMENTED_VARIANTS_PASS |
| POS-06 | Hủy hóa đơn có món COOKING/DONE/SERVED | IMPLEMENTED_VARIANTS_PASS |
| POS-07 | Trả bàn đã thanh toán; trả bàn còn OPEN | IMPLEMENTED_VARIANTS_PASS |
| POS-08 | In tạm tính trước trả tiền / hóa đơn sau thanh toán | IMPLEMENTED_VARIANTS_PASS |
| POS-09 | Chờ duyệt qua mốc 5 và 10 phút | HAS_FAILED_VARIANTS |
| POS-10 | Tự đóng hóa đơn rỗng sau grace period | IMPLEMENTED_VARIANTS_PASS |
| KDS-01 | Nhận món đã duyệt đúng khu | IMPLEMENTED_VARIANTS_PASS |
| KDS-02 | Bắt đầu nấu | IMPLEMENTED_VARIANTS_PASS |
| KDS-03 | Nấu lặp, món sai trạng thái hoặc khác khu | IMPLEMENTED_VARIANTS_PASS |
| KDS-04 | Thiếu nguyên liệu khi bắt đầu nấu | IMPLEMENTED_VARIANTS_PASS |
| KDS-05 | Hoàn thành và tự nấu món kế tiếp | IMPLEMENTED_VARIANTS_PASS |
| KDS-06 | Đơn cũ, đồng hồ SLA cảnh báo/đỏ | IMPLEMENTED_VARIANTS_PASS |
| PAY-01 | Thu đủ tiền mặt và khách đưa dư | IMPLEMENTED_VARIANTS_PASS |
| PAY-02 | Thu tiền mặt một phần rồi thu nốt | IMPLEMENTED_VARIANTS_PASS |
| PAY-03 | Khoản thu âm/0, chưa xác nhận, requestKey trùng khác dữ liệu | IMPLEMENTED_VARIANTS_PASS |
| PAY-04 | Chuyển khoản chưa xác minh rồi xác minh/loại minh chứng | IMPLEMENTED_VARIANTS_PASS |
| PAY-05 | MOCK: tạo/mở lại QR, webhook thành công lặp | IMPLEMENTED_VARIANTS_PASS |
| PAY-06 | Webhook sai secret/sai số tiền/tham chiếu không tồn tại | IMPLEMENTED_VARIANTS_PASS |
| PAY-07 | QR hết hạn → thay QR → tiền mã cũ về muộn | IMPLEMENTED_VARIANTS_PASS |
| PAY-08 | Online chưa rõ kết quả → thu tiền mặt → IPN về sau | IMPLEMENTED_VARIANTS_PASS |
| PAY-09 | Hoàn tiền/ghép chứng từ với quyền Admin | IMPLEMENTED_VARIANTS_PASS |
| PAY-10 | Return hợp lệ nhưng IPN chậm | IMPLEMENTED_VARIANTS_PASS |
| PAY-11 | Return sai chữ ký, vé giả/hết hạn | IMPLEMENTED_VARIANTS_PASS |
| PAY-12 | VNPay Sandbox QR → thanh toán → IPN → Return | MANUAL_NOT_RUN |
| CONCURRENT-01 | Hai POS duyệt cùng món hoặc duyệt và từ chối | IMPLEMENTED_VARIANTS_PASS |
| CONCURRENT-02 | Hai POS phục vụ/trả/hoàn tác cùng món | IMPLEMENTED_VARIANTS_PASS |
| CONCURRENT-03 | Khách gửi đơn đồng thời POS trả bàn | IMPLEMENTED_VARIANTS_PASS |
| CONCURRENT-04 | Hai bàn tranh phần nguyên liệu cuối | IMPLEMENTED_VARIANTS_PASS |
| CONCURRENT-05 | Bếp nấu và khách hủy / POS từ chối đồng thời | IMPLEMENTED_VARIANTS_PASS |
| CONCURRENT-06 | Thu tiền đồng thời trả món/hủy/gửi thêm | IMPLEMENTED_VARIANTS_PASS |
| CONCURRENT-07 | IPN/webhook và thu thủ công chạy đồng thời | IMPLEMENTED_VARIANTS_PASS |
| CONCURRENT-08 | Mất WebSocket, thao tác rồi reconnect | IMPLEMENTED_VARIANTS_PASS |
| CONCURRENT-09 | Database/API lỗi giữa thao tác ghi | IMPLEMENTED_VARIANTS_PASS |
