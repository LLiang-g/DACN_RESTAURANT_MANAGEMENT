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
├── frontend/
│   ├── admin
│   ├── customer
│   ├── pos
│   └── kds
└── backend/
    ├── domain/
    │   ├── entity/          ← TOÀN BỘ 20 entity + enum của hệ thống nằm ở đây
    │   ├──repository/
    │   ├── account    ← KitchenAccountRepository, StaffAccountRepository
    │   ├── menu
    │   └──service    ← InvoiceService
    ├── admin/
    │   ├── controller/
    │   ├── service/
    │   └── dto/
    ├── customer/
    │   ├── controller/       
    │   ├── service/          
    │   └── dto/
    ├── kds/
    │   ├── controller/       
    │   ├── service/          
    │   └── dto/
    ├── pos/
    │   ├── controller/      
    │   ├── service/          
    │   └── dto/ 
    ├── common/
    │   ├──exception/        ← ErrorResponse, ResourceNotFoundException, BusinessException, GlobalExceptionHandler
    │   ├──security/      ← AppUserPrincipal, JwtUtil,JwtAuthFilter,SecurityConfig,CustomUserDetailsService,AuthController
    │     
    ├── config/
    │   ├── CorsConfig
    │   └── WebSocketConfig    ← STOMP endpoint /ws, broker /topic, prefix /app
    └── RestaurantManagementApplication
```

**Quyết định kiến trúc quan trọng**: TẤT CẢ entity đặt chung trong `domain/entity` (không tách theo module), để tránh các module phải import chéo entity của nhau. Các module (`admin`, `customer`, `kds`, `pos`) chỉ chứa `controller`, `service`, `dto`, `repository` của riêng logic nghiệp vụ đó — còn `repository` của entity thì đặt cạnh entity trong `domain`.

Enum được đặt **cùng file/cùng package với entity dùng nó**, không có folder enum riêng.

## 4. Trạng thái Entity (20/20 — đã tạo xong phần khai báo, CHƯA viết Repository/Service/Controller cho đa số)

Tên bảng lưu ý tránh từ khóa SQL: `Table` → `restaurant_table`, `Order` → `customer_order`, `Option` → `food_option`.

| Entity | Bảng | Ghi chú |
|---|---|---|
| `Table` | `table` | có enum `TableStatus` |
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
| `Option` | `option` | enum `AdjustType` |
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

### 6. Quy ước viết Controller từ khi có JWT
  Lấy thông tin người đang đăng nhập trong Controller: không tự parse token thủ công, dùng Authentication do Spring tiêm sẵn:
    
    @GetMapping("/api/pos/orders")
     public List<OrderDto> getOrders(Authentication authentication) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        Long accountId = principal.getAccountId();     // dùng để ghi ActivityLog
        String accountType = principal.getAccountType(); // "STAFF" hoặc "KITCHEN"
     ...
     }
  Không tự kiểm tra role bằng if/else trong method — SecurityConfig đã chặn ở tầng route (hasRole, hasAnyRole).
  Nếu cần giới hạn role ở mức method cụ thể hơn route, dùng
     
      @PreAuthorize("hasRole('ADMIN')")
      @DeleteMapping("/api/admin/food/{id}")
      public void deleteFood(@PathVariable Long id) { ... }

  - (Muốn dùng @PreAuthorize phải thêm @EnableMethodSecurity vào SecurityConfig.)
  - Mọi request cần xác thực đều phải gửi header:
       `Authorization: Bearer <token>`
  - Thiếu header/sai token → 401 (chưa đăng nhập); đúng token nhưng sai role → 403 (không đủ quyền).
  - Khi test Postman, set header này thủ công hoặc dùng tab Authorization → Bearer Token. 
  - Ghi ActivityLog: mọi hành động làm thay đổi dữ liệu quan trọng (duyệt/từ chối đơn, sửa menu, điều chỉnh kho...) phải lấy accountId + accountType từ Authentication như trên để ghi log, không được để trống hay hardcode. 
  - Không nhận accountId/role từ body hay query param của client — luôn lấy từ token đã xác thực (Authentication), tránh trường hợp client tự khai "tôi là admin" giả mạo.
  - Route /api/customer/** không có Authentication vì được permitAll() — Controller của Customer không được ép kiểu Authentication, sẽ lỗi NullPointerException hoặc ClassCastException nếu cố lấy principal ở đó.


Checklist khi viết Controller mới (Admin/Lễ tân/KDS):
- Route đã đúng nhóm phân quyền trong SecurityConfig chưa (/api/admin/**, /api/pos/**, /api/kds/**)?
- Có cần @PreAuthorize chi tiết hơn route không?
- Có hành động nào cần ghi ActivityLog không — nếu có, lấy accountId từ Authentication?
- Trả về DTO, không trả entity trực tiếp (đã quy ước trước đó, vẫn áp dụng).

### bổ sung dần cho project :
- InvoiceService.getOrCreateOpenInvoice() đã xong và test qua khi viết Controller tạo Order, phải gọi qua hàm này, không tự viết logic tạo Invoice riêng.

##  Quy ước code cần tuân thủ chung
gi
- Tiền và số lượng nguyên liệu: luôn dùng `BigDecimal`, không dùng `double`/`float`
- Ngày giờ: dùng `LocalDateTime` (java.time), không dùng `java.util.Date`
- Enum: luôn `@Enumerated(EnumType.STRING)`, không dùng mặc định (ORDINAL)
- Quan hệ `@ManyToOne`/`@OneToOne`: luôn set `fetch = FetchType.LAZY` (mặc định JPA là EAGER, dễ gây N+1 query)
- Không trả entity JPA trực tiếp ra Controller — luôn qua DTO (tránh lộ field nhạy cảm như `passwordHash`, tránh lỗi `LazyInitializationException`)
- Lỗi nghiệp vụ: `throw` `ResourceNotFoundException`/`BusinessException`, không tự viết `try-catch` trả JSON thủ công
