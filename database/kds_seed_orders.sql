-- =====================================================================
-- Thêm nhiều order thử cho màn hình bếp (CHỈ DÙNG KHI PHÁT TRIỂN)
-- Mỗi order có 3–7 món ngẫu nhiên từ mọi khu bếp, trạng thái trộn: chờ nấu / đang nấu / đã xong.
-- Dữ liệu thử được đánh dấu bằng invoice.bank_transaction_ref = 'SEED_KDS' nên xóa sạch được (xem phần 3).
-- Không đụng tới trạng thái bàn và không trừ kho.
-- Chạy trong MySQL Workbench: chạy cả khối PHẦN 1 một lần, rồi chạy dòng CALL ở PHẦN 2.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PHẦN 1: tạo thủ tục (chạy một lần)
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS seed_kds_orders;
DELIMITER $$
CREATE PROCEDURE seed_kds_orders(IN p_count INT, IN p_utc_offset_hours INT)
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE v_now DATETIME;
  DECLARE v_table BIGINT;
  DECLARE v_invoice BIGINT;
  DECLARE v_order BIGINT;
  DECLARE v_item_count INT;
  DECLARE v_created DATETIME;

  -- Giờ Việt Nam bất kể MySQL (nhất là MySQL trong Docker) đang đặt múi giờ nào.
  -- Backend ghi giờ theo máy chạy Java, nên số này phải khớp giờ máy bạn.
  SET v_now = UTC_TIMESTAMP() + INTERVAL p_utc_offset_hours HOUR;

  seed_loop: WHILE i < p_count DO
    SET i = i + 1;
    SET v_table = NULL;
    SET v_invoice = NULL;

    -- Chỉ chọn bàn chưa có hóa đơn OPEN thật (bàn đang giữ hóa đơn do script này tạo thì dùng lại)
    SELECT t.id INTO v_table
      FROM restaurant_table t
     WHERE NOT EXISTS (SELECT 1 FROM invoice iv
                        WHERE iv.table_id = t.id AND iv.status = 'OPEN'
                          AND (iv.bank_transaction_ref IS NULL OR iv.bank_transaction_ref <> 'SEED_KDS'))
     ORDER BY RAND() LIMIT 1;

    IF v_table IS NULL THEN
      LEAVE seed_loop;  -- hết bàn trống
    END IF;

    SELECT iv.id INTO v_invoice
      FROM invoice iv
     WHERE iv.table_id = v_table AND iv.status = 'OPEN' AND iv.bank_transaction_ref = 'SEED_KDS'
     LIMIT 1;

    SET v_created = v_now - INTERVAL ((p_count - i) * 2 + 1) MINUTE;  -- order cũ nhất tạo sớm nhất, cách nhau 2 phút

    IF v_invoice IS NULL THEN
      INSERT INTO invoice (table_id, status, opened_at, bank_transaction_ref)
      VALUES (v_table, 'OPEN', v_created, 'SEED_KDS');
      SET v_invoice = LAST_INSERT_ID();
    END IF;

    INSERT INTO customer_order (invoice_id, created_at) VALUES (v_invoice, v_created);
    SET v_order = LAST_INSERT_ID();

    SET v_item_count = 3 + FLOOR(RAND() * 5);  -- 3 đến 7 món

    INSERT INTO order_item (order_id, food_id, quantity, status, started_cooking_at, done_at, unit_price)
    SELECT v_order, x.food_id, x.qty,
           CASE WHEN x.r < 0.60 THEN 'CONFIRMED' WHEN x.r < 0.85 THEN 'COOKING' ELSE 'DONE' END,
           CASE WHEN x.r < 0.60 THEN NULL
                WHEN x.r < 0.85 THEN GREATEST(v_created, v_now - INTERVAL FLOOR(x.est * 1.3 * x.r2) MINUTE)
                ELSE GREATEST(v_created, v_now - INTERVAL (x.est + 1 + FLOOR(x.r2 * 10)) MINUTE) END,
           CASE WHEN x.r < 0.85 THEN NULL
                ELSE GREATEST(v_created, v_now - INTERVAL (1 + FLOOR(x.r2 * 10)) MINUTE) END,
           x.price
      FROM (SELECT f.id AS food_id, f.price AS price,
                   IFNULL(f.estimated_cooking_time, 15) AS est,
                   FLOOR(1 + RAND() * 3) AS qty,
                   RAND() AS r, RAND() AS r2
              FROM food f
             ORDER BY RAND()
             LIMIT v_item_count) x;

    -- Món nào có option thì 70% được gắn ngẫu nhiên một option
    INSERT INTO order_item_option (order_item_id, option_id)
    SELECT oi.id,
           (SELECT fo.id FROM food_option fo WHERE fo.food_id = oi.food_id ORDER BY RAND() LIMIT 1)
      FROM order_item oi
     WHERE oi.order_id = v_order
       AND EXISTS (SELECT 1 FROM food_option fo WHERE fo.food_id = oi.food_id)
       AND RAND() < 0.7;
  END WHILE seed_loop;

  SELECT COUNT(*) AS so_order_thu_dang_co
    FROM customer_order o JOIN invoice iv ON iv.id = o.invoice_id
   WHERE iv.bank_transaction_ref = 'SEED_KDS';
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- PHẦN 2: thêm order (đổi số 12 thành số order muốn thêm; 7 = múi giờ Việt Nam)
-- ---------------------------------------------------------------------
CALL seed_kds_orders(12, 7);
-- CALL seed_kds_orders(30, 7);   -- thật nhiều đơn

-- Ví dụ thêm THỦ CÔNG một order cho bàn 5 gồm 3 món chờ nấu (đổi id món cho đúng với bảng food của bạn):
-- INSERT INTO invoice (table_id, status, opened_at, bank_transaction_ref) VALUES (5, 'OPEN', NOW(), 'SEED_KDS');
-- SET @inv = LAST_INSERT_ID();
-- INSERT INTO customer_order (invoice_id, created_at) VALUES (@inv, NOW());
-- SET @ord = LAST_INSERT_ID();
-- INSERT INTO order_item (order_id, food_id, quantity, status, unit_price)
-- SELECT @ord, f.id, 1, 'CONFIRMED', f.price FROM food f WHERE f.id IN (1, 13, 40);

-- ---------------------------------------------------------------------
-- PHẦN 3: dọn dẹp
-- ---------------------------------------------------------------------
-- Đưa mọi món thử về "chờ nấu" để thử lại từ đầu:
-- SET SQL_SAFE_UPDATES = 0;
-- UPDATE order_item oi
--   JOIN customer_order o ON o.id = oi.order_id
--   JOIN invoice iv ON iv.id = o.invoice_id
--    SET oi.status = 'CONFIRMED', oi.started_cooking_at = NULL, oi.done_at = NULL
--  WHERE iv.bank_transaction_ref = 'SEED_KDS';

-- Xóa sạch toàn bộ dữ liệu thử (không đụng dữ liệu thật):
-- SET SQL_SAFE_UPDATES = 0;
-- DELETE oio FROM order_item_option oio
--   JOIN order_item oi ON oi.id = oio.order_item_id
--   JOIN customer_order o ON o.id = oi.order_id
--   JOIN invoice iv ON iv.id = o.invoice_id
--  WHERE iv.bank_transaction_ref = 'SEED_KDS';
-- DELETE oi FROM order_item oi
--   JOIN customer_order o ON o.id = oi.order_id
--   JOIN invoice iv ON iv.id = o.invoice_id
--  WHERE iv.bank_transaction_ref = 'SEED_KDS';
-- DELETE o FROM customer_order o
--   JOIN invoice iv ON iv.id = o.invoice_id
--  WHERE iv.bank_transaction_ref = 'SEED_KDS';
-- DELETE FROM invoice WHERE bank_transaction_ref = 'SEED_KDS';
