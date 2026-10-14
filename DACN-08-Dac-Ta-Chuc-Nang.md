# TÀI LIỆU ĐẶC TẢ CHỨC NĂNG

## 262701-DACN-08 — Hệ thống Quản lý Nhà hàng và Gọi món Thông minh (Smart POS & KDS)

## 1. Giới thiệu hệ thống

Hệ thống gồm **4 phân hệ (module) độc lập**, mỗi phân hệ là một giao diện web riêng phục vụ đúng một nhóm người dùng. Các phân hệ chia sẻ chung một cơ sở dữ liệu và đồng bộ với nhau theo thời gian thực.

| Phân hệ                | Người dùng                      | Đăng nhập |
|------------------------|---------------------------------|-----------|
| **I. Khách hàng**      | Khách ngồi tại bàn              | Không     |
| **II. Lễ tân**         | Nhân viên phục vụ kiêm thu ngân | Có        |
| **III. Nhà bếp (KDS)** | Đầu bếp, theo từng khu bếp      | Có        |
| **IV. Admin/Quản lý**  | Chủ quán, quản lý               | Có        |

Đơn vị dữ liệu trung tâm xuyên suốt cả 3 module I–III là **Order** (đơn gọi món) và **OrderItem** (từng món trong đơn). Mỗi món trong đơn có vòng đời trạng thái riêng, được các module khác nhau cập nhật và theo dõi:

```
pending → confirmed → cooking → done → served → returned
  └──────→ rejected                      ↑________|
                                      (lễ tân có thể chuyển qua lại)
```

- pending: khách vừa gửi, chờ lễ tân xử lý
- confirmed: lễ tân đã duyệt, chờ bếp
- rejected: lễ tân từ chối (hết món, nghi ngờ order rác…)
- cooking: bếp đang chế biến — **thời điểm trừ kho nguyên liệu theo BOM**
- done: bếp chế biến xong
- served: nhân viên đã mang ra bàn
- returned: món bị trả lại sau khi đã phục vụ (ví dụ sai món, khách không hài lòng) — do lễ tân đánh dấu, và lễ tân cũng có thể hoàn tác (chuyển ngược lại served) nếu đánh dấu nhầm

Lý do từ chối (rejected) và lý do trả món (returned) dùng chung một trường ghi chú duy nhất (note), thay vì tách riêng mỗi trạng thái một cột lý do.

Chi tiết chức năng của từng module được trình bày ở các phần dưới.

## I. PHÂN HỆ KHÁCH HÀNG

Truy cập bằng cách quét mã QR giấy dán cố định tại bàn (mỗi mã QR gắn với một số bàn cụ thể, không đổi). Không yêu cầu đăng nhập hay tài khoản.

### 1. Xem thực đơn

Hiển thị danh sách món ăn theo danh mục (khai vị, món chính, tráng miệng…) và danh mục **Combo** riêng. Mỗi món hiển thị ảnh, tên, giá, mô tả ngắn, và trạng thái còn/hết hàng.

### 2. Trạng thái còn/hết hàng tự động, kèm số lượng ước tính

Khách không thấy được số liệu tồn kho nguyên liệu, nhưng thấy được **số lượng suất món còn làm được** (ví dụ “còn 6 suất”) — con số này được tính từ nguyên liệu, không phải hiển thị thẳng số lượng nguyên liệu. Cách tính: lấy định lượng mỗi nguyên liệu cần cho món đó, chia cho tồn kho hiện có, rồi lấy giá trị nhỏ nhất trong tất cả nguyên liệu liên quan (nguyên liệu khan hiếm nhất quyết định số suất tối đa).

Để tránh phải tính lại công thức này mỗi lần có người xem menu, hệ thống giữ một bộ đếm số lượng trong bộ nhớ (RAM) dùng chung cho mọi khách, chỉ tính đầy đủ một lần khi khởi động hệ thống. Bộ đếm này đồng thời giải quyết một vấn đề quan trọng: vì nguyên liệu trong kho chỉ thực sự bị trừ khi bếp bấm “Nấu”, nếu không có cơ chế giữ chỗ thì hai khách có thể cùng gọi món cuối cùng và cả hai đều được chấp nhận do kho chưa kịp thay đổi. Vì vậy, bộ đếm này được trừ ngay khi khách gửi đơn (giữ chỗ tức thì), và được cộng lại nếu đơn đó bị hủy hoặc từ chối trước khi tới bếp — tách biệt với tồn kho thật trong kho, vốn chỉ thay đổi khi bếp thực sự bắt đầu chế biến.

### 3. Tùy chọn món ăn (Option)

Với món có tùy chọn (ví dụ size, độ cay, thêm/bớt nguyên liệu), khách chọn từ danh sách tùy chọn cố định do nhà hàng thiết lập sẵn, không tự nhập tự do. Tùy vào cách admin cấu hình, một tùy chọn có thể làm thay đổi giá món (ví dụ chọn size lớn hơn), chỉ ảnh hưởng đến nguyên liệu bên trong mà không đổi giá (ví dụ “không hành”), hoặc cả hai cùng lúc.

### 4. Gọi món combo có tùy chỉnh

Với món trong Combo, khách vẫn áp dụng được tùy chọn riêng cho từng món con bên trong combo đó, y hệt như khi gọi món lẻ.

### 5. Gửi đơn gọi món

Sau khi chọn xong món, khách gửi đơn — hệ thống tạo một **Order mới**. Mỗi lần khách gửi thêm món (kể cả trong cùng bữa ăn) sẽ tạo ra một Order mới riêng biệt, không gộp vào Order trước đó, để mỗi đơn giữ được mốc thời gian và trạng thái xử lý độc lập của nó.

### 6. Theo dõi trạng thái đơn theo thời gian thực

Khách xem được trạng thái hiện tại của từng món đã gọi (đang chờ duyệt / đã duyệt / đang nấu / đã xong / đã phục vụ), cập nhật tức thời không cần tải lại trang. Khi đơn bị từ chối, khách được thông báo kèm lý do cụ thể — không để đơn biến mất mà không rõ nguyên nhân.

### 7. Xem thời gian chế biến dự kiến

Với món đang trong trạng thái “đang nấu”, khách thấy được thời gian dự kiến còn lại trước khi món hoàn thành, dựa trên thời gian chế biến chuẩn của món đó.

### 8. Hủy đơn

Khách được tự hủy một Order bất cứ lúc nào miễn là món trong đơn đó chưa chuyển sang trạng thái “đang nấu”. Một khi bếp đã bắt đầu chế biến (nguyên liệu đã bị trừ khỏi kho), khách không thể tự hủy được nữa.

### 9. Gọi nhân viên

Khách bấm nút gọi nhân viên khi cần hỗ trợ; yêu cầu này được gửi ngay lập tức tới phân hệ Lễ tân, kèm theo số bàn để nhân viên biết cần đến đâu.

## II. PHÂN HỆ LỄ TÂN

Người dùng đăng nhập bằng tài khoản riêng. Vai trò: theo dõi đơn, xử lý yêu cầu của khách, và thu ngân. Không đảm nhiệm việc cấu hình dữ liệu (menu, kho…) — phần đó thuộc phân hệ Admin.

### 1. Duyệt / từ chối đơn gọi món

Xem danh sách các Order đang ở trạng thái chờ duyệt. Với mỗi đơn, lễ tân có thể:

- **Duyệt** — đơn chuyển sang trạng thái đã duyệt và được đẩy xuống bếp ngay lập tức
- **Từ chối** — bắt buộc nhập lý do (ví dụ hết nguyên liệu, nghi ngờ đơn không hợp lệ); khách nhận được thông báo kèm lý do này

Đây là bước lọc bắt buộc trước khi bất kỳ đơn nào đến được bếp, nhằm ngăn các đơn không hợp lệ (ví dụ mã QR bị quét từ xa ngoài nhà hàng).

### 2. Theo dõi tiến độ chế biến theo bàn

Với mỗi Order đã duyệt, lễ tân xem được danh sách các món bên trong dưới dạng checklist, tự động cập nhật theo tiến độ bếp báo về theo thời gian thực. Đây là thông tin tham khảo thụ động, phục vụ việc trả lời khách khi được hỏi món đã tới đâu — hệ thống không chủ động báo hiệu hay cảnh báo khi một order hoàn tất, vì thực tế bếp ra món nào sẽ có người phục vụ xử lý ngay món đó.

### 3. Nhận cảnh báo món trễ tiến độ

Nếu một món đã quá thời gian chế biến dự kiến mà bếp vẫn chưa đánh dấu hoàn thành, lễ tân nhận được cảnh báo để có thể chủ động xử lý (nhắc bếp, thông báo khách…).

### 4. Nhận và xử lý yêu cầu gọi nhân viên

Khi khách bấm gọi nhân viên, lễ tân nhận thông báo kèm số bàn, và có thể đánh dấu đã xử lý xong để tắt thông báo.

### 5. Nhận thông báo khi đơn bị khách hủy

Khi khách tự hủy một Order, lễ tân được thông báo để nắm được tình hình, tránh bối rối khi thấy đơn biến mất khỏi danh sách theo dõi.

### 6. Đánh dấu món bị trả lại

Với món đã ở trạng thái “đã phục vụ”, nếu phát sinh vấn đề (sai món, khách không hài lòng…), lễ tân có thể chuyển món đó sang trạng thái “trả món”, kèm ghi chú lý do. Lễ tân cũng có thể hoàn tác thao tác này (chuyển ngược lại “đã phục vụ”) nếu đánh dấu nhầm.

### 7. Xem tổng quan trạng thái các bàn

Xem trạng thái hiện tại (trống / đang phục vụ) của toàn bộ các bàn trong nhà hàng, được sắp xếp theo tầng và số hiệu bàn để dễ định vị.

### 8. Thanh toán hóa đơn

Khi khách yêu cầu thanh toán, lễ tân mở hóa đơn của bàn đó — hóa đơn tự động gộp tất cả các Order đã gọi trong suốt lượt khách ngồi ăn (xem chi tiết cơ chế ở mục “Quy tắc nghiệp vụ chung”). Lễ tân chọn hình thức thanh toán:

- **Tiền mặt**: nhập số tiền khách đưa, hệ thống tự tính tiền thối lại, in hóa đơn ghi rõ tổng tiền / tiền khách đưa / tiền thối
- **Chuyển khoản**: hệ thống sinh mã QR chuyển khoản động, gắn riêng với hóa đơn đó (đúng số tiền, đúng nội dung). Hệ thống tự động đối chiếu với giao dịch ngân hàng thực tế để xác nhận đã thanh toán mà không cần lễ tân xác nhận thủ công *(chức năng nâng cao, có thể triển khai ở mức xác nhận thủ công nếu thời gian không cho phép)*

Sau khi thanh toán, hóa đơn được in ra, và bàn tự động chuyển về trạng thái trống.

## III. PHÂN HỆ NHÀ BẾP (KDS — Kitchen Display System)

Mỗi khu bếp (bếp nóng, bếp nguội, bar…) có một tài khoản đăng nhập riêng dùng chung cho những người làm việc trong khu đó — không phân biệt theo từng cá nhân đầu bếp.

### 1. Xem danh sách món cần chế biến

Sau khi đăng nhập bằng tài khoản của khu bếp mình, màn hình hiển thị **toàn bộ món trong hệ thống**, không ẩn món của khu khác — để các khu bếp nhìn thấy tiến độ của nhau, phối hợp thời điểm hoàn thành món cho cùng một bàn. Trong đó, các món **thuộc đúng khu bếp đang đăng nhập** (được cấu hình sẵn ở phân hệ Admin) được hiển thị nổi bật, đẩy lên đầu danh sách; món của khu khác vẫn hiển thị nhưng ở vị trí phụ, chỉ để tham khảo tiến độ — đầu bếp không thao tác “Nấu”/“Xong” được lên món không thuộc khu mình.

### 2. Hiển thị theo đơn (Order)

Các món được nhóm lại theo Order (và ngầm định theo bàn) thay vì hiển thị rời rạc từng món, giúp bếp nhận biết món nào cần hoàn thành cùng lúc để phục vụ trọn vẹn một bàn.

### 3. Bắt đầu chế biến (“Nấu”)

Bếp bấm nút “Nấu” cho một món cụ thể khi bắt đầu thực hiện. Hành động này:

- Chuyển trạng thái món sang “đang nấu”
- **Trừ ngay lập tức nguyên liệu trong kho** theo định lượng (BOM) của món đó

- Bắt đầu tính thời gian chế biến để so sánh với thời gian dự kiến (phục vụ cảnh báo SLA)
- Là mốc chốt cuối cùng cho việc hủy đơn — từ đây trở đi, không ai (kể cả khách) có thể hủy món này được nữa

### 4. Hoàn thành món (“Xong”)

Bếp bấm nút “Xong” khi món đã chế biến hoàn tất. Hệ thống báo ngay cho phân hệ Lễ tân biết món đã sẵn sàng.

### 5. Không cho phép hoàn tác

Một khi món đã chuyển sang “đang nấu” hoặc “xong”, không thể bấm lùi lại trạng thái trước đó, nhằm đảm bảo dữ liệu kho đã trừ luôn chính xác và nhất quán.

### 6. Hiển thị cảnh báo thời gian

Mỗi món đang nấu hiển thị thời gian đã trôi qua so với thời gian chế biến dự kiến, đổi màu/cảnh báo khi vượt ngưỡng, giúp bếp tự ưu tiên món nào cần đẩy nhanh.

## IV. PHÂN HỆ ADMIN / QUẢN LÝ

Người dùng đăng nhập bằng tài khoản riêng, đảm nhiệm việc cấu hình toàn bộ dữ liệu vận hành của nhà hàng.

### 1. Quản lý danh mục và món ăn

Thêm/sửa/xóa danh mục món ăn; thêm/sửa/xóa từng món ăn với tên, giá, ảnh, mô tả; gán món vào danh mục.

### 2. Quản lý tùy chọn món ăn (Option)

Với mỗi món, thiết lập các lựa chọn tùy chọn riêng của món đó (ví dụ: Size S/M/L, thêm trứng, không hành…), gắn vào một nhóm tùy chọn (OptionGroup) dùng chung cho biết cách chọn (bắt buộc chọn đúng 1, hay chọn tự do nhiều lựa chọn).

Mỗi lựa chọn không bị ép thuộc một “loại” cố định nào — mỗi lựa chọn có thể độc lập mang theo:

- Một mức giá chênh lệch (nếu lựa chọn đó làm đổi giá món, ví dụ chọn size lớn hơn)
- Một hệ số nhân định lượng nguyên liệu (nếu lựa chọn đó làm tăng/giảm toàn bộ công thức theo tỉ lệ, ví dụ scale theo size)

- Một điều chỉnh nguyên liệu cụ thể — cộng thêm hoặc bớt đi một lượng nguyên liệu nhất định (ví dụ “thêm trứng”, “không hành”)

Khi tính giá và trừ kho cho một món đã áp dụng tùy chọn, hệ thống chỉ đơn giản áp dụng tất cả những gì lựa chọn đó có cấu hình — không cần biết trước “loại” của lựa chọn là gì. Nhờ vậy, một lựa chọn hoàn toàn có thể vừa làm đổi giá vừa điều chỉnh một nguyên liệu cụ thể cùng lúc, nếu admin cấu hình như vậy.

### 3. Quản lý Combo

Tạo Combo bằng cách chọn gộp các món ăn có sẵn lại với nhau. Khi tạo, admin định giá combo theo một trong hai cách: nhập số tiền cụ thể, hoặc nhập phần trăm giảm giá để hệ thống tự tính từ tổng giá các món con. Combo hiển thị trong một danh mục riêng trên thực đơn khách hàng.

### 4. Quản lý nguyên liệu và định lượng (BOM)

Thêm/sửa/xóa nguyên liệu, khai báo đơn vị tính. Với mỗi món ăn, thiết lập công thức định lượng: món đó cần bao nhiêu của mỗi loại nguyên liệu. Đơn vị nhập kho (ví dụ kg, lít) và đơn vị dùng trong công thức (ví dụ gram, ml) có thể khác nhau — hệ thống tự động quy đổi.

### 5. Quản lý tồn kho

Ghi nhận nhập kho, điều chỉnh số lượng tồn (hao hụt, kiểm kê), xem lịch sử nhập/xuất. Thiết lập ngưỡng cảnh báo tồn kho thấp cho từng nguyên liệu — khi tồn kho chạm ngưỡng, hệ thống cảnh báo cho admin (không hiển thị công khai cho khách).

### 6. Quản lý bàn

Thêm/sửa/xóa bàn, khai báo tầng và số hiệu cho từng bàn. Xem tổng quan trạng thái toàn bộ các bàn (trống/đang phục vụ), sắp xếp theo tầng và số hiệu.

### 7. Tạo và in mã QR cho bàn

Chọn một hoặc nhiều bàn, xuất ra một file chứa mã QR tương ứng của các bàn đó để mang đi in và dán tại bàn.

### 8. Quản lý tài khoản đăng nhập

Tạo tài khoản (chỉ gồm tên đăng nhập và mật khẩu) cho các vai trò cần đăng nhập: lễ tân, và từng khu bếp. Hệ thống không quản lý hồ sơ nhân sự (không lương, không ca làm) — tài khoản chỉ nhằm mục đích xác định ai đã thực hiện một hành động, phục vụ việc ghi log.

### 9. Xem nhật ký hoạt động (log)

Xem lại lịch sử các hành động quan trọng đã thực hiện trong hệ thống (duyệt/từ chối đơn, thanh toán, sửa menu/kho…) kèm tài khoản đã thực hiện và thời điểm.

### 10. Báo cáo *(chức năng mở rộng, không bắt buộc)*

- Doanh thu theo ngày/tuần/tháng hoặc theo khoảng thời gian tùy chọn
- Món bán chạy nhất, món bán chậm nhất
- Tình trạng tồn kho và lịch sử nhập/xuất nguyên liệu
- Các chỉ số vận hành: thời gian xử lý trung bình một đơn, tỷ lệ đơn bị từ chối/hủy

## V. QUY TẮC NGHIỆP VỤ CHUNG

Các quy tắc dưới đây áp dụng xuyên suốt nhiều phân hệ, không thuộc riêng một module nào:

### Gộp hóa đơn theo bàn (không cần bước “mở bàn” thủ công)

Hóa đơn (Invoice) đóng luôn vai trò gộp các đơn trong một lượt khách ngồi ăn, không cần thêm bước “mở phiên” riêng:

- Khi Order đầu tiên của một bàn được gửi và bàn đó chưa có hóa đơn nào đang mở, hệ thống tự động tạo một hóa đơn mới, đồng thời chuyển trạng thái bàn sang “đang phục vụ”
- Mọi Order tiếp theo của cùng bàn, trong lúc hóa đơn đó vẫn đang mở, sẽ tự động được gộp vào hóa đơn đó

- Nếu tất cả Order thuộc hóa đơn đều bị hủy hoặc từ chối hết (không còn đơn nào hợp lệ), hóa đơn **không** đóng hay xóa ngay lập tức — vì hóa đơn vẫn có giá trị tham khảo/lịch sử. Hệ thống chờ một khoảng thời gian nhất định (có thể cấu hình); nếu hết thời gian đó vẫn không phát sinh Order hợp lệ mới nào, hóa đơn mới chuyển sang trạng thái **“đã hủy”**, và bàn quay về trạng thái trống cùng lúc
- Khi lễ tân thanh toán, hóa đơn chuyển sang trạng thái đã thanh toán và bàn quay về trạng thái trống

Trạng thái hóa đơn gồm 3 giá trị: **đang mở** (open) → **đã thanh toán** (paid) hoặc **đã hủy** (cancelled).

### Trạng thái món ăn còn/hết hàng được suy ra tự động

Không có công tắc thủ công để đánh dấu món “hết hàng”. Hệ thống liên tục so sánh tồn kho hiện có với định lượng nguyên liệu cần để làm ra món đó (bao gồm cả ảnh hưởng của các tùy chọn) — nếu không đủ nguyên liệu, món tự động hiển thị “tạm hết” trên thực đơn khách hàng. Với Combo, chỉ cần một món con bên trong hết hàng là cả Combo cũng hiển thị hết.

### Thời điểm trừ kho

Nguyên liệu chỉ bị trừ khỏi kho tại đúng một thời điểm duy nhất: **khi bếp bấm bắt đầu chế biến (“Nấu”)** cho món đó — không phải lúc khách gửi đơn, cũng không phải lúc lễ tân duyệt. Điều này đảm bảo kho chỉ phản ánh nguyên liệu thực sự đã được sử dụng.
