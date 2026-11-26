-- Only for restaurant_e2e. Hibernate creates the schema before this initializer.
-- No production/sample dump is imported. Fixed IDs intentionally preserve admin recipe fixture IDs.
INSERT INTO kitchen_station(id,name) VALUES(900001,'E2E hot'),(900002,'E2E bar');
INSERT INTO category(id,name,station_id) VALUES(900001,'E2E FOUNDATION v1 HOT',900001),(900002,'E2E drinks',900002);
INSERT INTO ingredient(id,name,unit,stock_quantity,min_threshold) VALUES
 (900001,'E2E main ingredient','kg',100,5),(900002,'E2E drink ingredient','kg',100,5),(900003,'E2E depleted ingredient','kg',0,1);
INSERT INTO food(id,category_id,name,price,estimated_cooking_time) VALUES
 (900001,900001,'E2E main food',20000,5),(900002,900002,'E2E drink',10000,2),(900003,900001,'E2E sold out',15000,5);
INSERT INTO recipe(id,food_id,ingredient_id,quantity_required) VALUES(900001,900001,900001,0.25),(900002,900002,900002,0.10),(900003,900003,900003,1);
INSERT INTO option_group(id,name,selection_type) VALUES(900001,'E2E extras','MULTI_CHOICE');
INSERT INTO food_option(id,food_id,group_id,name,ingredient_id,adjust_type,adjust_amount,price_delta) VALUES(900001,900001,900001,'E2E extra portion',900001,'ADD',0.10,5000);
INSERT INTO combo(id,name,discount_type,discount_value) VALUES(900001,'E2E meal set','FIXED',5000);
INSERT INTO combo_item(combo_id,food_id,quantity) VALUES(900001,900001,1),(900001,900002,1);
INSERT INTO restaurant_table(id,floor,table_number,position_x,position_y,status) VALUES
 (900001,'E2E','E01',0,0,'AVAILABLE'),(900002,'E2E','E02',100,0,'AVAILABLE'),(900003,'E2E','E03',200,0,'AVAILABLE'),(900004,'E2E','E04',300,0,'AVAILABLE');
INSERT INTO staff_account(id,username,password_hash,role) VALUES
 (900001,'admin.e2e','$2a$10$dQeK6dh9b/uAUG3T4lzgluyxBQ0VDVKSb8.WpMYU3h.vKFa3Hv.MW','ADMIN'),(900002,'pos.e2e','$2a$10$dQeK6dh9b/uAUG3T4lzgluyxBQ0VDVKSb8.WpMYU3h.vKFa3Hv.MW','RECEPTIONIST');
INSERT INTO kitchen_account(id,username,password_hash,station_id) VALUES
 (900001,'kitchen.hot.e2e','$2a$10$dQeK6dh9b/uAUG3T4lzgluyxBQ0VDVKSb8.WpMYU3h.vKFa3Hv.MW',900001),(900002,'kitchen.bar.e2e','$2a$10$dQeK6dh9b/uAUG3T4lzgluyxBQ0VDVKSb8.WpMYU3h.vKFa3Hv.MW',900002);
