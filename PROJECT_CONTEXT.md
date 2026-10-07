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
│   ├── entity/          ← TOÀN BỘ 20 entity + enum (chia thư mục con: account, billing, floor, inventory, menu, order)
│   ├── repository/      ← Repository của entity (chia thư mục con theo nhóm entity như trên)
│   └── service/         ← Logic thuần dùng chung nhiều phân hệ (IngredientRequirementCalculator, ComboPriceCalculator)
├── admin/
│   ├── controller/
│   ├── service/
│   └── (dto — chưa tạo)
├── customer/             ← ĐÃ LÀM: xem menu + gửi đơn (son) — xem mục 6
│   ├── controller/
│   ├── service/
│   └── dto/
├── kds/
│   ├── controller/       (chưa tạo)
│   ├── service/          (chưa tạo)
│   └── (dto — chưa tạo)
├── pos/
│   ├── controller/       (chưa tạo)
│   ├── service/          (chưa tạo)
│   └── (dto — chưa tạo)
├── common/
│   └── exception/        ← ErrorResponse, ResourceNotFoundException, BusinessException, GlobalExceptionHandler
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



## 6. Tiến độ theo phân hệ

### 6.1. Customer — xem menu & gửi đơn (PENDING) — người thực hiện: **son**

**Trạng thái**: backend REST + giao diện React xong, đã đối chiếu với đặc tả PDF và `smart-pos-kds.dbml` mới. Đã biên dịch và unit test phần logic thuần; chưa test tích hợp với MySQL thật, chưa chạy thử giao diện trên trình duyệt.

**API** (không cần đăng nhập, prefix `/api/customer`):

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/tables/{tableId}` | Xác nhận bàn từ QR, trả tầng + số bàn (404 nếu không có) |
| GET | `/menu` | Danh mục + món (kèm `available`, `remainingPortions` = số suất còn làm được, `hasOptions`) và combo (kèm giá, `available`, `remainingPortions`) |
| GET | `/foods/{foodId}` | Chi tiết món + nhóm tùy chọn (`priceDelta` đã quy về 0 nếu không đổi giá) |
| POST | `/orders` | Gửi đơn → tạo **một Order mới**, mọi OrderItem ở `PENDING`, trả 201 |
| GET | `/tables/{tableId}/invoice` | Xem lại hóa đơn đang mở của bàn: các Order, trạng thái từng món, `note` (lý do từ chối/trả món), thời gian nấu dự kiến, tổng tạm tính, `callStaffPending` |
| POST | `/tables/{tableId}/order-items/{id}/cancel` | Khách hủy món khi bếp chưa bấm Nấu (`PENDING`/`CONFIRMED`): món chuyển `REJECTED` với `note` = "Khách tự hủy" → trả hóa đơn mới nhất |
| POST | `/tables/{tableId}/call-staff` | Gọi nhân viên (tạo `CallStaffRequest` `PENDING`; bàn đã có yêu cầu chưa xử lý thì không tạo trùng) |

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
- `customer/controller`: `CustomerMenuController`, `CustomerOrderController`, `CustomerTableController`
- `customer/service`: `CustomerMenuService`, `CustomerOrderService`, `CustomerInvoiceService`, `CustomerCallStaffService`
- `customer/dto`: `TableInfoResponse`, `MenuResponse`, `FoodDetailResponse`, `PlaceOrderRequest`, `OrderResponse`, `InvoiceViewResponse`, `CallStaffResponse`
- `domain/service`: `IngredientRequirementCalculator` (nguyên liệu cần theo BOM + option, kiểm tra kho đủ, số suất tối đa), `ComboPriceCalculator`, `StockReservationService` (nguyên liệu đang giữ chỗ), `InvoiceAutoCancelService` (tự hủy hóa đơn rỗng sau grace period)
- `config/SchedulingConfig` (`@EnableScheduling`)
- `domain/repository`: `floor/RestaurantTableRepository`, `billing/InvoiceRepository`, `menu/{Food,Option,Combo,ComboItem}Repository`, `inventory/{Recipe,Ingredient}Repository`, `order/{Order,OrderCombo,OrderItem,OrderItemOption}Repository`, `floor/CallStaffRequestRepository`
- test: `IngredientRequirementCalculatorTest`, `ComboPriceCalculatorTest` (thuần JUnit, không cần DB)
- `src/main/resources/sample-data/customer_sample_data.sql` — dữ liệu mẫu để test khi Admin chưa xong (chạy thủ công)

**Giao diện khách (React + TypeScript, `frontend/src/`)** — cấu trúc thư mục:
```
src/
├── api/api.ts                 ← gọi backend (/api/customer/...)
├── components/
│   ├── Modals.tsx             ← Sheet, QuantityStepper, FoodModal, ComboModal
│   ├── OptionPicker.tsx       ← chọn size / thêm bớt
│   └── InvoiceSheet.tsx       ← xem hóa đơn, hủy món (tự tải lại mỗi 5s)
├── store/cart.ts              ← giỏ hàng + hàm tính tiền, dựng payload gửi đơn
├── types/types.ts             ← kiểu dữ liệu khớp DTO backend
├── App.tsx                    ← màn hình khách (menu, giỏ, gọi nhân viên)
├── App.css, index.css, main.tsx
```
Không thêm thư viện mới. Vào bằng `http://localhost:5173/?table=<id>` (URL này chính là nội dung mã QR của bàn). `vite.config.ts` có proxy `/api` → `localhost:8080` và `host: true` để điện thoại cùng WiFi truy cập được.

**Quy tắc nghiệp vụ đã cài**:
- Mỗi lần gửi đơn = một `Order` mới, không gộp vào Order cũ.
- Gộp hóa đơn: bàn chưa có `Invoice` `OPEN` → tự tạo + chuyển bàn sang `SERVING`; có rồi → gắn Order vào hóa đơn đó. Khóa dòng bàn (`PESSIMISTIC_WRITE`) để 2 khách cùng bàn không tạo 2 hóa đơn.
- Giá chốt tại server, không nhận giá từ client: món lẻ `unitPrice = price + Σ priceDelta` của option đã chọn.
- Kiểm tra: số lượng 1–99; option phải thuộc đúng món; nhóm `SINGLE_CHOICE` **bắt buộc chọn đúng một** (đặc tả: "bắt buộc chọn đúng 1"), `MULTI_CHOICE` chọn tự do; món con gửi lên phải thuộc combo.
- Còn/hết hàng và **số suất còn lại** suy ra tự động: `min` theo nguyên liệu của (tồn kho − phần đang giữ chỗ) / định lượng; combo tính trên nhu cầu gộp của các món con. Khách chỉ thấy số suất, không thấy tồn kho.
- **Giữ chỗ nguyên liệu**: khác bộ đếm RAM trong đặc tả, "phần giữ chỗ" = nguyên liệu (BOM + option) của mọi món đang `PENDING`/`CONFIRMED`, tính thẳng từ DB (`StockReservationService`). Nhờ đó món bị hủy/từ chối, hoặc vào `COOKING` (kho thật đã bị trừ) tự hết giữ chỗ, **Lễ tân/KDS không cần gọi "cộng lại bộ đếm"**. Khi gửi đơn, khóa toàn bộ nguyên liệu (`IngredientRepository.findAllForUpdate`) để hai bàn không giành món cuối. Thiếu → `BusinessException` "Món ... hiện tạm hết". **Không trừ kho** ở bước này (chỉ trừ khi bếp bấm "Nấu").
- **Hóa đơn rỗng**: khi mọi món của hóa đơn đều `REJECTED` (kể cả khách tự hủy), hóa đơn KHÔNG đóng ngay, bàn vẫn `SERVING`. `InvoiceAutoCancelService` quét mỗi 30s; sau `app.invoice.empty-grace-minutes` (mặc định 10) mà vẫn không có món hợp lệ → `Invoice` `CANCELLED` + `cancelledAt`, bàn `AVAILABLE`. Mốc bắt đầu đếm giờ lưu trong RAM (schema không có cột) nên khởi động lại ứng dụng thì đếm lại. Cấu hình tùy chọn: `app.invoice.empty-grace-minutes`, `app.invoice.scan-interval-ms` trong `application.properties`.

**Quy ước dữ liệu mà Lễ tân/Thanh toán cần biết**:
- `Combo` không có cột giá: `FIXED` → `discountValue` là **giá bán của combo**; `PERCENT` → giá = tổng giá món con × (1 − %/100), làm tròn đồng. Logic ở `ComboPriceCalculator` (nếu Admin hiểu `FIXED` là "số tiền giảm" thì chỉ cần sửa một chỗ này).
- Món trong combo: `OrderItem.unitPrice` = **chỉ phụ thu option** (vd. nâng size), giá gốc đã nằm trong `OrderCombo.comboPrice`. Nên **tổng hóa đơn = Σ(unitPrice × quantity của OrderItem) + Σ(comboPrice × quantity của OrderCombo)** (bỏ các món `REJECTED` — gồm cả khách tự hủy — và `RETURNED`; việc `RETURNED` không tính tiền là giả định của son, Lễ tân điều chỉnh nếu khác).
- Trạng thái món nằm ở `OrderItem` (Order không có cột status); "Order PENDING" = mọi OrderItem của nó đang `PENDING`.

**Đã cập nhật theo DBML mới (entity dùng chung)**: `TableStatus` → `AVAILABLE`/`SERVING`; `InvoiceStatus` thêm `CANCELLED` + `Invoice.cancelledAt`, `getOpenedAt()`; `OrderItemStatus` thêm `RETURNED`; `OrderItem.rejectReason` đổi thành `note` (dùng chung lý do từ chối và trả món) + `returnedAt`. **Chưa đổi** (không thuộc phần Customer): `StaffRole.LE_TAN` → `RECEPTIONIST`. Do đổi tên cột/enum, DB dev cũ cần tạo lại (xem hướng dẫn trong tin nhắn bàn giao: `DROP DATABASE` rồi chạy lại ứng dụng + `customer_sample_data.sql`).

**Hủy món**: DBML không có trạng thái "cancelled" cho món nên khách hủy = `REJECTED` + `note` = "Khách tự hủy" (hằng `CustomerInvoiceService.CUSTOMER_CANCEL_NOTE`); Lễ tân phân biệt được với từ chối bằng note này. Món thuộc combo: hủy một món con = hủy cả combo (giá combo không chia lẻ được). **KDS cần lưu ý**: khi bếp bấm "Nấu" phải đọc lại status trong transaction (nên khóa dòng như `OrderItemRepository.findAllByIdForUpdate`) và từ chối nếu món đã `REJECTED`.

**Chưa làm (thuộc Customer, làm sau)**: theo dõi trạng thái bằng WebSocket (hiện giao diện tải lại mỗi 5s, đặc tả yêu cầu cập nhật tức thời), đẩy WebSocket báo Lễ tân có đơn mới / có người gọi / có món bị hủy, hủy cả Order bằng một thao tác (hiện hủy theo từng món).

**Giả định/hạn chế đã biết**:
- Khách không đăng nhập nên chỉ kiểm tra món thuộc đúng bàn (`tableId`), chưa chống người biết mã bàn khác nghịch phá.
- Đặc tả nói hệ thống tự quy đổi đơn vị nhập kho ↔ đơn vị công thức, nhưng schema (`Ingredient`) chỉ có một cột `unit` → code giả định cùng đơn vị. Cần thêm hệ số quy đổi vào schema nếu muốn đúng đặc tả.
- Giữ chỗ nguyên liệu tính từ DB thay vì bộ đếm RAM như đặc tả (xem trên); nếu muốn đúng nguyên văn thì thêm cache RAM, nhưng phải có chỗ cộng lại khi Lễ tân từ chối.

## 7. Quy ước code cần tuân thủ chung

- Tiền và số lượng nguyên liệu: luôn dùng `BigDecimal`, không dùng `double`/`float`
- Ngày giờ: dùng `LocalDateTime` (java.time), không dùng `java.util.Date`
- Enum: luôn `@Enumerated(EnumType.STRING)`, không dùng mặc định (ORDINAL)
- Quan hệ `@ManyToOne`/`@OneToOne`: luôn set `fetch = FetchType.LAZY` (mặc định JPA là EAGER, dễ gây N+1 query)
- Không trả entity JPA trực tiếp ra Controller — luôn qua DTO (tránh lộ field nhạy cảm như `passwordHash`, tránh lỗi `LazyInitializationException`)
- Đặt tên biến/hàm/lớp rõ nghĩa, viết đầy đủ, hạn chế viết tắt (ví dụ: `orderItem` thay vì `oi`, `quantity` thay vì `qty`, `comboItem` thay vì `ci`). Chỉ giữ các từ viết tắt quen thuộc như `id`, `dto`, `api`.
- Lỗi nghiệp vụ: `throw` `ResourceNotFoundException`/`BusinessException`, không tự viết `try-catch` trả JSON thủ công
