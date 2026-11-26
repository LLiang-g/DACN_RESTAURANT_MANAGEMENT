-- E2E schema contract: DDL only, never demo data.
-- Source: database/init/sample_database.26.11.22.sql sha256=67a4d29e74b081fd3020d57a3c547bb021ba16639110806c3c12fc133c24c207

CREATE TABLE `kitchen_station` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `staff_account` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN','RECEPTIONIST') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `kitchen_account` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `station_id` BIGINT NOT NULL,
  FOREIGN KEY (`station_id`) REFERENCES `kitchen_station`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `category` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `station_id` BIGINT NOT NULL,
  FOREIGN KEY (`station_id`) REFERENCES `kitchen_station`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `ingredient` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `stock_quantity` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `min_threshold` DECIMAL(12,3) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `food` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `category_id` BIGINT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(12,2) NOT NULL,
  `image` VARCHAR(500) NULL,
  `description` TEXT NULL,
  `estimated_cooking_time` INT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `category`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `option_group` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `selection_type` ENUM('SINGLE_CHOICE','MULTI_CHOICE') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `food_option` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `food_id` BIGINT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `group_id` BIGINT NOT NULL,
  `ingredient_id` BIGINT NULL,
  `adjust_amount` DECIMAL(12,3) NULL,
  `adjust_type` ENUM('ADD','REMOVE') NULL,
  `price_delta` DECIMAL(12,2) NULL,
  `scale_factor` DECIMAL(8,3) NULL,
  FOREIGN KEY (`food_id`) REFERENCES `food`(`id`),
  FOREIGN KEY (`group_id`) REFERENCES `option_group`(`id`),
  FOREIGN KEY (`ingredient_id`) REFERENCES `ingredient`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `combo` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `discount_type` ENUM('FIXED','PERCENT') NOT NULL,
  `discount_value` DECIMAL(12,2) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `combo_item` (
  `combo_id` BIGINT NOT NULL,
  `food_id` BIGINT NOT NULL,
  `quantity` INT NOT NULL,
  PRIMARY KEY (`combo_id`,`food_id`),
  FOREIGN KEY (`combo_id`) REFERENCES `combo`(`id`),
  FOREIGN KEY (`food_id`) REFERENCES `food`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `recipe` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `food_id` BIGINT NOT NULL,
  `ingredient_id` BIGINT NOT NULL,
  `quantity_required` DECIMAL(12,3) NOT NULL,
  FOREIGN KEY (`food_id`) REFERENCES `food`(`id`),
  FOREIGN KEY (`ingredient_id`) REFERENCES `ingredient`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `stock_transaction` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `ingredient_id` BIGINT NOT NULL,
  `type` ENUM('IMPORT','EXPORT','ADJUST') NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL,
  `note` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL,
  FOREIGN KEY (`ingredient_id`) REFERENCES `ingredient`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `restaurant_table` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `floor` VARCHAR(50) NOT NULL,
  `table_number` VARCHAR(50) NOT NULL,
  `position_x` INT NOT NULL,
  `position_y` INT NOT NULL,
  `status` ENUM('AVAILABLE','SERVING') NOT NULL DEFAULT 'AVAILABLE',
  UNIQUE KEY `uq_table_floor_number` (`floor`,`table_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `invoice` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `table_id` BIGINT NOT NULL,
  `status` ENUM('OPEN','PAID','CANCELLED') NOT NULL,
  `payment_method` ENUM('CASH','BANK_TRANSFER') NULL,
  `amount_received` DECIMAL(12,2) NULL,
  `change_amount` DECIMAL(12,2) NULL,
  `bank_transaction_ref` VARCHAR(255) NULL,
  `opened_at` DATETIME NULL,
  `paid_at` DATETIME NULL,
  `cancelled_at` DATETIME NULL,
  FOREIGN KEY (`table_id`) REFERENCES `restaurant_table`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payment_transaction (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT NOT NULL,
  provider VARCHAR(20) NOT NULL,
  txn_ref VARCHAR(64) NOT NULL UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  provider_txn_no VARCHAR(64) NULL,
  created_at DATETIME NOT NULL,
  paid_at DATETIME NULL,
  CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoice(id),
  INDEX idx_payment_invoice_status (invoice_id, status)
);

CREATE TABLE `customer_order` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` BIGINT NOT NULL,
  `created_at` DATETIME NOT NULL,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_combo` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `order_id` BIGINT NOT NULL,
  `combo_id` BIGINT NOT NULL,
  `quantity` INT NOT NULL,
  `combo_price` DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `customer_order`(`id`),
  FOREIGN KEY (`combo_id`) REFERENCES `combo`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_item` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `order_id` BIGINT NOT NULL,
  `food_id` BIGINT NOT NULL,
  `quantity` INT NOT NULL,
  `status` ENUM('PENDING','CONFIRMED','REJECTED','COOKING','DONE','SERVED','RETURNED') NOT NULL,
  `note` VARCHAR(500) NULL,
  `started_cooking_at` DATETIME NULL,
  `done_at` DATETIME NULL,
  `served_at` DATETIME NULL,
  `returned_at` DATETIME NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `combo_order_id` BIGINT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `customer_order`(`id`),
  FOREIGN KEY (`food_id`) REFERENCES `food`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_item_option` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `order_item_id` BIGINT NOT NULL,
  `option_id` BIGINT NOT NULL,
  FOREIGN KEY (`order_item_id`) REFERENCES `order_item`(`id`),
  FOREIGN KEY (`option_id`) REFERENCES `food_option`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `activity_log` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `account_id` BIGINT NULL,
  `account_type` ENUM('STAFF','KITCHEN') NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(100) NOT NULL,
  `target_id` BIGINT NULL,
  `detail` VARCHAR(1000) NULL,
  `created_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `call_staff_request` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `table_id` BIGINT NOT NULL,
  `created_at` DATETIME NOT NULL,
  `resolved_at` DATETIME NULL,
  `status` ENUM('PENDING','RESOLVED') NOT NULL,
  FOREIGN KEY (`table_id`) REFERENCES `restaurant_table`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_order_submission (
    id BIGINT NOT NULL AUTO_INCREMENT,
    table_id BIGINT NOT NULL,
    request_key VARCHAR(36) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    response_json LONGTEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_customer_order_submission_table_key UNIQUE (table_id, request_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
