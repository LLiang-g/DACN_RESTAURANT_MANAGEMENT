# Các vấn đề được tái hiện — chưa sửa code nghiệp vụ

Chạy `node tests/e2e/run.cjs known-gaps` để tái hiện. Bốn ca dưới đây trả FAIL vì ứng dụng chưa đạt kỳ vọng; không dùng skip/test.fail để coi là PASS.

| ID | Quan sát thực tế | Kỳ vọng | Ghi chú |
|---|---|---|---|
| AUTH-06 | WebSocket không đăng nhập nhận được MESSAGE từ /topic/pos sau khi có thao tác | Topic nội bộ phải kiểm quyền | Chỉ thử trên dữ liệu giả của restaurant_e2e; cần bảo vệ subscribe, không chỉ giới hạn origin |
| POS-09 | Sau khi chuyển đồng hồ sang quá 5 phút, thẻ vẫn là order-card, chưa đổi warm nếu không có render khác | Cảnh báo chờ duyệt tự cập nhật theo thời gian | Không đề xuất tự hủy PENDING; giữ đúng nghiệp vụ nhân viên quyết định |
| ADMIN-09 | Trả/từ chối một phần combo: tổng từ 5.000đ thành 4.000đ khi giá món hiện tại tăng 1.000đ | Giá lịch sử không đổi theo giá Admin sửa sau đặt | Liên quan bản 36 đang hoãn; bản 42 không áp dụng snapshot hoặc sửa dữ liệu cũ |
| ADMIN-16 | Username trùng bị UNIQUE chặn, nhưng API trả 500 INTERNAL_ERROR | Lỗi nghiệp vụ 400/409 và thông báo rõ ràng, không tạo tài khoản mới | Không phải đã tạo thêm tài khoản trên schema đúng; số tài khoản vẫn giữ nguyên |

## Đính chính quan trọng về schema test

Bản 41 dựng schema thuần entity, thiếu UNIQUE username vốn được khai báo trong SQL init. Kết quả “tạo được username trùng” ở môi trường đó không đủ để kết luận database demo cũng bị như vậy. Bản 42 đã đổi hạ tầng: DDL nền trích từ SQL init, không có dòng dữ liệu demo; Hibernate update bổ sung entity hiện tại; boot reset rồi seed riêng. Bốn ca trong bảng đã được chạy lại trên schema này. Vấn đề username còn lại là xử lý lỗi HTTP 500.

## Những phần chưa được chứng minh hoàn toàn

- PAY-12: giao dịch VNPay Sandbox qua mạng thật/IPN public, chưa chạy; xem MANUAL-VNPAY.md.
- Hai ca auto-cancel đạt chỉ kiểm điều kiện và trạng thái database. Chưa chứng minh POS/Customer nhận realtime khi job tự đóng hóa đơn; đường phát sự kiện này vẫn cần rà/bổ sung.
- AUTH-03 đang kiểm token không hợp lệ và API không token; chưa có biến thể JWT có chữ ký đúng nhưng hết hạn. Tên ca ban đầu ghi expired đã được sửa thành invalid để đúng phạm vi.
- ADMIN-03 mới kiểm xóa món chưa sử dụng, chưa chứng minh toàn bộ nhánh xóa món đã tham chiếu. Tên ca đã bỏ phần referenced food protected.
- CRUD, validation, ảnh và quyền có một số biến thể đã chạy, không phải mọi tổ hợp đầu vào. Giới hạn ảnh lớn/chứng từ đặc biệt và toàn bộ nhánh lỗi mạng cần bổ sung theo yêu cầu phát hành.
- Trang PaymentResultPage hiện đọc token lúc nạp module. Ca vé hết hạn mở lại tài liệu sau khi đổi fragment, giống đường chuyển trang từ Backend; chưa kiểm/khắc phục việc chỉ đổi hash trong tài liệu đang mở.
- Chưa chạy workflow GitHub Actions hoặc migration database lịch sử; đây là kiểm thử local Docker/Linux containers với Edge headless trên Windows.

Suite chính xanh không đồng nghĩa đã xong mọi vấn đề. Khi xử lý lỗi nghiệp vụ, chuyển ca liên quan vào suite chính; không giữ mãi trong nhóm tách riêng để bỏ qua khi đánh giá deploy.
