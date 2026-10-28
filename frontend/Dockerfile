# Build stage: build cả 4 project React/Vite (customer, pos, kds, admin)
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy toàn bộ mã nguồn frontend (node_modules và dist đã bị .dockerignore loại bỏ)
COPY . .

# Với mỗi project có package.json: cài thư viện, build, rồi gom kết quả vào /out/<tên project>.
# Project nào chưa có thì bỏ qua. Lỗi ở bất kỳ bước nào cũng làm dừng build (set -e).
RUN --mount=type=cache,target=/root/.npm \
    set -eux; \
    mkdir -p /out; \
    for p in customer pos kds admin; do \
      if [ -f "$p/package.json" ]; then \
        cd "$p"; \
        if [ -f package-lock.json ]; then \
          npm ci --no-audit --no-fund --fetch-retries=3 --fetch-timeout=120000; \
        else \
          npm install --no-audit --no-fund --fetch-retries=3 --fetch-timeout=120000; \
        fi; \
        npm run build; \
        mv dist "/out/$p"; \
        cd ..; \
      fi; \
    done

# Run stage: một Nginx phục vụ cả 4 giao diện, mỗi giao diện một cổng
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /out /usr/share/nginx/html

# 80: customer | 81: pos | 82: kds | 83: admin
EXPOSE 80 81 82 83

CMD ["nginx", "-g", "daemon off;"]
