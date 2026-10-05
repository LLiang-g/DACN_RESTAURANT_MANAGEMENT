
backend : springboot
fontend : react js
database : MySQL    

Dependentcies : Spring Web, Spring Data JPA, MySQL DRIVER 

Ở đây trả lời cho câu hỏi tại sao hệ thống được thiết kế như thế này thế kia ?

kiến trúc đồ án : ta lựa chọn xây dựng theo kiểu sẽ chia ra từng model từng chức năng cho mỗi vị trí cần thiết. 
vậy nên lựa chọn theo kiểu Domain/Feature-based structure là khá hợp lý
ta sẽ k bám vào 1 cấu trúc CRUD thuần túy.

phải biểu diễn kho : trừ nguyên liệu trong kho khi và khi nhà bếp bắt đầu chế biến 
phiếu nhập hàng :


vấn đề nghiệp vụ :
- nếu 1 món ăn bị làm sai nguyên liệu thì hệ thống phải xử lý như thế nào
- khách hàng muốn thêm món thì làm sao để add được những món đó vào hóa đơn tổng luôn
- việc trừ nguyên liệu : nếu ta làm logic là khi đầu bếp nấu thì mới trừ nguyên liệu thì giờ đây vấn đề là nếu khách hàng order dồn dập nhiều đơn 1 món đó thì sao ?
lúc này đơn chưa làm nên chưa trừ giải quyết là khi khách order thì ta sẽ trừ ảo trong kho lỡ như có hủy đơn hủy món thì cộng lại.
- phân khu bếp nóng và bếp lạnh : ở đây về mặt thực tế bếp nóng và bếp lạnh hoàn toàn có thể giao tiếp với nhau bằng giọng nói vật lý, hệ thống không 
thể hoàn tàn cô lập các món bếp nóng bếp lạnh nấu độc lập với nhau được, phải có sự hài hòa nên ở mỗi phân khu bếp hệ thống vẫn sẽ hiện tiến độ món ở phân khu khác
- nếu món ăn bị hủy hết thì hóa đơn phải như nào ?
- nếu 1 hóa đơn k hợp lệ thì hệ thống kiểm tra qua hóa đơn đó cần set time out bao lâu để hóa đơn tự chuyển sang cancelled

- nếu như có 1 món ăn đã nấu vì lý do nào đó khách k nhận thì giờ đây lễ tân có được phép bỏ món đó ra khỏi hóa đơn để khỏi phải tính tiền phần đó không
vấn đề ở đây là xử lý việc này như nào và quyền hạn của lễ tân ra sao là tốt nhất nếu xảy ra trường hợp này


có thứ gì đó :
- CallStaffRequest là một yêu cầu "gọi nhân viên" do khách bấm nút trên giao diện gọi món, để lễ tân biết bàn nào đang cần hỗ trợ (hỏi món, xin thêm nước, thanh toán...). 
- Vì sao cần bảng riêng thay vì chỉ gửi thông báo qua WebSocket
- Không mất yêu cầu: nếu lễ tân đang mất kết nối hoặc chưa mở màn hình, yêu cầu vẫn nằm trong DB với trạng thái PENDING, khi mở lại vẫn thấy danh sách chưa xử lý.
- Tránh trùng lặp: khách bấm nhiều lần thì kiểm tra được bàn đó đã có yêu cầu PENDING chưa. 
- Đo được chất lượng phục vụ: resolvedAt - createdAt cho biết mất bao lâu mới có người đến bàn, phục vụ cho thống kê sau này.

Khách bấm "Gửi đơn"

    → POST /api/customer/orders (REST, HTTP thường)
    → Server lưu OrderItem vào MySQL (status = PENDING)
    → Server gọi messagingTemplate.convertAndSend("/topic/kds/1", dto)
    → Mọi client đang subscribe "/topic/kds/1" nhận được dto ngay lập tức
    → Màn hình KDS bếp nóng tự cập nhật giao diện, không cần F5Điểm cần chú ý : khách không gửi qua WebSocket — khách vẫn gọi REST API như bình thường (đúng, đơn giản, dễ debug).
    WebSocket chỉ dùng ở chiều server → client để thông báo, sau khi dữ liệu đã lưu chắc chắn vào DB.