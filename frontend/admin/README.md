# Frontend Admin / Quản lý

Project độc lập dùng React, TypeScript và Vite. Customer và KDS là các project cùng cấp, không nằm bên trong Admin.

Từ thư mục này:

```sh
npm ci
npm run dev
```

Mở http://localhost:5173/ . API được proxy đến backend http://localhost:8080.

```sh
npm run build
npm run test:admin
```

Build tạo thư mục `dist`. Dockerfile và nginx.conf trong project phục vụ Admin và proxy API; Docker Compose ở gốc repository dùng project này làm build context.

Hướng dẫn đầy đủ: [README.ADMIN.MD](../../README.ADMIN.MD).
