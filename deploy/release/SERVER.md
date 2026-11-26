# Smart POS KDS — chạy image trên EC2

Bộ này là cấu hình cho một release. Không cần clone repo, cài Java/Node/MySQL hoặc chạy Docker build trên server. Ba image Backend/frontend/database được build trên GitHub. Database image chỉ chứa MySQL và SQL khởi tạo từ repo, không chứa database hiện tại của máy bạn.

## Lần đầu

Từ máy Windows, tải artifact `server-release-<commit>` của job Publish images and server bundle. Giải nén artifact ZIP để lấy `smart-pos-kds-server.tar.gz`. Chép file tar lên server bằng PowerShell local (thay đường dẫn file tải về):

```powershell
scp -i "C:\Users\MSI-PC\Downloads\smart-pos-kds-key.pem" "C:\Users\MSI-PC\Downloads\smart-pos-kds-server.tar.gz" ubuntu@13.250.126.197:~/
```

IP trên là IP đang dùng lúc viết hướng dẫn; thay nếu instance đã đổi IP. Trong SSH Ubuntu:

```bash
mkdir -p ~/smart-pos-kds
cd ~/smart-pos-kds
tar -xzf ~/smart-pos-kds-server.tar.gz
umask 077
cp -n .env.example .env
chmod 600 .env
nano .env
```

Điền DEPLOY_IP là IPv4 public hiện tại, không phải 172.31.x.x/private IP, không có https:// hoặc cổng. Điền ACME_EMAIL bằng email thật để tạo tài khoản ACME. Đặt mật khẩu MySQL mới cho server, không dùng 123456. Tạo JWT_SECRET bằng `openssl rand -base64 48` rồi dán kết quả vào .env. Không gửi các giá trị bí mật vào chat hoặc Git.

Mặc định VNPay tắt để khởi động không cần merchant. Muốn dùng Sandbox: bật VNPAY_ENABLED=true và điền merchant/secret của bạn. PUBLIC_BASE_URL/Customer URL do Compose tính từ DEPLOY_IP. Return URL để trống thì Backend tạo `https://IP/api/payments/vnpay/return`. Cấu hình IPN tại VNPay thành `https://IP/api/payments/vnpay/ipn`. Chỉ kiểm được thanh toán ngoài mạng sau khi TLS/IPN thật đã chạy; bộ callback local của CI không thay thế kiểm này.

## Quyền tải image

Package GHCR mới thường private. Chủ package cấp quyền đọc cho người dùng triển khai. Nếu chưa tải được, dùng PAT classic chỉ có read:packages từ tài khoản được cấp quyền; không dùng mật khẩu GitHub. Nhập token kín vào terminal Ubuntu:

```bash
read -r -p 'GitHub username: ' GHCR_USER
read -r -s -p 'GHCR read-only token: ' GHCR_TOKEN; echo
printf '%s' "$GHCR_TOKEN" | sudo docker login ghcr.io -u "$GHCR_USER" --password-stdin
unset GHCR_TOKEN
```

Docker sẽ lưu thông tin đăng nhập trong thư mục cấu hình của root. Không chép thư mục đó vào repo hoặc artifact. Nếu chủ package chủ động chọn public, không cần login nhưng image database sẽ lộ SQL mẫu/tài khoản demo từ repo; giữ private mặc định phù hợp hơn. Không cần AWS access key để pull GHCR.

## Mạng và TLS theo IP

Security group cần inbound: 22 từ My IP, 80 và 443 cho Internet; thêm TCP 8443 (POS), 8444 (KDS), 8445 (Admin). Ba cổng nhân viên có thể giới hạn IP quản trị nếu chỉ demo tại một mạng; dùng Anywhere IPv4 nếu cần truy cập từ các mạng khác nhau. Đây là cổng HTTPS của Caddy, không phải mở MySQL/Backend.

Let’s Encrypt cấp chứng chỉ IP public theo profile shortlived, thời hạn khoảng 6 ngày. Caddy 2.11.9 được cấu hình issuer ACME rõ ràng, không dùng tls internal/cert tự ký. Caddy cần liên tục truy cập được Internet và nhận challenge qua 80/443 để xin/gia hạn; giữ volume caddy_data. Không cần mua domain. Không bấm bỏ qua cảnh báo chứng chỉ; xem log nếu xin TLS chưa thành công.

Nếu IP public đổi khi Stop/Start, sửa DEPLOY_IP rồi chạy up lại, cập nhật callback VNPay và in lại QR có IP cũ. Có thể dùng Elastic IP để ổn định địa chỉ; chưa tự cấp hoặc thay đổi tài nguyên AWS trong bản này.

## Khởi động

```bash
sudo docker compose --env-file .env --env-file images.env -f compose.images.yml config --quiet
sudo docker compose --env-file .env --env-file images.env -f compose.images.yml pull
sudo docker compose --env-file .env --env-file images.env -f compose.images.yml up -d --no-build
sudo docker compose --env-file .env --env-file images.env -f compose.images.yml ps
sudo docker compose --env-file .env --env-file images.env -f compose.images.yml logs --tail 80 caddy backend
```

Không chạy cùng docker-compose.yml/compose.deploy.yml cũ. File mới standalone, không có build/context hoặc mount source/database/init. Lần đầu MySQL cần thời gian nạp SQL; Backend đợi healthcheck rồi khởi động. Nếu lỗi ở một bước, dừng và kiểm log; không xóa volume để thử lại tùy tiện.

| Giao diện | Địa chỉ |
|---|---|
| Customer | https://IP/ |
| POS | https://IP:8443/ |
| KDS | https://IP:8444/ |
| Admin | https://IP:8445/ |

Mở Customer cần `?table=<id bàn thật>` hoặc quét QR bàn do Admin in. Vào Admin in QR, xác nhận URL dùng IP:443 của Customer. Bundle frontend nhận URL runtime khi container khởi động, không phải rebuild image khi đổi IP. WebSocket dùng cùng origin từng giao diện; token/kiểm quyền bản 46 vẫn hoạt động.

RAM giới hạn cho demo: MySQL 640 MiB, Backend 768 MiB (heap 384 MiB), frontend/Caddy mỗi dịch vụ 96 MiB; chừa phần RAM cho hệ điều hành. Đây là cấu hình khởi đầu cho 2 GiB + 2 GiB swap, chưa phải cam kết đủ cho nhiều người hoặc tải cao. Giữ thư viện frontend tĩnh, không chạy npm/Gradle trên EC2. Theo dõi bằng `sudo docker stats --no-stream`, `free -h`, `df -h /`. Nếu OOM/heap error xuất hiện cần điều chỉnh theo đo đạc, không chỉ tăng swap.

## Dữ liệu và cập nhật

Lần đầu volume rỗng, image database chạy đúng SQL mẫu từ database/init của release, schema cố định smart_pos_kds. File SQL hiện chứa DROP DATABASE và dữ liệu mẫu; chỉ dùng entrypoint khởi tạo trên volume trống, không chạy lại thủ công lên dữ liệu thật. Java demo seeder tắt không vô hiệu SQL mẫu. Kiểm/đổi mật khẩu tài khoản demo trước khi dùng công khai.

Cập nhật release mới: giữ .env và volume, tải bundle mới vào thư mục hiện tại, kiểm release.json/images.env rồi pull/up như trên. images.env dùng digest chính xác cho cả ba image. Container MySQL được tạo lại không chạy lại init nếu volume đã có dữ liệu. Không dùng down -v hoặc docker volume prune.

Giữ một bản images.env/release.json của phiên bản cũ để có thể đổi lại image khi cần. Hibernate vẫn ddl-auto=update như source hiện tại; quay lại image KHÔNG tự phục hồi thay đổi schema/dữ liệu. Bạn đã hoãn backup; bản này chưa bổ sung backup/migration rollback và không coi giữ digest là thay thế backup.

Đây là build/publish tự động và triển khai thủ công. Chưa có GitHub SSH vào EC2, chưa có full CD tự động. Sau khi chạy thành công và kiểm luồng thật, mới nối bước deploy tự động.
