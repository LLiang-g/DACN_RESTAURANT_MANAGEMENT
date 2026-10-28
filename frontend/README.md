# Các project frontend độc lập

- `admin/`: project Admin/Quản lý (React + TypeScript + Vite), cổng dev 5173.
- `kds/`: project Nhà bếp độc lập, cổng dev 5174.
- `customer/`: vị trí dành cho project Khách hàng khi tích hợp; hiện chưa có trong nhánh này.

Mỗi project có package.json, mã nguồn, dependencies và quy trình build riêng. Thư mục frontend không phải ứng dụng cha; Admin không bọc Customer hoặc KDS.

Chạy Admin từ thư mục gốc repository:

```sh
cd frontend/admin
npm ci
npm run dev
```

Docker Compose ở thư mục gốc build service `frontend` từ `frontend/admin`. Xem [README.ADMIN.MD](../README.ADMIN.MD) để chạy backend/database và tra đường dẫn các chức năng.
