# Bối cảnh dự án — Restaurant Management (DACN-08-Nhom4D)

> File này dùng để cung cấp ngữ cảnh cho AI hỗ trợ code. Đưa nguyên file này vào đầu cuộc trò chuyện với AI để nó hiểu hiện trạng dự án trước khi hỏi/nhờ việc.

## 1. Tổng quan

- **Tên đề tài**: Hệ thống Quản lý Nhà hàng, Gọi món không chạm & Điều phối bếp thông minh (Smart POS & Realtime KDS)
- **Đồ án chuyên ngành**, nhóm DACN-08-Nhom4D, Khoa CNTT — Đại học Sài Gòn, 12 tuần
- **4 phân hệ nghiệp vụ**:
  - **Customer** — khách quét QR tại bàn, xem menu, gửi đơn, gọi nhân viên (không cần đăng nhập)
  - **KDS** (bếp) — theo khu bếp, nhận đơn đã duyệt, nấu, đánh dấu hoàn thành, trừ kho tự động
  - **Lễ tân (pos)** — duyệt/từ chối đơn trước khi xuống bếp, quản lý bàn/hóa đơn, thanh toán VietQR, xử lý gọi nhân viên
  - **Admin** — quản lý danh mục, món ăn, combo, nguyên vật liệu, công thức (BOM), tài khoản, bàn ăn, nhật ký hoạt động

## 2. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | Spring Boot 3.4.5, Java 21, Gradle (Kotlin DSL) |
| Database | MySQL, Spring Data JPA/Hibernate |
| Realtime | WebSocket (STOMP over SockJS) |
| Frontend | React.js |
| Root package | `com.sccgroup.restaurant_management` |

## 3. Cấu trúc thư mục hiện tại

```
com.sccgroup.restaurant_management/
├── domain/
│   ├── entity/          ← TOÀN BỘ 20 entity + enum của hệ thống nằm ở đây
│   └── repository/
│        ├── account
│        ├── menu
├── admin/
│   ├── controller/
│   ├── service/
│   └── (dto — chưa tạo)
├── customer/
│   ├── controller/       (chưa tạo)
│   ├── service/          (chưa tạo)
│   └── (dto — chưa tạo)
├── kds/
│   ├── controller/       (chưa tạo)
│   ├── service/          (chưa tạo)
│   └── (dto — chưa tạo)
├── pos/
│   ├── controller/       (chưa tạo)
│   ├── service/          (chưa tạo)
│   └── (dto — chưa tạo)
├── common/
│   ├──exception/        ← ErrorResponse, ResourceNotFoundException, BusinessException, GlobalExceptionHandler
│   ├──security/ ← AppUserPrincipal, JwtUtil,JwtAuthFilter,SecurityConfig,CustomUserDetailsService,AuthController
│     
├── config/
│   ├── CorsConfig
│   └── WebSocketConfig    ← STOMP endpoint /ws, broker /topic, prefix /app
└── RestaurantManagementApplication
```
lưu ý : khi viết Controller phải dựa vào SecurityConfig


**Quyết định kiến trúc quan trọng**: TẤT CẢ entity đặt chung trong `domain/entity` (không tách theo module), để tránh các module phải import chéo entity của nhau. Các module (`admin`, `customer`, `kds`, `pos`) chỉ chứa `controller`, `service`, `dto`, `repository` của riêng logic nghiệp vụ đó — còn `repository` của entity thì đặt cạnh entity trong `domain`.

Enum được đặt **cùng file/cùng package với entity dùng nó**, không có folder enum riêng.

## 4. Trạng thái Entity (20/20 — đã tạo xong phần khai báo, CHƯA viết Repository/Service/Controller cho đa số)

Tên bảng lưu ý tránh từ khóa SQL: `Table` → `restaurant_table`, `Order` → `customer_order`, `Option` → `food_option`.

| Entity | Bảng | Ghi chú |
|---|---|---|
| `RestaurantTable` | `restaurant_table` | có enum `TableStatus` |
| `Invoice` | `invoice` | enum `InvoiceStatus`, `PaymentMethod` |
| `Order` | `customer_order` | |
| `OrderCombo` | `order_combo` | |
| `OrderItem` | `order_item` | enum `OrderItemStatus` (PENDING→CONFIRMED/REJECTED→COOKING→DONE→SERVED) — **entity trung tâm của luồng nghiệp vụ** |
| `OrderItemOption` | `order_item_option` | |
| `CallStaffRequest` | `call_staff_request` | enum `CallStaffStatus` |
| `ActivityLog` | `activity_log` | không có FK thật (tham chiếu đa hình qua `accountType`/`targetType`) |
| `Category` | `category` | |
| `Food` | `food` | |
| `OptionGroup` | `option_group` | enum `SelectionType` |
| `Option` | `food_option` | enum `AdjustType` |
| `Combo` | `combo` | enum `DiscountType` |
| `ComboItem` + `ComboItemId` | `combo_item` | khóa chính ghép (`@EmbeddedId`) |
| `KitchenStation` | `kitchen_station` | **đã test xong** bằng `@DataJpaTest` với MySQL thật |
| `KitchenAccount` | `kitchen_account` | |
| `Ingredient` | `ingredient` | dùng `BigDecimal` cho số lượng, không dùng `double`/`float` |
| `Recipe` | `recipe` | = công thức BOM (định lượng nguyên liệu/món) |
| `StockTransaction` | `stock_transaction` | lịch sử nhập/xuất/điều chỉnh kho, enum `StockTransactionType` |
| `StaffAccount` | `staff_account` | enum `StaffRole` (ADMIN/LE_TAN), password phải băm bằng `BCryptPasswordEncoder`, chưa làm |

**Nguồn thiết kế**: `Database.dbml` + `DACN-08-Dac-Ta-Chuc-Nang.md` (đặc tả chức năng) — mọi entity đã đối chiếu khớp với 2 file này.

## 5. Hạ tầng dùng chung đã xong

### 5.1. Xử lý lỗi (`common/exception`)
- `ErrorResponse(code, message)` — định dạng JSON lỗi thống nhất toàn hệ thống
- `ResourceNotFoundException` → tự động trả HTTP 404
- `BusinessException` → tự động trả HTTP 400 (dùng cho lỗi vi phạm quy tắc nghiệp vụ, ví dụ duyệt đơn đã xử lý rồi)
- `GlobalExceptionHandler` (`@RestControllerAdvice`) bắt exception tự động, Controller/Service **chỉ cần `throw`**, không cần tự viết `try-catch`/tự format response

### 5.2. WebSocket (`config/WebSocketConfig`)
- Endpoint bắt tay: `/ws` (dùng SockJS fallback)
- Broker: `/topic/**` (server → client, broadcast theo địa chỉ, ví dụ `/topic/kds/{stationId}`)
- Prefix: `/app/**` (client → server, ít dùng trong dự án này)
- Cách dùng: sau khi `save()` dữ liệu qua REST API, gọi `simpMessagingTemplate.convertAndSend("/topic/...", dto)` để đẩy cập nhật realtime
- Đã test thông bằng REST + STOMP client HTML tạm thời — **hạ tầng đã xác nhận chạy được, chưa gắn vào nghiệp vụ thật**



## . Quy ước code cần tuân thủ chung

- Tiền và số lượng nguyên liệu: luôn dùng `BigDecimal`, không dùng `double`/`float`
- Ngày giờ: dùng `LocalDateTime` (java.time), không dùng `java.util.Date`
- Enum: luôn `@Enumerated(EnumType.STRING)`, không dùng mặc định (ORDINAL)
- Quan hệ `@ManyToOne`/`@OneToOne`: luôn set `fetch = FetchType.LAZY` (mặc định JPA là EAGER, dễ gây N+1 query)
- Không trả entity JPA trực tiếp ra Controller — luôn qua DTO (tránh lộ field nhạy cảm như `passwordHash`, tránh lỗi `LazyInitializationException`)
- Lỗi nghiệp vụ: `throw` `ResourceNotFoundException`/`BusinessException`, không tự viết `try-catch` trả JSON thủ công
