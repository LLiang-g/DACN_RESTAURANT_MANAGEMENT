package com.sccgroup.restaurant_management.domain.repository.inventory;

import com.sccgroup.restaurant_management.domain.entity.menu.StockTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

// Chỉ thêm file này nếu dự án CHƯA có StockTransactionRepository (có rồi thì bỏ qua, dùng file của nhóm)
public interface StockTransactionRepository extends JpaRepository<StockTransaction, Long> {
}
