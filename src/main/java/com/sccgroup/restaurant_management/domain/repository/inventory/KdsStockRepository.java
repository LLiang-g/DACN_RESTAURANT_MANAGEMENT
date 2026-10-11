package com.sccgroup.restaurant_management.domain.repository.inventory;

import com.sccgroup.restaurant_management.domain.entity.inventory.Ingredient;
import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

/** Hai truy vấn riêng cho việc trừ kho khi bếp bấm "Nấu". */
public interface KdsStockRepository extends Repository<Ingredient, Long> {

    /** Công thức (BOM) của một món, nạp sẵn nguyên liệu. */
    @Query("select r from Recipe r join fetch r.ingredient where r.food.id = :foodId")
    List<Recipe> findRecipesByFoodId(@Param("foodId") Long foodId);

    /**
     * Trừ kho một cách nguyên tử: chỉ trừ khi tồn kho còn đủ.
     * @return số dòng được cập nhật — 0 nghĩa là không đủ nguyên liệu
     */
    @Modifying(flushAutomatically = true)
    @Query("update Ingredient i set i.stockQuantity = i.stockQuantity - :amount " +
           "where i.id = :id and i.stockQuantity >= :amount")
    int deduct(@Param("id") Long id, @Param("amount") BigDecimal amount);
}
