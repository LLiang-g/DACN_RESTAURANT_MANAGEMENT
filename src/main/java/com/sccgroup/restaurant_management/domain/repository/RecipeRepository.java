package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

@org.springframework.stereotype.Repository("adminRecipeRepository")
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    List<Recipe> findByFoodId(Long foodId);
    boolean existsByFoodIdAndIngredientId(Long foodId, Long ingredientId);
}
