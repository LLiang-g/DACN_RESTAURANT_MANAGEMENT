-- Chạy 1 lần nếu DB đã tạo trước khi thêm trạng thái CANCELLED (ddl-auto=update KHÔNG sửa cột enum cũ).
-- Kiểm tra trước: SHOW CREATE TABLE order_item;  (nếu cột status là varchar thì không cần chạy)
ALTER TABLE order_item
  MODIFY COLUMN status ENUM('PENDING','CONFIRMED','REJECTED','COOKING','DONE','SERVED','CANCELLED') NULL;
