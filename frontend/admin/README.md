# Frontend Admin / Quản lý

Project độc lập dùng React, TypeScript và Vite. Customer và KDS là các project cùng cấp, không nằm bên trong Admin.

Từ thư mục này:

```sh
npm ci
npm run dev
```

Mở http://localhost:5176/ . API được proxy đến backend http://localhost:8080.

```sh
npm run build
npm run test:admin
```

Build tạo thư mục `dist`. Dockerfile và nginx.conf tại thư mục frontend build các project độc lập; Docker Compose phục vụ Admin ở cổng 5176.

Hướng dẫn đầy đủ: [README.ADMIN.MD](../../README.ADMIN.MD).
