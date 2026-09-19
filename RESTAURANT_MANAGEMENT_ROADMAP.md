# Restaurant Management System

## 1. Menu — Quản lý thực đơn

### Category

* Thêm / sửa / xóa danh mục
* Xem danh sách danh mục

### Food

* Thêm / sửa / xóa món ăn
* Xem danh sách món
* Gán món vào danh mục
* Cập nhật giá
* Cập nhật trạng thái món:

    * Đang phục vụ
    * Tạm hết

### Quan hệ

```text
Category 1 ──── * Food
```

---

# 2. Table — Quản lý bàn

### Table

* Thêm / sửa / xóa bàn
* Xem danh sách bàn
* Xem trạng thái bàn:

    * Trống
    * Đang phục vụ
    * Đã đặt
* Cập nhật trạng thái bàn

* vấn đề : ( nếu mỗi bàn ta thiết kế 1 Qr định danh cho bàn đó thì nếu mà có người có ý đồ xấu chụp lại mã Qr đó đem đi chỗ khác Order thì sao )

---

# 3. Order — Quản lý gọi món

### Order

* Tạo đơn gọi món
* Gắn đơn với bàn
* Xem thông tin đơn
* Hủy đơn
* Cập nhật trạng thái đơn

### OrderItem

* Thêm món vào đơn
* Thay đổi số lượng món
* Xóa món khỏi đơn
* Tính thành tiền từng món

### Quan hệ

```text
Table 1 ──── * Order

Order 1 ──── * OrderItem

Food 1 ──── * OrderItem
```

---

# 4. Payment — Thanh toán

### Payment

* Thanh toán đơn hàng
* Tính tổng tiền
* Chọn phương thức thanh toán:

    * Tiền mặt
    * Chuyển khoản
    * Khác
* Xác nhận thanh toán
* Xem lịch sử thanh toán

### Quan hệ

```text
Order 1 ──── 1 Payment
```

---

# 5. Inventory — Quản lý nguyên liệu
vấn đề : nếu món ăn bị làm sai thì sao 
### Ingredient

* Thêm / sửa / xóa nguyên liệu
* Xem danh sách nguyên liệu
* Theo dõi số lượng tồn
* Thiết lập mức tồn tối thiểu


### StockTransaction

* Nhập nguyên liệu
* Xuất nguyên liệu
* Điều chỉnh số lượng tồn
* Xem lịch sử nhập / xuất

### Quan hệ

```text
Ingredient 1 ──── * StockTransaction
```

---

# 6. Recipe — Định lượng món ăn

### Recipe

Xác định một món ăn cần những nguyên liệu nào và số lượng bao nhiêu.

Ví dụ:

```text
Cơm sườn
├── Gạo       200g
├── Sườn      150g
└── Rau       50g
```

Chức năng:

* Thiết lập nguyên liệu cho món
* Cập nhật định lượng
* Xóa nguyên liệu khỏi món
* Xem công thức / định lượng món

### Quan hệ

```text
Food 1 ──── * Recipe * ──── 1 Ingredient
```

---

# 7. Kitchen — Quản lý bếp

Không tập trung vào việc theo dõi từng giây chế biến.

### KitchenOrder

* Nhận món từ Order
* Xem các món cần chuẩn bị
* Cập nhật trạng thái:

    * Chờ chế biến
    * Đang chế biến
    * Hoàn thành

### KitchenStock

* Theo dõi tình trạng nguyên liệu
* Kiểm tra nguyên liệu sắp hết
* Cảnh báo cần bổ sung nguyên liệu

---

# 8. Employee — Quản lý nhân viên

### Employee

* Thêm / sửa / xóa nhân viên
* Xem danh sách nhân viên
* Quản lý thông tin nhân viên

### Role

* Phân quyền nhân viên

Ví dụ:

```text
ADMIN
MANAGER
STAFF
KITCHEN
CASHIER
```

---

# 9. Account — Tài khoản & đăng nhập

### Account

* Đăng nhập
* Đăng xuất
* Đổi mật khẩu
* Quản lý tài khoản

### Authorization

* Kiểm soát quyền truy cập API
* Nhân viên chỉ được sử dụng chức năng phù hợp với quyền

---

# 10. Customer — Khách hàng

Có thể triển khai sau.

### Customer

* Thêm / sửa thông tin khách hàng
* Xem thông tin khách hàng
* Lưu lịch sử đơn hàng
* Tra cứu lịch sử mua hàng

---

# 11. Report — Báo cáo

### SalesReport

* Doanh thu theo ngày
* Doanh thu theo tháng
* Doanh thu theo khoảng thời gian

### FoodReport

* Món bán chạy
* Món bán ít
* Doanh thu theo món

### InventoryReport

* Tình trạng tồn kho
* Nguyên liệu sắp hết
* Lịch sử nhập / xuất

---

# 12. Tổng quan hệ thống

```text
                    RESTAURANT
                        │
        ┌───────────────┼────────────────┐
        │               │                │
      MENU            TABLE            EMPLOYEE
        │               │                │
   Category             │              Account
   Food                 │              Role
        │               │
        └───────┐       │
                ↓       ↓
                 ORDER
                   │
             Order + OrderItem
                   │
          ┌────────┴────────┐
          ↓                 ↓
       KITCHEN           PAYMENT
          │
          ↓
      INVENTORY
          │
     ┌────┴─────┐
     ↓          ↓
 Ingredient   Recipe
```

---

# 13. Thứ tự phát triển

```text
1. Menu
      ↓
2. Table
      ↓
3. Order
      ↓
4. Payment
      ↓
5. Inventory
      ↓
6. Recipe
      ↓
7. Kitchen
      ↓
8. Employee + Account
      ↓
9. Customer
      ↓
10. Report
```

> Đây là roadmap chức năng tổng thể. Trong quá trình code, từng module sẽ được phân tích lại để loại bỏ những model/chức năng không thực sự cần thiết.
