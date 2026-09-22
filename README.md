
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


vấn đề :
    + nếu 1 món ăn bị làm sai nguyên liệu thì hệ thống phải xử lý như thế nào
    + khách hàng muốn thêm món thì làm sao để add được những món đó vào hóa đơn tổng luôn 
    + việc trừ nguyên liệu : nếu ta làm logic là khi đầu bếp nấu thì mới trừ nguyên liệu thì giờ đây vấn đề là nếu khách hàng order dồn dập nhiều đơn 1 món đó thì sao ?
    lúc này đơn chưa làm nên chưa trừ giải quyết là khi khách order thì ta sẽ trừ ảo trong kho lỡ như có hủy đơn hủy món thì cộng lại.



