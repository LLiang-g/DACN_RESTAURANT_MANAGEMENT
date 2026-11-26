package com.sccgroup.restaurant_management.domain.repository.menu;

import com.sccgroup.restaurant_management.domain.entity.menu.Food;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface FoodRepository extends JpaRepository<Food, Long> {

    /** Toàn bộ món kèm danh mục (join fetch để không bị N+1 khi dựng menu). */
    @Query("select f from Food f join fetch f.category c order by c.id, f.id")
    List<Food> findAllWithCategory();
}
