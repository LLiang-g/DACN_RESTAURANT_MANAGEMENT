# Build stage
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy file quản lý thư viện trước
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --fetch-retries=3 --fetch-timeout=120000

# Copy toàn bộ mã nguồn frontend
COPY . .

# Build ứng dụng React/Vite
RUN npm run build

# Run stage
FROM nginx:alpine

# Copy file cấu hình Nginx (reverse proxy cho /api và hỗ trợ SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Đưa file build vào Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
