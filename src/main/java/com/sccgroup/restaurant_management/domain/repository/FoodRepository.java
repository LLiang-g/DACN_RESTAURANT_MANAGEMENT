package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.menu.Food;
import org.springframework.data.jpa.repository.JpaRepository;

@org.springframework.stereotype.Repository("adminFoodRepository")
public interface FoodRepository extends JpaRepository<Food, Long> {
}
