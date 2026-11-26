# Ma trận kiểm thử nghiệp vụ E2E — bước 1

74 kịch bản dự kiến. P0 là luồng quan trọng cần ưu tiên trước phát hành; P1 là hồi quy đầy đủ. Đây là kế hoạch, không phải 74 test đã viết hoặc đã đạt.

Cột bằng chứng chỉ nói test cũ đang kiểm được gì. Mọi ca browser mới đều PLANNED/NOT_RUN cho đến bước 3. Các ca P0 chưa hoàn tất không tự được coi là đạt chỉ vì API có mã 200.

Một lệnh sẽ chạy nhiều ca độc lập. Luồng liên thông phải dùng các browser context riêng cho Customer, POS A/B và từng khu bếp, cùng Backend/MySQL thật trong môi trường test. Kiểm tra qua API là bổ sung, không thay thế thao tác/assertion giao diện.

## AUTH

| ID | Ưu tiên | Kịch bản | Kết quả cần kiểm tra | Bằng chứng hiện có |
|---|---|---|---|---|
| AUTH-01 | P0 | Đăng nhập Admin/POS/Bếp hợp lệ | Đúng vai trò, vào đúng giao diện; không ghi token vào báo cáo | API + Admin UI một phần |
| AUTH-02 | P0 | Sai mật khẩu hoặc username không tồn tại | Báo đăng nhập sai, không tạo phiên | Chưa có E2E |
| AUTH-03 | P0 | Không token, token giả/hết hạn gọi chức năng bảo vệ | 401; giao diện yêu cầu đăng nhập lại | API một phần |
| AUTH-04 | P0 | Tài khoản gọi API khác vai trò | 403 và dữ liệu không đổi | API một phần |
| AUTH-05 | P1 | Đăng xuất rồi Back/tải lại/truy cập URL riêng | Không sử dụng phiên cũ để thao tác | Chưa có E2E |
| AUTH-06 | P0 | Khách đăng ký topic POS/KDS/Admin trái phép | Bị từ chối; không lộ dữ liệu nội bộ | GAP đã phát hiện, chưa bảo vệ subscribe đầy đủ |

## ADMIN

| ID | Ưu tiên | Kịch bản | Kết quả cần kiểm tra | Bằng chứng hiện có |
|---|---|---|---|---|
| ADMIN-01 | P0 | Thêm/sửa món qua giao diện rồi tải lại | Giá, danh mục, thời gian nấu đúng sau tải lại | Admin UI một phần: dữ liệu tạo bằng API |
| ADMIN-02 | P1 | Tên rỗng, giá âm, dữ liệu món không hợp lệ | Chặn lưu; thông báo cụ thể, không tạo bản ghi | Chưa có E2E |
| ADMIN-03 | P1 | Xóa món chưa sử dụng / món đã phát sinh đơn | Theo ràng buộc nghiệp vụ, không làm hỏng đơn lịch sử | Chưa có E2E |
| ADMIN-04 | P1 | Quản lý danh mục và khu bếp liên kết | Lưu đúng liên kết, menu hiển thị đúng | Chưa có E2E |
| ADMIN-05 | P0 | Upload ảnh hợp lệ, lưu và truy cập lại | Ảnh thực sự tải được, đường dẫn bền sau reload | Admin UI một phần |
| ADMIN-06 | P1 | Ảnh sai loại, quá dung lượng hoặc nội dung hỏng | Chặn upload, không ghi file không hợp lệ | Unit/API một phần |
| ADMIN-07 | P0 | Thêm/sửa/xóa định lượng công thức | API và UI thống nhất; khả dụng món đổi đúng | Admin UI một phần: chỉ thêm |
| ADMIN-08 | P1 | Định lượng sai/thiếu nguyên liệu/công thức trùng | Chặn hoặc xử lý theo đặc tả; không tăng trùng ngoài ý muốn | Chưa có E2E |
| ADMIN-09 | P0 | Combo FIXED/PERCENT, thêm/sửa/xóa món con | Giá tính đúng, dữ liệu tồn tại sau reload | Admin UI một phần: thêm món con |
| ADMIN-10 | P1 | Combo rỗng, số lượng âm, giảm vượt giá | Xác minh quy tắc chặn/clamp theo đặc tả | Chưa có E2E |
| ADMIN-11 | P1 | Nhóm option SINGLE/MULTI và option thay đổi nguyên liệu | Lưu đúng giá/phần nguyên liệu; Customer chọn đúng | Chưa có E2E |
| ADMIN-12 | P0 | Thêm/sửa/xóa nguyên liệu | Tên, đơn vị, ngưỡng đúng; không sửa tồn ngoài phiếu | Chưa có E2E |
| ADMIN-13 | P0 | Nhập/xuất/điều chỉnh kho hợp lệ | Tồn mới và stock_transaction khớp, có nhật ký | API rời rạc; chưa có E2E |
| ADMIN-14 | P0 | Xuất quá tồn, số tiền/số lượng sai, gửi phiếu lỗi | Chặn; tồn và lịch sử không đổi | Chưa có E2E |
| ADMIN-15 | P1 | Lọc lịch sử kho theo ngày/loại | Đúng bản ghi và số lượng, trạng thái rỗng rõ ràng | Chưa có E2E |
| ADMIN-16 | P1 | Tạo/sửa/xóa nhân viên và username trùng | Vai trò đúng, tài khoản mới đăng nhập được; tên trùng bị chặn | Chưa có E2E |
| ADMIN-17 | P1 | Quản lý khu bếp và tài khoản bếp | Bếp chỉ nhận/thao tác đúng khu, liên kết không bị đứt | Chưa có E2E |
| ADMIN-18 | P0 | Tạo/sửa/xóa bàn, mã bàn trùng, bàn đang sử dụng | Không mất liên kết hóa đơn; bàn mới AVAILABLE | Admin UI một phần: chỉ mở form |
| ADMIN-19 | P0 | QR một bàn và nhiều bàn | Giải mã QR đúng URL/tableId; chế độ in không lẫn UI | Admin UI một phần: ảnh/print, chưa decode URL |
| ADMIN-20 | P1 | Thao tác Admin tạo nhật ký và tìm/lọc nhật ký | Đúng người, đối tượng, hành động và dữ liệu | Admin UI một phần: chỉ nhìn thấy vùng nhật ký |

## CUSTOMER

| ID | Ưu tiên | Kịch bản | Kết quả cần kiểm tra | Bằng chứng hiện có |
|---|---|---|---|---|
| CUSTOMER-01 | P0 | QR bàn hợp lệ, bàn không tồn tại hoặc thiếu ID | Đúng bàn/menu hoặc thông báo lỗi có hướng dẫn | Chưa có E2E |
| CUSTOMER-02 | P0 | Xem menu/chi tiết, chọn option và combo | Giá preview, số lượng và giới hạn lựa chọn đúng | Unit/API một phần |
| CUSTOMER-03 | P0 | Gửi món lẻ/option/combo hợp lệ | Một order mới; PENDING; POS thấy đơn; giữ nguyên liệu đúng | API rời rạc |
| CUSTOMER-04 | P0 | Thiếu kho, món không tồn tại, số lượng sai | Không tạo đơn một phần hoặc trừ kho; báo lý do | Chưa có E2E |
| CUSTOMER-05 | P0 | Gửi lại cùng idempotency key và payload | Cùng kết quả/mã đơn; không tăng giữ chỗ lần hai | API đã kiểm ở báo cáo 23/11, chưa UI |
| CUSTOMER-06 | P0 | Key trùng khác payload; key thiếu/sai định dạng | 409/400; không phát sinh đơn | API đã kiểm ở báo cáo 23/11 |
| CUSTOMER-07 | P0 | Mất mạng sau commit rồi gửi lại | Khôi phục cùng key, đúng một đơn; giỏ không mất khi chưa rõ kết quả | Chưa có browser fault injection |
| CUSTOMER-08 | P0 | Khách hủy món còn được phép / món đang nấu | Chỉ hủy trạng thái hợp lệ, giải phóng giữ chỗ và báo POS/KDS | Chưa có E2E |
| CUSTOMER-09 | P1 | Gọi nhân viên và lễ tân xác nhận đã xử lý | Hiện ở POS, xử lý xong không còn trong hàng đợi | Chưa có E2E |
| CUSTOMER-10 | P0 | Gửi đơn khi hóa đơn đã bắt đầu thu tiền | Bị chặn, không thêm món làm đổi tổng đã chốt | API rời rạc |
| CUSTOMER-11 | P1 | Trợ lý Hôm nay ăn gì | Mở/đóng không che nút và không mất giỏ; không coi UI là AI backend hoàn chỉnh | Chưa có E2E |

## POS

| ID | Ưu tiên | Kịch bản | Kết quả cần kiểm tra | Bằng chứng hiện có |
|---|---|---|---|---|
| POS-01 | P0 | Duyệt và từ chối món | Đúng trạng thái; hàng đợi, Customer và KDS cập nhật | Unit/API một phần |
| POS-02 | P1 | Từ chối/trả món thiếu lý do | Chặn, không đổi trạng thái hay số tiền | Chưa có E2E |
| POS-03 | P0 | Phục vụ chỉ món DONE | DONE → SERVED; lần lặp không ghi thêm | Unit/API một phần |
| POS-04 | P0 | Trả món và hoàn tác trả | Đúng trạng thái, tổng tiền và ngày trả; không tự hoàn nguyên liệu đã nấu | Unit/API một phần |
| POS-05 | P0 | Hủy hóa đơn chưa có món đưa vào nấu | Món kết thúc, KDS gỡ; bàn được xử lý đúng | Chưa có E2E |
| POS-06 | P0 | Hủy hóa đơn có món COOKING/DONE/SERVED | Bị từ chối, dữ liệu không đổi | Chưa có E2E |
| POS-07 | P0 | Trả bàn đã thanh toán; trả bàn còn OPEN | AVAILABLE khi hợp lệ; chặn khi còn OPEN | Unit bản 39, chưa DB race E2E |
| POS-08 | P0 | In tạm tính trước trả tiền / hóa đơn sau thanh toán | Tiêu đề đúng, không tính món inactive; đủ thông tin tiền khách đưa/thối | Chưa có E2E |
| POS-09 | P1 | Chờ duyệt qua mốc 5 và 10 phút | Cảnh báo tự đổi; không tự hủy món hoặc giải phóng giữ chỗ | GAP: hiện tính màu khi render |
| POS-10 | P1 | Tự đóng hóa đơn rỗng sau grace period | Đúng điều kiện, không đóng hóa đơn mới; POS/Customer được cập nhật | GAP: cần rà realtime tự đóng |

## KDS

| ID | Ưu tiên | Kịch bản | Kết quả cần kiểm tra | Bằng chứng hiện có |
|---|---|---|---|---|
| KDS-01 | P0 | Nhận món đã duyệt đúng khu | Realtime xuất hiện, không lộ thao tác khu khác | API một phần |
| KDS-02 | P0 | Bắt đầu nấu | CONFIRMED → COOKING; trừ BOM + option, ghi EXPORT một lần | API đã kiểm một phần |
| KDS-03 | P0 | Nấu lặp, món sai trạng thái hoặc khác khu | Chặn; tồn kho không bị trừ lần hai | API đã kiểm một phần |
| KDS-04 | P0 | Thiếu nguyên liệu khi bắt đầu nấu | Rollback cả trạng thái và phiếu kho | Chưa có E2E |
| KDS-05 | P0 | Hoàn thành và tự nấu món kế tiếp | Đúng DONE; chỉ auto-start món đúng khu và đủ kho | API đã kiểm một phần |
| KDS-06 | P1 | Đơn cũ, đồng hồ SLA cảnh báo/đỏ | Cảnh báo đúng mốc; không hủy món | Chưa có E2E |

## PAY

| ID | Ưu tiên | Kịch bản | Kết quả cần kiểm tra | Bằng chứng hiện có |
|---|---|---|---|---|
| PAY-01 | P0 | Thu đủ tiền mặt và khách đưa dư | PAID đúng một lần, tiền thối đúng; không bắt nhập lý do | API một phần, UI bản 38 chưa E2E |
| PAY-02 | P0 | Thu tiền mặt một phần rồi thu nốt | Số dư đúng, chỉ PAID khi đủ, không nhân đôi doanh thu | API đã kiểm một phần |
| PAY-03 | P0 | Khoản thu âm/0, chưa xác nhận, requestKey trùng khác dữ liệu | Chặn đúng mã lỗi; không ghi tiền | API một phần |
| PAY-04 | P0 | Chuyển khoản chưa xác minh rồi xác minh/loại minh chứng | Chưa cộng đã nhận khi chỉ EVIDENCE; xác minh một lần | API đã kiểm một phần |
| PAY-05 | P0 | MOCK: tạo/mở lại QR, webhook thành công lặp | Một khoản tiền, PAID một lần; đúng mã webhook secret | API đã kiểm một phần |
| PAY-06 | P0 | Webhook sai secret/sai số tiền/tham chiếu không tồn tại | Từ chối, không thay trạng thái tiền | Chưa đủ E2E |
| PAY-07 | P0 | QR hết hạn → thay QR → tiền mã cũ về muộn | Mã thay thế hợp lệ, lịch sử giữ; khoản dư có hồ sơ | API MOCK một phần |
| PAY-08 | P0 | Online chưa rõ kết quả → thu tiền mặt → IPN về sau | Không đóng/ghi doanh thu lần hai; thu dư được theo dõi | API một phần |
| PAY-09 | P0 | Hoàn tiền/ghép chứng từ với quyền Admin | Đúng hồ sơ REVIEW/REQUIRED/PROCESSING/COMPLETED; có audit | Chưa có E2E |
| PAY-10 | P0 | Return hợp lệ nhưng IPN chậm | Trang chưa báo thành công; khi DB đổi thì cập nhật | Unit/browser mock bản 37; không chạy cùng stack MOCK |
| PAY-11 | P0 | Return sai chữ ký, vé giả/hết hạn | Không lộ kết quả/bàn và không ghi nhận tiền | Unit + API một phần |
| PAY-12 | P1 | VNPay Sandbox QR → thanh toán → IPN → Return | Đúng Merchant, callback công khai, hóa đơn/collection khớp | Manual riêng; không phụ thuộc CI |

## CONCURRENT

| ID | Ưu tiên | Kịch bản | Kết quả cần kiểm tra | Bằng chứng hiện có |
|---|---|---|---|---|
| CONCURRENT-01 | P0 | Hai POS duyệt cùng món hoặc duyệt và từ chối | Một bên hợp lệ, bên còn lại lỗi trạng thái; UI cả hai cập nhật | Unit bản 40; chưa E2E DB song song |
| CONCURRENT-02 | P0 | Hai POS phục vụ/trả/hoàn tác cùng món | Mỗi chuyển trạng thái hợp lệ chỉ ghi một lần | Unit một phần |
| CONCURRENT-03 | P0 | Khách gửi đơn đồng thời POS trả bàn | Không kết thúc ở AVAILABLE nếu đang có OPEN mới | Unit bản 39; chưa E2E DB song song |
| CONCURRENT-04 | P0 | Hai bàn tranh phần nguyên liệu cuối | Chỉ đơn đủ tồn trừ giữ chỗ mới thành công; không oversell | Chưa có E2E |
| CONCURRENT-05 | P0 | Bếp nấu và khách hủy / POS từ chối đồng thời | Chỉ một kết quả hợp lệ; không trừ kho món đã hủy | Chưa có E2E |
| CONCURRENT-06 | P0 | Thu tiền đồng thời trả món/hủy/gửi thêm | Tổng chốt không đổi; trạng thái và số nhận nhất quán | Chưa có E2E |
| CONCURRENT-07 | P0 | IPN/webhook và thu thủ công chạy đồng thời | Không cộng đôi cùng khoản; phần thực nhận dư có hồ sơ | Chưa có E2E |
| CONCURRENT-08 | P1 | Mất WebSocket, thao tác rồi reconnect | Tải lại dữ liệu thật, không giữ trạng thái cũ | Chưa có E2E |
| CONCURRENT-09 | P1 | Database/API lỗi giữa thao tác ghi | Rollback; UI không báo thành công giả; retry có kiểm soát | Chưa có E2E |

## Quy tắc thực thi và bằng chứng

- Test độc lập: reset môi trường hoặc fixture mới; không dựa vào ca trước thành công.
- Ca tranh chấp dùng hai yêu cầu thực sự đồng thời và kiểm tra trạng thái cuối; chạy tuần tự chỉ kiểm tra yêu cầu cũ, không chứng minh khóa DB.
- Ghi commit, cấu hình, thời điểm, case ID, kết quả, ảnh/trace khi lỗi. Không xuất JWT, password hay webhook secret vào artifact công khai.
- Retry không che lỗi: lưu lần thất bại đầu và đánh dấu flaky khi chỉ đạt nhờ retry.
- MOCK cho tự động; VNPay Sandbox tách suite/manual vì phụ thuộc hệ thống bên ngoài. Các ca Return/IPN phải chạy profile VNPay riêng sau này, không sửa profile MOCK đang chuẩn bị.
- Không tự hủy PENDING theo thời gian: cảnh báo để nhân viên quyết định, như nghiệp vụ đã thống nhất.
- Bản 36 snapshot giá combo vẫn hoãn: ca đổi giá rồi trả một phần combo ghi KNOWN_GAP, không sửa kỳ vọng để che lỗi.
- Chống lộ topic nội bộ và realtime tự đóng hóa đơn là GAP đã biết, cần xử lý hoặc ghi nhận trước phát hành.

## Nguồn đối chiếu

- frontend/admin/e2e/admin.spec.ts: một bài UI dài, ảnh/công thức/combo/QR; không phải toàn bộ Admin.
- tests/api/Smart-POS.postman_collection.json: kiểm phân quyền và dữ liệu đầu vào, các mutation mặc định tắt; có request không đồng nghĩa đã bao phủ E2E.
- src/test/java: unit/integration hiện có, không đồng nghĩa browser E2E.
- report-assets/ket-qua-kiem-thu-2026-11-23.md: bằng chứng ở commit ghi trong báo cáo, không suy ra source hiện tại đều đạt.
