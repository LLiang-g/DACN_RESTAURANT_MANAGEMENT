package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.menu.Food;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FoodAvailabilityRepository extends JpaRepository<Food, Long> {
}
