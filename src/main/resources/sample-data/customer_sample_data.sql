-- Dữ liệu mẫu để test module Customer khi phân hệ Admin chưa xong.
-- Cách dùng: chạy ứng dụng 1 lần (ddl-auto=update tự tạo bảng) rồi chạy file này trong MySQL Workbench/CLI.
-- Chạy trên DB trống. Muốn chạy lại: xóa dữ liệu các bảng này trước.
USE restaurant_management;

INSERT INTO kitchen_station (id, name) VALUES (1, 'Bếp nóng'), (2, 'Bar');

INSERT INTO category (id, name, station_id) VALUES (1, 'Món chính', 1), (2, 'Đồ uống', 2);

INSERT INTO ingredient (id, name, unit, stock_quantity, min_threshold) VALUES
 (1, 'Thịt bò',   'g',   5000, 500),
 (2, 'Bánh phở',  'g',  10000, 1000),
 (3, 'Trứng',     'cái',   50, 10),
 (4, 'Hành',      'g',   1000, 100),
 (5, 'Chả nướng', 'g',      0, 200),   -- hết hàng -> Bún chả hiển thị 'tạm hết'
 (6, 'Trà đào',   'g',   2000, 200);

INSERT INTO food (id, category_id, name, price, image, description, estimated_cooking_time) VALUES
 (1, 1, 'Phở bò',   50000, NULL, 'Phở bò tái nạm', 10),
 (2, 1, 'Bún chả',  55000, NULL, 'Bún chả Hà Nội',  12),
 (3, 2, 'Trà đào',  30000, NULL, 'Trà đào cam sả',   3);

INSERT INTO recipe (food_id, ingredient_id, quantity_required) VALUES
 (1, 1, 100), (1, 2, 150), (1, 4, 10),
 (2, 5, 120),
 (3, 6, 10);

INSERT INTO option_group (id, name, selection_type) VALUES (1, 'Size', 'SINGLE_CHOICE'), (2, 'Thêm/bớt', 'MULTI_CHOICE');

-- Size đổi giá + hệ số định lượng; 'Thêm trứng'/'Không hành' chỉ chỉnh nguyên liệu, không đổi giá
INSERT INTO food_option (id, food_id, name, group_id, ingredient_id, adjust_amount, adjust_type, price_delta, scale_factor) VALUES
 (1, 1, 'Size S',       1, NULL, NULL, NULL,     -5000, 0.80),
 (2, 1, 'Size M',       1, NULL, NULL, NULL,         0, 1.00),
 (3, 1, 'Size L',       1, NULL, NULL, NULL,     15000, 1.50),
 (4, 1, 'Thêm trứng',   2, 3,    1,    'ADD',     NULL, NULL),
 (5, 1, 'Không hành',   2, 4,    10,   'REMOVE',  NULL, NULL);

INSERT INTO combo (id, name, discount_type, discount_value) VALUES (1, 'Combo Phở + Trà đào', 'PERCENT', 10);
INSERT INTO combo_item (combo_id, food_id, quantity) VALUES (1, 1, 1), (1, 3, 1);

INSERT INTO restaurant_table (id, floor, table_number, status) VALUES
 (1, 'Tầng 1', '01', 'TRONG'), (2, 'Tầng 1', '02', 'TRONG'), (3, 'Tầng 2', '01', 'TRONG');
