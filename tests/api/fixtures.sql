-- Only mounted by tests/api/compose.yml. Never import into the working database.
USE smart_pos_kds;
INSERT INTO kitchen_station(id,name) VALUES(900001,'API test station');
INSERT INTO category(id,name,station_id) VALUES(900001,'API test category',900001);
INSERT INTO ingredient(id,name,unit,stock_quantity,min_threshold) VALUES(900001,'API test ingredient','kg',100,1);
INSERT INTO food(id,category_id,name,price,estimated_cooking_time) VALUES(900001,900001,'API test food',10000,5);
INSERT INTO recipe(food_id,ingredient_id,quantity_required) VALUES(900001,900001,1);
INSERT INTO restaurant_table(id,floor,table_number,position_x,position_y,status) VALUES(900001,'API TEST','KDS',0,0,'SERVING'),(900002,'API TEST','CUSTOMER',0,0,'AVAILABLE');
INSERT INTO invoice(id,table_id,status,opened_at) VALUES(900001,900001,'OPEN',NOW());
INSERT INTO customer_order(id,invoice_id,created_at) VALUES(900001,900001,NOW());
-- Same order, same station: finishing the first item must not auto-start the second.
INSERT INTO order_item(id,order_id,food_id,quantity,status,unit_price) VALUES(900001,900001,900001,1,'CONFIRMED',10000),(900002,900001,900001,1,'CONFIRMED',10000);
