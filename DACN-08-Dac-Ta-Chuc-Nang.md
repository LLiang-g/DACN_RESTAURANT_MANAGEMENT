# **TÀI LIỆU ĐẶC TẢ CHỨC NĂNG**

## **262701-DACN-08 — Hệ thống Quản lý Nhà hàng và Gọi món Thông minh (Smart POS & KDS)**

## **1\. Giới thiệu hệ thống**

Hệ thống gồm **4 phân hệ (module) độc lập**, mỗi phân hệ là một giao diện web riêng phục vụ đúng một nhóm người dùng. Các phân hệ chia sẻ chung một cơ sở dữ liệu và đồng bộ với nhau theo thời gian thực.

| Phân hệ | Người dùng | Đăng nhập |
| :---- | :---- | :---- |
| **I. Khách hàng** | Khách ngồi tại bàn | Không |
| **II. Lễ tân** | Nhân viên phục vụ kiêm thu ngân | Có |
| **III. Nhà bếp (KDS)** | Đầu bếp, theo từng khu bếp | Có |
| **IV. Admin/Quản lý** | Chủ quán, quản lý | Có |

Đơn vị dữ liệu trung tâm xuyên suốt cả 3 module I–III là **Order** (đơn gọi món) và **OrderItem** (từng món trong đơn). Mỗi món trong đơn có vòng đời trạng thái riêng, được các module khác nhau cập nhật và theo dõi:

pending → confirmed → cooking → done → served  
&nbsp;&nbsp;&nbsp;└──────→ rejected

* pending: khách vừa gửi, chờ lễ tân xử lý

* confirmed: lễ tân đã duyệt, chờ bếp

* rejected: lễ tân từ chối (hết món, nghi ngờ order rác…)

* cooking: bếp đang chế biến — **thời điểm trừ kho nguyên liệu theo BOM**

* done: bếp chế biến xong

* served: nhân viên đã mang ra bàn

Chi tiết chức năng của từng module được trình bày ở các phần dưới.

## **I. PHÂN HỆ KHÁCH HÀNG**

Truy cập bằng cách quét mã QR giấy dán cố định tại bàn (mỗi mã QR gắn với một số bàn cụ thể, không đổi). Không yêu cầu đăng nhập hay tài khoản.

### **1\. Xem thực đơn**

Hiển thị danh sách món ăn theo danh mục (khai vị, món chính, tráng miệng…) và danh mục **Combo** riêng. Mỗi món hiển thị ảnh, tên, giá, mô tả ngắn, và trạng thái còn/hết hàng.

### **2\. Trạng thái còn/hết hàng tự động**

Khách không thấy được số liệu tồn kho, chỉ thấy món “còn” hoặc “tạm hết”. Trạng thái này do hệ thống tự tính dựa trên nguyên liệu thực tế còn trong kho, không phải do nhân viên tự bật/tắt.

### **3\. Tùy chọn món ăn (Option)**

Với món có tùy chọn (ví dụ size, độ cay, thêm/bớt nguyên liệu), khách chọn từ danh sách tùy chọn cố định do nhà hàng thiết lập sẵn, không tự nhập tự do. Một số tùy chọn (như size) làm thay đổi giá món; các tùy chọn khác (như “không hành”) không đổi giá.

### **4\. Gọi món combo có tùy chỉnh**

Với món trong Combo, khách vẫn áp dụng được tùy chọn riêng cho từng món con bên trong combo đó, y hệt như khi gọi món lẻ.

### **5\. Gửi đơn gọi món**

Sau khi chọn xong món, khách gửi đơn — hệ thống tạo một **Order mới**. Mỗi lần khách gửi thêm món (kể cả trong cùng bữa ăn) sẽ tạo ra một Order mới riêng biệt, không gộp vào Order trước đó, để mỗi đơn giữ được mốc thời gian và trạng thái xử lý độc lập của nó.

### **6\. Theo dõi trạng thái đơn theo thời gian thực**

Khách xem được trạng thái hiện tại của từng món đã gọi (đang chờ duyệt / đã duyệt / đang nấu / đã xong / đã phục vụ), cập nhật tức thời không cần tải lại trang. Khi đơn bị từ chối, khách được thông báo kèm lý do cụ thể — không để đơn biến mất mà không rõ nguyên nhân.

### **7\. Xem thời gian chế biến dự kiến**

Với món đang trong trạng thái “đang nấu”, khách thấy được thời gian dự kiến còn lại trước khi món hoàn thành, dựa trên thời gian chế biến chuẩn của món đó.

### **8\. Hủy đơn**

Khách được tự hủy một Order bất cứ lúc nào miễn là món trong đơn đó chưa chuyển sang trạng thái “đang nấu”. Một khi bếp đã bắt đầu chế biến (nguyên liệu đã bị trừ khỏi kho), khách không thể tự hủy được nữa.

### **9\. Gọi nhân viên**

Khách bấm nút gọi nhân viên khi cần hỗ trợ; yêu cầu này được gửi ngay lập tức tới phân hệ Lễ tân, kèm theo số bàn để nhân viên biết cần đến đâu.

## **II. PHÂN HỆ LỄ TÂN**

Người dùng đăng nhập bằng tài khoản riêng. Vai trò: theo dõi đơn, xử lý yêu cầu của khách, và thu ngân. Không đảm nhiệm việc cấu hình dữ liệu (menu, kho…) — phần đó thuộc phân hệ Admin.

### **1\. Duyệt / từ chối đơn gọi món**

Xem danh sách các Order đang ở trạng thái chờ duyệt. Với mỗi đơn, lễ tân có thể: \- **Duyệt** — đơn chuyển sang trạng thái đã duyệt và được đẩy xuống bếp ngay lập tức \- **Từ chối** — bắt buộc nhập lý do (ví dụ hết nguyên liệu, nghi ngờ đơn không hợp lệ); khách nhận được thông báo kèm lý do này

Đây là bước lọc bắt buộc trước khi bất kỳ đơn nào đến được bếp, nhằm ngăn các đơn không hợp lệ (ví dụ mã QR bị quét từ xa ngoài nhà hàng).

### **2\. Theo dõi tiến độ chế biến theo bàn**

Với mỗi Order đã duyệt, lễ tân thấy danh sách các món bên trong dưới dạng checklist, tự động cập nhật theo tiến độ bếp báo về theo thời gian thực. Khi toàn bộ món trong một Order đều đã chế biến xong, hệ thống tự động phát tín hiệu nổi bật (ví dụ đổi màu, hiện huy hiệu) để lễ tân biết đơn đó đã sẵn sàng mang ra phục vụ trọn vẹn.

### **3\. Nhận cảnh báo món trễ tiến độ**

Nếu một món đã quá thời gian chế biến dự kiến mà bếp vẫn chưa đánh dấu hoàn thành, lễ tân nhận được cảnh báo để có thể chủ động xử lý (nhắc bếp, thông báo khách…).

### **4\. Nhận và xử lý yêu cầu gọi nhân viên**

Khi khách bấm gọi nhân viên, lễ tân nhận thông báo kèm số bàn, và có thể đánh dấu đã xử lý xong để tắt thông báo.

### **5\. Nhận thông báo khi đơn bị khách hủy**

Khi khách tự hủy một Order, lễ tân được thông báo để nắm được tình hình, tránh bối rối khi thấy đơn biến mất khỏi danh sách theo dõi.

### **6\. Xem tổng quan trạng thái các bàn**

Xem trạng thái hiện tại (trống / đang phục vụ) của toàn bộ các bàn trong nhà hàng, được sắp xếp theo tầng và số hiệu bàn để dễ định vị.

### **7\. Thanh toán hóa đơn**

Khi khách yêu cầu thanh toán, lễ tân mở hóa đơn của bàn đó — hóa đơn tự động gộp tất cả các Order đã gọi trong suốt lượt khách ngồi ăn (xem chi tiết cơ chế ở mục “Quy tắc nghiệp vụ chung”). Lễ tân chọn hình thức thanh toán:

* **Tiền mặt**: nhập số tiền khách đưa, hệ thống tự tính tiền thối lại, in hóa đơn ghi rõ tổng tiền / tiền khách đưa / tiền thối

* **Chuyển khoản**: hệ thống sinh mã QR chuyển khoản động, gắn riêng với hóa đơn đó (đúng số tiền, đúng nội dung). Hệ thống tự động đối chiếu với giao dịch ngân hàng thực tế để xác nhận đã thanh toán mà không cần lễ tân xác nhận thủ công *(chức năng nâng cao, có thể triển khai ở mức xác nhận thủ công nếu thời gian không cho phép)*

Sau khi thanh toán, hóa đơn được in ra, và bàn tự động chuyển về trạng thái trống.

## **III. PHÂN HỆ NHÀ BẾP (KDS — Kitchen Display System)**

Mỗi khu bếp (bếp nóng, bếp nguội, bar…) có một tài khoản đăng nhập riêng dùng chung cho những người làm việc trong khu đó — không phân biệt theo từng cá nhân đầu bếp.

### **1\. Xem danh sách món cần chế biến**

Sau khi đăng nhập bằng tài khoản của khu bếp mình, màn hình chỉ hiển thị các món thuộc đúng loại món mà khu đó phụ trách (được cấu hình sẵn ở phân hệ Admin) — ví dụ tài khoản “Bếp nóng” chỉ thấy món chiên/xào, tài khoản “Bar” chỉ thấy đồ uống. Việc lọc này diễn ra tự động, đầu bếp không cần thao tác chọn lại mỗi lần.

### **2\. Hiển thị theo đơn (Order)**

Các món được nhóm lại theo Order (và ngầm định theo bàn) thay vì hiển thị rời rạc từng món, giúp bếp nhận biết món nào cần hoàn thành cùng lúc để phục vụ trọn vẹn một bàn.

### **3\. Bắt đầu chế biến (“Nấu”)**

Bếp bấm nút “Nấu” cho một món cụ thể khi bắt đầu thực hiện. Hành động này: \- Chuyển trạng thái món sang “đang nấu” \- **Trừ ngay lập tức nguyên liệu trong kho** theo định lượng (BOM) của món đó \- Bắt đầu tính thời gian chế biến để so sánh với thời gian dự kiến (phục vụ cảnh báo SLA) \- Là mốc chốt cuối cùng cho việc hủy đơn — từ đây trở đi, không ai (kể cả khách) có thể hủy món này được nữa

### **4\. Hoàn thành món (“Xong”)**

Bếp bấm nút “Xong” khi món đã chế biến hoàn tất. Hệ thống báo ngay cho phân hệ Lễ tân biết món đã sẵn sàng.

### **5\. Không cho phép hoàn tác**

Một khi món đã chuyển sang “đang nấu” hoặc “xong”, không thể bấm lùi lại trạng thái trước đó, nhằm đảm bảo dữ liệu kho đã trừ luôn chính xác và nhất quán.

### **6\. Hiển thị cảnh báo thời gian**

Mỗi món đang nấu hiển thị thời gian đã trôi qua so với thời gian chế biến dự kiến, đổi màu/cảnh báo khi vượt ngưỡng, giúp bếp tự ưu tiên món nào cần đẩy nhanh.

## **IV. PHÂN HỆ ADMIN / QUẢN LÝ**

Người dùng đăng nhập bằng tài khoản riêng, đảm nhiệm việc cấu hình toàn bộ dữ liệu vận hành của nhà hàng.

### **1\. Quản lý danh mục và món ăn**

Thêm/sửa/xóa danh mục món ăn; thêm/sửa/xóa từng món ăn với tên, giá, ảnh, mô tả; gán món vào danh mục.

### **2\. Quản lý tùy chọn món ăn (Option)**

Với mỗi món, thiết lập các nhóm tùy chọn riêng của món đó: \- **Tùy chọn loại “size”**: mỗi lựa chọn (S/M/L…) có mức giá chênh lệch riêng và hệ số nhân định lượng nguyên liệu riêng \- **Tùy chọn khác** (thêm/bớt nguyên liệu, ví dụ “thêm trứng”, “không hành”): chỉ điều chỉnh nguyên liệu cụ thể trong công thức, không ảnh hưởng giá

### **3\. Quản lý Combo**

Tạo Combo bằng cách chọn gộp các món ăn có sẵn lại với nhau. Khi tạo, admin định giá combo theo một trong hai cách: nhập số tiền cụ thể, hoặc nhập phần trăm giảm giá để hệ thống tự tính từ tổng giá các món con. Combo hiển thị trong một danh mục riêng trên thực đơn khách hàng.

### **4\. Quản lý nguyên liệu và định lượng (BOM)**

Thêm/sửa/xóa nguyên liệu, khai báo đơn vị tính. Với mỗi món ăn, thiết lập công thức định lượng: món đó cần bao nhiêu của mỗi loại nguyên liệu. Đơn vị nhập kho (ví dụ kg, lít) và đơn vị dùng trong công thức (ví dụ gram, ml) có thể khác nhau — hệ thống tự động quy đổi.

### **5\. Quản lý tồn kho**

Ghi nhận nhập kho, điều chỉnh số lượng tồn (hao hụt, kiểm kê), xem lịch sử nhập/xuất. Thiết lập ngưỡng cảnh báo tồn kho thấp cho từng nguyên liệu — khi tồn kho chạm ngưỡng, hệ thống cảnh báo cho admin (không hiển thị công khai cho khách).

### **6\. Quản lý bàn**

Thêm/sửa/xóa bàn, khai báo tầng và số hiệu cho từng bàn. Xem tổng quan trạng thái toàn bộ các bàn (trống/đang phục vụ), sắp xếp theo tầng và số hiệu.

### **7\. Tạo và in mã QR cho bàn**

Chọn một hoặc nhiều bàn, xuất ra một file chứa mã QR tương ứng của các bàn đó để mang đi in và dán tại bàn.

### **8\. Quản lý tài khoản đăng nhập**

Tạo tài khoản (chỉ gồm tên đăng nhập và mật khẩu) cho các vai trò cần đăng nhập: lễ tân, và từng khu bếp. Hệ thống không quản lý hồ sơ nhân sự (không lương, không ca làm) — tài khoản chỉ nhằm mục đích xác định ai đã thực hiện một hành động, phục vụ việc ghi log.

### **9\. Xem nhật ký hoạt động (log)**

Xem lại lịch sử các hành động quan trọng đã thực hiện trong hệ thống (duyệt/từ chối đơn, thanh toán, sửa menu/kho…) kèm tài khoản đã thực hiện và thời điểm.

### **10\. Báo cáo *(chức năng mở rộng, không bắt buộc)***

* Doanh thu theo ngày/tuần/tháng hoặc theo khoảng thời gian tùy chọn

* Món bán chạy nhất, món bán chậm nhất

* Tình trạng tồn kho và lịch sử nhập/xuất nguyên liệu

* Các chỉ số vận hành: thời gian xử lý trung bình một đơn, tỷ lệ đơn bị từ chối/hủy

## **V. QUY TẮC NGHIỆP VỤ CHUNG**

Các quy tắc dưới đây áp dụng xuyên suốt nhiều phân hệ, không thuộc riêng một module nào:

### **Gộp hóa đơn theo bàn (không cần bước “mở bàn” thủ công)**

Hóa đơn (Invoice) đóng luôn vai trò gộp các đơn trong một lượt khách ngồi ăn, không cần thêm bước “mở phiên” riêng: \- Khi Order đầu tiên của một bàn được gửi và bàn đó chưa có hóa đơn nào đang mở, hệ thống tự động tạo một hóa đơn mới, đồng thời chuyển trạng thái bàn sang “đang phục vụ” \- Mọi Order tiếp theo của cùng bàn, trong lúc hóa đơn đó vẫn đang mở, sẽ tự động được gộp vào hóa đơn đó \- Nếu tất cả Order thuộc hóa đơn đều bị hủy hoặc từ chối hết (không còn đơn nào hợp lệ), hóa đơn tự động đóng lại và bàn quay về trạng thái trống \- Khi lễ tân thanh toán, hóa đơn chuyển sang trạng thái đã thanh toán và bàn quay về trạng thái trống

### **Trạng thái món ăn còn/hết hàng được suy ra tự động**

Không có công tắc thủ công để đánh dấu món “hết hàng”. Hệ thống liên tục so sánh tồn kho hiện có với định lượng nguyên liệu cần để làm ra món đó (bao gồm cả ảnh hưởng của các tùy chọn) — nếu không đủ nguyên liệu, món tự động hiển thị “tạm hết” trên thực đơn khách hàng. Với Combo, chỉ cần một món con bên trong hết hàng là cả Combo cũng hiển thị hết.

### **Thời điểm trừ kho**

Nguyên liệu chỉ bị trừ khỏi kho tại đúng một thời điểm duy nhất: **khi bếp bấm bắt đầu chế biến (“Nấu”)** cho món đó — không phải lúc khách gửi đơn, cũng không phải lúc lễ tân duyệt. Điều này đảm bảo kho chỉ phản ánh nguyên liệu thực sự đã được sử dụng.