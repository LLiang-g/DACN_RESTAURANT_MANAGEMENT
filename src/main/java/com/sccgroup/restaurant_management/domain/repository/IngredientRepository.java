package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.inventory.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {
}
