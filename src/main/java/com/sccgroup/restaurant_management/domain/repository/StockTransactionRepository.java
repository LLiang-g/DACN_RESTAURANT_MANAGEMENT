package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.menu.StockTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

@org.springframework.stereotype.Repository("adminStockTransactionRepository")
public interface StockTransactionRepository extends JpaRepository<StockTransaction, Long> {
}
