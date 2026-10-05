package com.sccgroup.restaurant_management.domain.repository.menu;

import com.sccgroup.restaurant_management.domain.entity.menu.Option;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface OptionRepository extends JpaRepository<Option, Long> {

    @EntityGraph(attributePaths = {"optionGroup", "ingredient", "food"})
    List<Option> findByFoodId(Long foodId);

    @EntityGraph(attributePaths = {"optionGroup", "ingredient", "food"})
    List<Option> findByFoodIdIn(Collection<Long> foodIds);

    @EntityGraph(attributePaths = {"optionGroup", "ingredient", "food"})
    List<Option> findByIdIn(Collection<Long> ids);
}
