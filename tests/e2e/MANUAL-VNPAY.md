# PAY-12 — VNPay Sandbox thực tế (chưa tự động hóa)

Profile vnpay của suite chỉ kiểm giao thức/chữ ký cục bộ; nó không chứng minh IPN từ VNPay tới server của bạn.

Thực hiện riêng trên staging/demo được chuẩn bị cho kiểm thử, không dùng tài khoản hoặc tiền thật:

1. Có merchant Sandbox, secret và IPN public đã cấu hình đúng dự án; giữ riêng trong secret của môi trường, không chép vào tests/e2e.
2. Dùng URL HTTPS truy cập được từ điện thoại cho Customer và callback Backend; kiểm tra QR bàn mở đúng Customer.
3. Gọi món/duyệt, tạo giao dịch Sandbox, hoàn tất thanh toán thử theo thông tin test chính thức của VNPay.
4. Kiểm tra IPN thực sự được nhận, xác minh chữ ký/số tiền/merchant; hóa đơn và collection chỉ ghi đúng một khoản.
5. Kiểm tra trình duyệt trở về trang kết quả Customer và nút về đúng bàn. Nếu IPN đến sau Return thì trang chờ và cập nhật khi dữ liệu xác nhận về.
6. Kiểm tra hủy trên trang thanh toán, IPN trùng và tình huống chưa rõ kết quả; không tự gán FAILED chỉ vì hết đồng hồ giao diện. Không phụ thuộc QueryDR đang tắt.
7. Ghi commit, thời điểm, mã giao dịch đã che bớt, trạng thái cuối và ảnh. Không xuất HashSecret/JWT/token kết quả vào báo cáo công khai.

Trạng thái tại thời điểm tạo bản 42: MANUAL_NOT_RUN. Không cộng vào số ca tự động đã đạt.
