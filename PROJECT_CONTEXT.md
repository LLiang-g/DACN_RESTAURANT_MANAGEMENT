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
| Frontend | React.js + TypeScript + Vite. `kds` dùng thêm `@stomp/stompjs`, `sockjs-client` |
| Root package | `com.sccgroup.restaurant_management` |

Chạy dự án: backend `.\gradlew bootRun` (cổng 8080, cần MySQL và `jwt.secret` trong `application.properties`); frontend mỗi phân hệ `npm install` rồi `npm run dev` (customer cổng 5173, kds cổng 5174), mỗi cái một terminal riêng.

## 3. Cấu trúc thư mục hiện tại

```
com.sccgroup.restaurant_management/
├── frontend/
│   ├── admin
│   ├── customer
│   ├── pos
│   └── kds/                      ← xem 6.2
│       ├── vite.config.ts        ← cổng 5174, proxy /api và /ws sang 8080
│       └── src/
│           ├── api/              ← httpClient, authApi, kdsApi
│           ├── auth/             ← AuthContext, tokenStorage
│           ├── realtime/         ← kdsSocket (STOMP)
│           ├── hooks/            ← useOrders, useNow
│           ├── pages/            ← LoginPage, KitchenBoardPage
│           ├── components/       ← OrderCard, OrderItemRow, OtherStationRow, SlaTimer
│           ├── utils/            ← time.ts (SLA, định dạng giờ/ngày)
│           ├── types/, styles/
└── backend/
    ├── domain/
    │   ├── entity/          ← TOÀN BỘ 20 entity + enum của hệ thống nằm ở đây
    │   ├── repository/
    │   │   ├── account      ← KitchenAccountRepository, StaffAccountRepository, ActivityLogRepository
    │   │   ├── billing      ← InvoiceRepository
    │   │   ├── floor, menu
    │   │   ├── inventory    ← RecipeRepository, KdsStockRepository, StockTransactionRepository
    │   │   └── order        ← Order/OrderCombo/OrderItem/OrderItemOption Repository
    │   └── service/         ← InvoiceService, IngredientRequirementCalculator, ComboPriceCalculator
    ├── admin/
    │   ├── controller/
    │   ├── service/
    │   └── dto/
    ├── customer/
    │   ├── controller/
    │   ├── service/
    │   └── dto/
    ├── kds/
    │   ├── controller/      ← KdsController
    │   ├── service/         ← KdsService, KdsEventPublisher
    │   └── dto/             ← KdsOrderDto, KdsOrderItemDto
    ├── pos/
    │   ├── controller/
    │   ├── service/
    │   └── dto/
    ├── common/
    │   ├── exception/       ← ErrorResponse, ResourceNotFoundException, BusinessException, GlobalExceptionHandler
    │   └── security/        ← AppUserPrincipal, JwtUtil, JwtAuthFilter, SecurityConfig, CustomUserDetailsService, AuthController
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
| `RestaurantTable` | `restaurant_table` | có enum `TableStatus` |
| `Invoice` | `invoice` | enum `InvoiceStatus`, `PaymentMethod` |
| `Order` | `customer_order` | |
| `OrderCombo` | `order_combo` | |
| `OrderItem` | `order_item` | enum `OrderItemStatus` (PENDING→CONFIRMED/REJECTED→COOKING→DONE→SERVED→RETURNED; lễ tân hoàn tác được RETURNED→SERVED) — **entity trung tâm của luồng nghiệp vụ** |
| `OrderItemOption` | `order_item_option` | |
| `CallStaffRequest` | `call_staff_request` | enum `CallStaffStatus` |
| `ActivityLog` | `activity_log` | không có FK thật (tham chiếu đa hình qua `accountType`/`targetType`) |
| `Category` | `category` | mỗi danh mục thuộc đúng một khu bếp (`station_id`) → món thuộc khu bếp qua danh mục |
| `Food` | `food` | `estimatedCookingTime` tính bằng **phút**, dùng cho SLA |
| `OptionGroup` | `option_group` | enum `SelectionType` |
| `Option` | `food_option` | enum `AdjustType` |
| `Combo` | `combo` | enum `DiscountType` |
| `ComboItem` + `ComboItemId` | `combo_item` | khóa chính ghép (`@EmbeddedId`) |
| `KitchenStation` | `kitchen_station` | **đã test xong** bằng `@DataJpaTest` với MySQL thật |
| `KitchenAccount` | `kitchen_account` | mỗi tài khoản bếp gắn đúng một khu bếp (`station_id`) |
| `Ingredient` | `ingredient` | dùng `BigDecimal` cho số lượng, không dùng `double`/`float` |
| `Recipe` | `recipe` | = công thức BOM (định lượng nguyên liệu/món) |
| `StockTransaction` | `stock_transaction` | lịch sử nhập/xuất/điều chỉnh kho, enum `StockTransactionType` (IMPORT/EXPORT/ADJUST); entity và enum đang nằm ở package `domain.entity.menu` |
| `StaffAccount` | `staff_account` | enum `StaffRole` (ADMIN/RECEPTIONIST), password băm bằng `BCryptPasswordEncoder` |

**Nguồn thiết kế**: `Database.dbml` + `DACN-08-Dac-Ta-Chuc-Nang.md` (đặc tả chức năng) + `sample_database.26.10.9.sql` (DB `smart_pos_kds` kèm dữ liệu mẫu) — mọi entity đã đối chiếu với các file này. Khi mâu thuẫn: DB/đặc tả thắng (xem mục 9–11).

## 5. Hạ tầng dùng chung đã xong

### 5.1. Xử lý lỗi (`common/exception`)
- `ErrorResponse(code, message)` — định dạng JSON lỗi thống nhất toàn hệ thống
- `ResourceNotFoundException` → tự động trả HTTP 404
- `BusinessException` → tự động trả HTTP 400 (dùng cho lỗi vi phạm quy tắc nghiệp vụ, ví dụ duyệt đơn đã xử lý rồi)
- `AuthenticationException` (sai tên đăng nhập/mật khẩu) → HTTP 401, thông báo "Sai tên đăng nhập hoặc mật khẩu"
- Exception không xác định → HTTP 500 "Đã có lỗi xảy ra", **có ghi log đầy đủ** ra console
- `GlobalExceptionHandler` (`@RestControllerAdvice`) bắt exception tự động, Controller/Service **chỉ cần `throw`**, không cần tự viết `try-catch`/tự format response

### 5.2. WebSocket (`config/WebSocketConfig`)
- Endpoint bắt tay: `/ws` (dùng SockJS fallback)  Hiện `/ws/**` để `permitAll` trong `SecurityConfig` (chưa kiểm tra token lúc kết nối)
- Broker: `/topic/**` (server → client, broadcast theo địa chỉ, ví dụ `/topic/kds/{stationId}`)
- Prefix: `/app/**` (client → server, ít dùng trong dự án này)
- Cách dùng: sau khi `save()` dữ liệu qua REST API, gọi `simpMessagingTemplate.convertAndSend("/topic/...", dto)` để đẩy cập nhật realtime
- Đã test thông bằng REST + STOMP client HTML tạm thời — **hạ tầng đã xác nhận chạy được, chưa gắn vào nghiệp vụ thật**
- **Đã gắn vào nghiệp vụ KDS**: topic chung `/topic/kds`, nội dung `{"type":"CHANGED"}`, do `KdsEventPublisher.publishChanged()` gửi (xem 6.2). Màn hình nhận được thì tải lại danh sách

### 5.3. Bảo mật / đăng nhập (`common/security`)
- **Một endpoint đăng nhập chung**: `POST /api/auth/login` body `{"username","password"}`. `CustomUserDetailsService` tra `staff_account` trước, không có thì tra `kitchen_account`.
- Phản hồi: `{token, accountType, role, stationId, stationName}`. `accountType` là `STAFF` hoặc `KITCHEN`; `role` là `ADMIN` / `RECEPTIONIST` (theo enum `StaffRole`) / `KITCHEN`; `stationId`, `stationName` chỉ có giá trị với tài khoản bếp (STAFF thì null).
- JWT hết hạn sau 8 giờ, claims: `accountId`, `accountType`, `role`, `stationId` (chỉ tài khoản bếp). Khóa ký lấy từ `jwt.secret` trong `application.properties` — phải là chuỗi **Base64** đủ dài (≥ 256 bit).
- Gửi token bằng header `Authorization: Bearer <token>`. `JwtAuthFilter` nạp lại tài khoản từ DB mỗi request. `AppUserPrincipal` mang `accountId`, `accountType`, `role`, `stationId`, `stationName`; Controller lấy bằng `@AuthenticationPrincipal AppUserPrincipal`.
- Phân quyền trong `SecurityConfig`: `/api/auth/**`, `/api/customer/**`, `/ws/**` mở; `/api/admin/**` chỉ ADMIN; `/api/pos/**` ADMIN hoặc `LE_TAN`; `/api/kds/**` ADMIN hoặc KITCHEN; còn lại cần đăng nhập. **Chú ý lệch tên vai trò, xem mục 8.**
- `KitchenAccountRepository.findByUsername` có `@EntityGraph(attributePaths = "kitchenStation")` vì `loadUserByUsername` chạy trong filter (ngoài phiên Hibernate), nạp lười sẽ gặp `LazyInitializationException`.
- Token hết hạn/sai: Spring Security trả **403** (không có nội dung), không phải 401.
- File `sql/dev_reset_passwords.sql` đặt mật khẩu mọi tài khoản mẫu thành `123456` (hash bcrypt thật). **Chỉ dùng khi phát triển.** Hash `DEMO_HASH...` trong file SQL mẫu gốc không đăng nhập được.
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

## 7 đã bổ sung dần cho project :
- InvoiceService.getOrCreateOpenInvoice() đã xong và test qua khi viết Controller tạo Order, phải gọi qua hàm này, không tự viết logic tạo Invoice riêng.

  ### phần được bổ sung để làm customer
**API** (không cần đăng nhập, prefix `/api/customer`):

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/tables/{tableId}` | Xác nhận bàn từ QR, trả tầng + số bàn (404 nếu không có) |
| GET | `/menu` | Danh mục + món (kèm `available`, `hasOptions`) và danh sách combo (kèm giá, `available`) |
| GET | `/foods/{foodId}` | Chi tiết món + nhóm tùy chọn (`priceDelta` đã quy về 0 nếu không đổi giá) |
| POST | `/orders` | Gửi đơn → tạo **một Order mới**, mọi OrderItem ở `PENDING`, trả 201 |

**Body `POST /orders`**:
```json
{
  "tableId": 1,
  "items":  [ { "foodId": 1, "quantity": 2, "optionIds": [3, 4] } ],
  "combos": [ { "comboId": 1, "quantity": 1,
                "items": [ { "foodId": 1, "optionIds": [2] } ] } ]
}
```
**File đã tạo**:
- `customer/controller`: `CustomerMenuController`, `CustomerOrderController`
- `customer/service`: `CustomerMenuService`, `CustomerOrderService`
- `customer/dto`: `TableInfoResponse`, `MenuResponse`, `FoodDetailResponse`, `PlaceOrderRequest`, `OrderResponse`
- `domain/service`: `IngredientRequirementCalculator` (tính nguyên liệu cần theo BOM + option, kiểm tra kho đủ), `ComboPriceCalculator`
- `domain/repository`: `floor/RestaurantTableRepository`, `billing/InvoiceRepository`, `menu/{Food,Option,Combo,ComboItem}Repository`, `inventory/RecipeRepository`, `order/{Order,OrderCombo,OrderItem,OrderItemOption}Repository`
- test: `IngredientRequirementCalculatorTest`, `ComboPriceCalculatorTest` (thuần JUnit, không cần DB)
- `src/main/resources/sample-data/customer_sample_data.sql` — dữ liệu mẫu để test khi Admin chưa xong (chạy thủ công)

**Giao diện khách (React + TypeScript, `frontend/src/customer/`)**: `types.ts`, `api.ts`, `cart.ts`, `OptionPicker.tsx`, `Modals.tsx`, `CustomerApp.tsx`, `customer.css`; `App.tsx` render `CustomerApp`. Không thêm thư viện mới. Vào bằng `http://localhost:5173/?table=<id>` (URL này chính là nội dung mã QR của bàn). `vite.config.ts` có proxy `/api` → `localhost:8080` và `host: true` để điện thoại cùng WiFi truy cập được.
### Quy tắc nghiệp vụ đã cài:
- Mỗi lần gửi đơn = một Order mới, không gộp vào Order cũ.
- Gộp hóa đơn: bàn chưa có Invoice OPEN → tự tạo + chuyển bàn sang SERVING; có rồi → gắn Order vào hóa đơn đó. Khóa dòng bàn (PESSIMISTIC_WRITE) để 2 khách cùng bàn không tạo 2 hóa đơn.
- Giá chốt tại server, không nhận giá từ client: món lẻ unitPrice = price + Σ priceDelta của option đã chọn (unitPrice ĐÃ gồm phụ thu option — khi tính hóa đơn KHÔNG cộng priceDelta lần nữa).
- Kiểm tra: số lượng 1–99; option phải thuộc đúng món; nhóm SINGLE_CHOICE chỉ chọn một; món con gửi lên phải thuộc combo.
- Còn/hết hàng suy ra từ kho (không có công tắc thủ công); combo hết nếu một món con hết. Khi gửi đơn, cộng dồn nguyên liệu cả đơn (gồm scaleFactor, option ADD/REMOVE); thiếu → BusinessException "Món ... hiện tạm hết". Không trừ kho ở bước này (chỉ trừ khi bếp bấm "Nấu").

### Giả định/hạn chế đã biết:
Schema chưa có hệ số quy đổi đơn vị kho ↔ công thức → code giả định cùng đơn vị.
Schema chưa có cờ "bắt buộc chọn" cho nhóm option → không ép khách phải chọn size.
Kiểm tra tồn kho lúc gửi đơn chỉ so với tồn hiện tại, chưa trừ phần các đơn PENDING khác đang chờ (vì kho chỉ trừ lúc "Nấu").

### 7.2. KDS — màn hình bếp — người thực hiện: **Liang**

**Trạng thái**:
- **Đã xác nhận chạy được**: đăng nhập bếp (có `stationId`, `stationName`), `GET /api/kds/orders` trả dữ liệu thật từ MySQL, frontend hiển thị dữ liệu và kết nối realtime (nhãn "Trực tiếp").
- **Đã viết, chưa ghi nhận test trên MySQL thật**: bấm Nấu (trừ kho), bấm Xong, tự động chuyển đơn kế tiếp sang nấu, tín hiệu realtime giữa nhiều tab.
- Code backend được viết khi chưa biên dịch cục bộ phía AI; mọi lỗi biên dịch/khởi động cần báo lại.

**API** (prefix `/api/kds`, cần token tài khoản `KITCHEN`; ADMIN qua được `SecurityConfig` nhưng không có khu bếp nên Nấu/Xong bị từ chối):

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/orders` | Mọi order còn món `CONFIRMED`/`COOKING`/`DONE`, order cũ nhất trước. **Khu bếp nào cũng thấy hết món của mọi khu** |
| POST | `/items/{itemId}/start` | Bấm "Nấu": `CONFIRMED → COOKING`, trả 204 |
| POST | `/items/{itemId}/finish` | Bấm "Xong": `COOKING → DONE`, trả 204 |

Nấu/Xong chỉ được với món **thuộc khu bếp của tài khoản đăng nhập** (món → danh mục → khu bếp), kiểm tra ở backend; sai thì `BusinessException` "Món này không thuộc khu bếp của bạn".

**Dữ liệu trả về** (`KdsOrderDto`, field khớp kiểu `KdsOrder` ở frontend): `{id, floor, tableNumber, createdAt, items[]}`; mỗi món `KdsOrderItemDto`: `{id, foodName, quantity, status, stationId, stationName, estimatedCookingTime (phút), startedCookingAt, doneAt, options[] (tên), note (hiện luôn null), comboName (null nếu gọi lẻ)}`. Ngày giờ dạng ISO không múi giờ, ví dụ `2026-10-03T02:29:00`.

**Quy tắc nghiệp vụ đã cài (`KdsService`)**:
- **Bấm Nấu** (một giao dịch): khóa dòng món → khóa các dòng nguyên liệu theo thứ tự id → kiểm tra tồn kho thật → trừ kho bằng câu lệnh chỉ trừ khi còn đủ (BOM + option, qua `IngredientRequirementCalculator`) → ghi `StockTransaction` loại `EXPORT` (note "Nấu món #id") → đặt `status`, `started_cooking_at` → ghi `activity_log` (`START_COOKING`). Thiếu nguyên liệu → `BusinessException` "Không đủ nguyên liệu để nấu: ..." và hoàn lại toàn bộ.
- **Bấm Xong** (một giao dịch): khóa mọi món của khu mình trong order đó (theo thứ tự id, tránh khóa chéo) → `COOKING → DONE`, đặt `done_at`, ghi `activity_log` (`FINISH_COOKING`).
- **Tự động chuyển đơn kế tiếp**: nếu đó là món cuối cùng chưa xong của khu bếp mình trong order, backend tìm order **cũ nhất còn món `CONFIRMED` của khu bếp đó** (order không có món nào của khu mình tự bị bỏ qua) và chuyển mọi món `CONFIRMED` của khu mình trong order ấy sang `COOKING` (cùng quy trình trừ kho, `activity_log` hành động `AUTO_START_COOKING`, ghi tài khoản vừa bấm Xong). Món thiếu nguyên liệu thì bỏ qua và giữ `CONFIRMED`. Chỉ kích hoạt khi bấm Xong; khu bếp đang rảnh mà có đơn mới đến thì **không** tự nấu.
- **Realtime**: sau mỗi thay đổi (Nấu, Xong, tự động chuyển) `KdsEventPublisher.publishChanged()` gửi `{"type":"CHANGED"}` tới `/topic/kds` **sau khi commit** (đăng ký `afterCommit` nếu đang trong giao dịch). **Module `pos` phải gọi hàm này sau khi lễ tân duyệt/từ chối món** để bếp nhận order mới ngay.

**Frontend `frontend/kds`** (React + TypeScript + Vite, cổng 5174):
- Đăng nhập chỉ nhận tài khoản `KITCHEN` (lễ tân/admin bị từ chối). Khu bếp lấy từ tài khoản. Phiên lưu `localStorage` khóa `kds.session`; gặp 401/403 tự đăng xuất về trang đăng nhập.
- `vite.config.ts`: proxy `/api` và `/ws` sang `localhost:8080`, **xóa header `Origin`** (nếu không Spring trả 403 "Invalid CORS request" vì Host bị đổi sang 8080), `define: { global: 'globalThis' }` cho `sockjs-client`.
- Nhận realtime qua STOMP trên `/topic/kds` rồi tải lại (gộp tín hiệu trong 150ms) + tải định kỳ 30 giây dự phòng. Lỗi từ backend hiện thông báo đỏ nổi, tự ẩn sau 6 giây.
- Giao diện: dải thẻ order ngang, mỗi thẻ rộng 80% màn hình, thẻ kế bên mờ; trong thẻ là lưới **3 thẻ món mỗi hàng** (hằng số `COLUMNS` ở `OrderCard.tsx`) cho món khu mình (có nút Nấu/Xong), phía dưới là thẻ nhỏ mờ của khu bếp khác (không có nút). Món hiện: `CONFIRMED`, `COOKING`, `DONE`. Cỡ chữ co giãn theo chiều cao màn hình (`clamp` trong `.card`).
- SLA: đồng hồ đếm ngược từ `startedCookingAt` theo `estimatedCookingTime` (phút); quá 75% (`WARN_RATIO` trong `utils/time.ts`) màu cam, quá 100% đỏ và viền nhấp nháy.
- Sau khi bấm Nấu, nút Xong của món đó bị khóa 5 giây (`FINISH_LOCK_MS` trong `OrderItemRow.tsx`) để tránh bấm nhầm.
- Xong hết món khu mình trong thẻ đang xem → sau 0,7 giây (`AUTO_ADVANCE_DELAY`) tự cuộn tới đơn kế tiếp **còn món chờ nấu/đang nấu của khu mình**, bỏ qua đơn không có món của khu mình.
- Thời gian hiển thị: món xong "xong lúc HH:mm", khác ngày thì thêm "dd/MM"; đầu thẻ "Đặt N phút trước" (dưới 1 giờ), quá thì "Đặt lúc ...".
- Theme sáng: nền xanh dương nhạt, thẻ trắng; chờ nấu xanh dương, đang nấu xanh lá, đã xong xám xanh, cảnh báo cam/đỏ, chip option vàng, chip combo tím. Toàn bộ màu nằm ở khối `:root` đầu `styles/global.css`.

**Hạn chế/giả định đã biết**:
- Ghi chú của khách cho từng món **chưa có chỗ lưu** (`OrderItem.note` chỉ dùng cho lý do từ chối/trả) → thẻ món không hiện ghi chú.
- Không hiển thị `PENDING`, `REJECTED`, `SERVED`, `RETURNED`.
- Giờ bắt đầu/đồng hồ SLA chỉ là ước lượng theo lúc bấm Nấu; khu bếp rảnh thì đơn mới không tự nấu.
- Khóa nút Xong 5 giây tính theo màn hình đó, mất nếu tải lại trang.
- Chưa kiểm tra token ở bước kết nối WebSocket (ai cũng đăng ký được `/topic/kds`).

## 8 Quy ước code cần tuân thủ chung
- Tiền và số lượng nguyên liệu: luôn dùng `BigDecimal`, không dùng `double`/`float`
- Ngày giờ: dùng `LocalDateTime` (java.time), không dùng `java.util.Date`
- Enum: luôn `@Enumerated(EnumType.STRING)`, không dùng mặc định (ORDINAL)
- Quan hệ `@ManyToOne`/`@OneToOne`: luôn set `fetch = FetchType.LAZY` (mặc định JPA là EAGER, dễ gây N+1 query)
- Không trả entity JPA trực tiếp ra Controller — luôn qua DTO (tránh lộ field nhạy cảm như `passwordHash`, tránh lỗi `LazyInitializationException`)
- Lỗi nghiệp vụ: `throw` `ResourceNotFoundException`/`BusinessException`, không tự viết `try-catch` trả JSON thủ công
- Truy vấn nhiều quan hệ lười cùng lúc: dùng `join fetch` hoặc `@EntityGraph` trong một câu `@Query` để tránh N+1
- Khóa dòng (`PESSIMISTIC_WRITE`): luôn khóa theo thứ tự id tăng dần để tránh khóa chéo (deadlock). Khi khóa, dùng truy vấn con thay vì `join` để không khóa luôn các bảng được join
- Đẩy realtime: gọi `KdsEventPublisher.publishChanged()` (tự chờ commit), không tự `convertAndSend` giữa chừng giao dịch
- Mỗi `Repository` chỉ cần khai báo interface kế thừa `JpaRepository`; muốn thêm truy vấn thì khai báo hàm `findByTênField...` hoặc `@Query` (JPQL dùng tên class/field Java, không dùng tên bảng/cột)
- Repository của một entity chỉ đặt **một bản** trong `domain/repository/<nhóm>` (từng có `InvoiceRepository` bị trùng ở `domain/repository` và `domain/repository/billing` gây lỗi trùng bean; bản đúng là `billing`)


## 9. Nguồn thiết kế và nguyên tắc xử lý mâu thuẫn
- Các nguồn: `Database.dbml`, `DACN-08-Dac-Ta-Chuc-Nang.md`, `sample_database.26.10.9.sql` (DB `smart_pos_kds`).
- Khi 3 nguồn mâu thuẫn: DB/đặc tả thắng; mọi quyết định phải ghi vào mục 11.

## 10. Giá trị enum THỰC TẾ trong DB (tên Java phải khớp từng chuỗi, vì dùng EnumType.STRING)
- `StaffRole`: ADMIN, RECEPTIONIST (`hasRole('RECEPTIONIST')` trong SecurityConfig)
- `TableStatus`: AVAILABLE, SERVING
- `InvoiceStatus`: OPEN, PAID, CANCELLED | `PaymentMethod`: CASH, BANK_TRANSFER
- `OrderItemStatus`: PENDING, CONFIRMED, REJECTED, COOKING, DONE, SERVED, RETURNED
- `StockTransactionType`: IMPORT, EXPORT, ADJUST
- `CallStaffStatus`: PENDING, RESOLVED | `SelectionType`: SINGLE_CHOICE, MULTI_CHOICE
- `AdjustType`: ADD, REMOVE | `DiscountType`: FIXED, PERCENT | `accountType` (ActivityLog): STAFF, KITCHEN

## 11. Quyết định nghiệp vụ đã chốt
- `unitPrice` của món lẻ ĐÃ gồm Σ priceDelta; KHÔNG cộng priceDelta lần nữa khi tính hóa đơn (giá chốt tại thời điểm đặt, đổi giá menu sau này không ảnh hưởng hóa đơn cũ).
- Tổng hóa đơn = Σ(unitPrice × quantity) + Σ(comboPrice × quantity), loại món REJECTED và RETURNED.
- RETURNED vẫn đã trừ kho (đã nấu, không hoàn kho). Lễ tân hoàn tác RETURNED→SERVED thì món tính lại vào tổng.
- Lý do từ chối (REJECTED) và lý do trả món (RETURNED) dùng chung một cột `note` của OrderItem.
- Món con trong combo: `unitPrice` = chỉ phụ thu option; nếu bị REJECTED thì `unitPrice` = 0 (như dữ liệu mẫu).
- Combo bị từ chối: dòng `order_combo` vẫn còn (dữ liệu mẫu: `order_combo` #1 thuộc hóa đơn CANCELLED #4). Khi tính tổng hóa đơn chỉ cộng `comboPrice × quantity` của combo mà các OrderItem con KHÔNG bị REJECTED; nếu cộng thẳng mọi dòng `order_combo` thì hóa đơn #4 sẽ ra 368.000 thay vì 0.
- Trừ kho chỉ tại một thời điểm: khi bếp bấm "Nấu" (mỗi nguyên liệu ghi một dòng `StockTransaction` loại EXPORT, số lượng luôn dương).
 
- **Khách hủy đơn = chuyển món sang `REJECTED`** (không thêm `CANCELLED` vào enum/DB)
- Ghi `note` bằng hằng số duy nhất `CUSTOMER_CANCEL_NOTE = "Khách tự hủy"`; mọi nơi cần phân biệt "khách hủy" với "lễ tân từ chối" (thông báo Lễ tân, báo cáo) so sánh với hằng số này, không gõ chuỗi tay.
- Chỉ cho hủy khi MỌI món của Order đang `PENDING` hoặc `CONFIRMED`; có món từ `COOKING` trở đi thì ném `BusinessException`.
- Khi kiểm tra và đổi trạng thái, khóa các dòng `order_item` bằng `PESSIMISTIC_WRITE` trong cùng transaction (tránh khách bấm hủy đúng lúc bếp bấm "Nấu").
- Đây là ngoại lệ duy nhất cho phép `CONFIRMED → REJECTED`; luồng lễ tân từ chối vẫn chỉ đi từ `PENDING`.
- Sau khi hủy: hoàn lại chỗ giữ trong RAM, đẩy WebSocket cho Lễ tân, và cho KDS nếu đơn đã `CONFIRMED` (để món biến mất khỏi màn hình bếp).
- `ActivityLog` chỉ ghi `STAFF`/`KITCHEN` nên không ghi được hành động của khách; `note` là dấu vết duy nhất.

**Vòng đời món: bổ sung người thực hiện `DONE → SERVED`**
- Lễ tân bấm "Đã phục vụ" cho món đang `DONE`; ghi `served_at`; đẩy WebSocket cho khách. (Đặc tả gốc không nêu chức năng này nhưng vòng đời cần.)

**Duyệt/từ chối theo cả Order**
- Lễ tân duyệt hoặc từ chối nguyên một Order (khớp đặc tả: "với mỗi đơn"); từ chối bắt buộc nhập `note`. Từ chối từng món riêng là mở rộng sau.

**Bấm "Nấu" khi kho không đủ**
- Trừ kho + ghi `StockTransaction` (`EXPORT`, số lượng dương) + đổi trạng thái `COOKING` trong CÙNG một transaction, khóa dòng `ingredient`. Thiếu nguyên liệu thì ném `BusinessException`, món giữ nguyên `CONFIRMED`, không cho nấu.

**Nhóm option**
- `SINGLE_CHOICE` = bắt buộc chọn đúng 1; `MULTI_CHOICE` = tùy chọn. Server validate và UI chọn sẵn phần tử đầu của nhóm bắt buộc. Cần rà dữ liệu mẫu xem có nhóm `SINGLE_CHOICE` nào đang để tùy chọn không.

**Khách theo dõi và hủy đơn**
- Khách xem mọi Order thuộc hóa đơn `OPEN` của bàn mình (theo `tableId` từ QR); hóa đơn đóng thì khách bàn sau không thấy đơn cũ.
- API hủy đơn bắt buộc kiểm tra Order thuộc đúng `tableId` (vì `orderId` tăng dần nên đoán được).

**WebSocket**
- KDS dùng MỘT topic chung `/topic/kds` (mọi khu bếp thấy toàn bộ món; client tự làm nổi bật món của khu mình, không còn `/topic/kds/{stationId}`).
- Khách: `/topic/table/{tableId}`. Lễ tân: `/topic/pos`.
- Xác thực JWT cho kênh STOMP của Lễ tân/KDS: đưa vào backlog (hiện `/ws` chưa kiểm tra JWT).

**Hóa đơn tự hủy**
- Cấu hình trong `application.yml`: `app.invoice.auto-cancel-minutes: 15`; `@Scheduled` quét mỗi phút.
- Điều kiện: hóa đơn `OPEN` mà mọi `OrderItem` đều `REJECTED`. Mốc đếm = thời điểm tạo Order cuối cùng (schema không có cột thời điểm bị từ chối).
- Hết hạn → `CANCELLED`, ghi `cancelled_at`, bàn về `AVAILABLE`.

**Thanh toán**
- Chặn thanh toán khi còn món `PENDING`/`CONFIRMED`/`COOKING`; món `DONE` chưa `SERVED` chỉ cảnh báo.
- VietQR: làm xác nhận thủ công trước (đặc tả cho phép); tự đối chiếu ngân hàng là mở rộng.
- Thanh toán xong: hóa đơn `PAID`, bàn về `AVAILABLE`.

**Đơn vị và combo**
- Đơn vị kho = đơn vị công thức (không quy đổi); dữ liệu mẫu đã dùng cùng đơn vị (ví dụ xuất 0,2 và 0,01 theo kg).
- Combo `FIXED` = SỐ TIỀN GIẢM trừ vào tổng giá món con (giá combo = Σ món − discountValue, tối thiểu 0); `PERCENT` = Σ × (1 − %/100), làm tròn đồng. (son đã sửa theo dữ liệu mẫu: order_combo #1 = 408000 − 40000 = 368000. Quy tắc cũ "FIXED = giá bán cố định" mâu thuẫn dữ liệu mẫu — CẦN NHÓM XÁC NHẬN lại.)


## 12. Cột DB quan trọng cho từng module
- KDS: `category.station_id` quyết định món thuộc khu bếp nào (Food → Category → KitchenStation). Món cùng khu đang đăng nhập hiển thị nổi bật; món khu khác chỉ xem, không được bấm Nấu/Xong.
- SLA món trễ: `food.estimated_cooking_time` (phút) so với `order_item.started_cooking_at`.
- Cảnh báo tồn thấp: `ingredient.min_threshold`.
- Sơ đồ bàn: `restaurant_table.position_x/position_y`, duy nhất theo (floor, table_number).
- Invoice: `opened_at`, `paid_at`, `cancelled_at`; tiền mặt dùng `amount_received` + `change_amount`; chuyển khoản dùng `bank_transaction_ref`.
- Mốc thời gian món: `started_cooking_at`, `done_at`, `served_at`, `returned_at`.

## 13. Việc còn lại (backlog theo module)
- Customer: theo dõi trạng thái realtime, thời gian nấu còn lại, hủy đơn, gọi nhân viên, đẩy WebSocket báo Lễ tân có đơn mới.
- Lễ tân: duyệt/từ chối (bắt buộc nhập lý do), tiến độ theo bàn, cảnh báo món trễ, xử lý gọi nhân viên, nhận báo đơn bị hủy, đánh dấu/hoàn tác RETURNED, tổng quan bàn, thanh toán tiền mặt + VietQR, hóa đơn tự chuyển CANCELLED sau thời gian chờ (cấu hình được) khi không còn Order hợp lệ.
- KDS: danh sách theo Order, "Nấu" (trừ kho + ghi StockTransaction EXPORT), "Xong", cấm hoàn tác, cảnh báo thời gian.
- Admin: CRUD danh mục/món/option/combo/nguyên liệu/BOM/bàn/tài khoản, nhập kho + điều chỉnh, in QR, xem ActivityLog, báo cáo (tùy chọn).
- Băm lại mật khẩu mẫu bằng `BCryptPasswordEncoder` (chuỗi `$2b$12$DEMO_HASH_...` trong SQL mẫu KHÔNG phải BCrypt hợp lệ nên chưa đăng nhập được).

## 14. Điểm lệch đặc tả CÓ CHỦ Ý và việc để sau
- **Lệch có chủ ý:** đơn vị kho và đơn vị công thức dùng chung một đơn vị, không tự quy đổi (kg ↔ g, lít ↔ ml); đặc tả yêu cầu quy đổi nhưng schema chưa có hệ số.
- **Lệch có chủ ý:** duyệt/từ chối theo cả Order, chưa có từ chối từng món.
- **Mở rộng sau:** tự đối chiếu giao dịch ngân hàng cho VietQR (hiện xác nhận thủ công); xác thực JWT cho kênh STOMP; đẩy `/topic/menu`; báo cáo.
- **Đã khớp đặc tả (cần code):** giữ chỗ nguyên liệu trong RAM + hiển thị "còn N suất" (xem mục 11).
- **Đã chốt:** khách hủy đơn dùng `REJECTED` + `CUSTOMER_CANCEL_NOTE` (xem mục 11); không thêm `CANCELLED` cho món. 
### 14.1 Việc để sau
- **Giữ chỗ nguyên liệu trong RAM (đúng đặc tả), theo TỪNG NGUYÊN LIỆU**
- Class `IngredientReservation` giữ `available[ingredientId] = tồn kho − phần đang giữ`. KHÔNG tạo bộ đếm riêng theo món (các món dùng chung nguyên liệu sẽ bị lệch nhau).
- `reserve(need)`: kiểm tra mọi nguyên liệu trước, đủ hết mới trừ, tất cả trong một khối `synchronized` (tất cả-hoặc-không, chống race condition khi hai đơn đến cùng lúc). Gọi bên trong method `@Transactional`.
- Transaction lưu đơn thất bại thì tự trả lại chỗ giữ qua `TransactionSynchronization.afterCompletion` (status khác `COMMITTED`).
- Đọc cho menu phải qua `snapshot()` lấy trong khóa, không đọc thẳng `available`.
- Cập nhật bộ đếm: gửi đơn → trừ; lễ tân từ chối hoặc khách hủy → cộng lại; **bếp bấm "Nấu" → KHÔNG đổi** (tồn kho thật giảm đúng bằng phần giữ chỗ giảm; trừ thêm sẽ bị tính hai lần); Admin nhập kho/điều chỉnh → cộng/trừ theo lượng thay đổi.
- `rebuild()`: `available = tồn kho − Σ nguyên liệu của các món đang PENDING/CONFIRMED`, tính bằng cùng `IngredientRequirementCalculator`. Gọi khi khởi động và mỗi khi Admin đổi công thức (BOM), option hoặc kho.
- BOM cũng cache trong RAM (làm mới khi Admin sửa) để mở menu không phải gọi DB.
- Số suất món hiển thị = giá trị nhỏ nhất của `floor(available / định lượng)` trên các nguyên liệu trong công thức.
- Chỉ đúng khi chạy MỘT instance backend; mở rộng nhiều instance thì chuyển bộ đếm sang Redis.
- Tùy chọn: sau mỗi lần giữ/hoàn chỗ, đẩy `/topic/menu` để các trang menu đang mở tự cập nhật.

## Ghi chú phần Customer (son) — cập nhật 17/10/2026
- API: `GET /api/customer/menu`, `POST /api/customer/orders`, `GET /api/customer/tables/{id}/invoice` (xem hóa đơn), `POST .../orders/items/{id}/cancel` (hủy món khi bếp chưa nấu → `REJECTED` + note "Khách tự hủy"), `POST .../call-staff` (gọi nhân viên).
- SINGLE_CHOICE bắt buộc chọn 1 (server validate); có giữ chỗ nguyên liệu cho món PENDING/CONFIRMED ("còn N suất").
- Frontend khách chạy cổng 5173; `vite.config.ts` PHẢI có proxy `/api`, `/ws` → 8080 (không dùng `changeOrigin`), nếu thiếu sẽ báo "Đã có lỗi xảy ra".
- Dữ liệu cũ thừa nên xóa: `src/main/resources/sample-data/alter_order_item_status_cancelled.sql`, `customer_sample_data.sql`.
- Còn lệch với ghi chú nhóm: hủy món hiện cho phép theo từng món; chưa đẩy WebSocket `/topic/pos|kds|table/{id}`.

### Bổ sung Customer (son) — realtime & hủy đơn (21/10/2026)
- `domain/service/TableEventPublisher`: đẩy tín hiệu STOMP sau khi commit — `/topic/table/{tableId}` (màn hình khách của bàn) và `/topic/pos` (`ORDER_PLACED`, `ORDER_CANCELLED_BY_CUSTOMER`, `CALL_STAFF`, kèm `tableId`). Phân hệ POS subscribe `/topic/pos` rồi tải lại danh sách.
- **POS/KDS cần gọi `tableEventPublisher.publishTableChanged(tableId)` sau mỗi lần đổi trạng thái món** (duyệt/từ chối/trả món/phục vụ) để khách thấy tức thì. KDS (Nấu/Xong) đã gắn sẵn.
- API mới: `POST /api/customer/tables/{tableId}/orders/{orderId}/cancel` — hủy cả Order, chỉ khi mọi món còn hiệu lực đều PENDING/CONFIRMED (đúng quy tắc mục 11). Hủy từng món vẫn giữ.
- Frontend khách: `src/realtime/tableSocket.ts` (cần `npm install` vì thêm `@stomp/stompjs`, `sockjs-client`); tải định kỳ 15s chỉ là dự phòng.



### Lưu ý trong phần POS
2 điều cần bạn lưu ý, không phải lỗi nhưng là giới hạn có chủ đích của bản này:
Chưa tính OrderCombo vào tổng tiền — calculateTotal hiện chỉ cộng OrderItem, vì entity OrderCombo chưa có repository/query riêng trong project (chưa ai trong nhóm làm tới). Nếu nhà hàng có bán combo và khách đã gọi combo, tổng tiền hiển thị sẽ thiếu phần đó. Đây là việc cần làm thêm khi bạn rảnh — báo mình, mình làm tiếp phần OrderComboRepository + gộp vào service này.
Chưa khóa pessimistic (PESSIMISTIC_WRITE) khi thanh toán — khác với InvoiceService.getOrCreateOpenInvoice đã làm trước đây (có lock để tránh tạo trùng hóa đơn), hàm pay()/cancel() ở đây chưa có khóa tương tự. Rủi ro: nếu 2 lễ tân bấm “Thanh toán” cùng lúc cho cùng 1 hóa đơn (hiếm khi xảy ra với 1 quầy lễ tân, nhưng về lý thuyết có thể), có thể ghi đè dữ liệu amountReceived lẫn nhau. Mình tạm bỏ qua để giữ code đơn giản cho đồ án — nếu muốn làm chặt hơn, báo mình bổ sung theo đúng pattern đã dùng ở InvoiceService.