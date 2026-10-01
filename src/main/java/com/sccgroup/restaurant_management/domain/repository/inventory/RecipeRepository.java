package com.sccgroup.restaurant_management.domain.repository.inventory;

import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    @EntityGraph(attributePaths = {"ingredient", "food"})
    List<Recipe> findByFoodIdIn(Collection<Long> foodIds);

    @Query("select r from Recipe r join fetch r.ingredient join fetch r.food")
    List<Recipe> findAllWithIngredient();
}
