package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.inventory.Ingredient;
import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import com.sccgroup.restaurant_management.domain.entity.menu.AdjustType;
import com.sccgroup.restaurant_management.domain.entity.menu.Food;
import com.sccgroup.restaurant_management.domain.entity.menu.Option;
import com.sccgroup.restaurant_management.domain.entity.menu.OptionGroup;
import com.sccgroup.restaurant_management.domain.entity.menu.SelectionType;
import com.sccgroup.restaurant_management.domain.service.IngredientRequirementCalculator.IngredientNeed;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Test thuần logic, không cần Spring hay MySQL. */
class IngredientRequirementCalculatorTest {

    private final IngredientRequirementCalculator calc = new IngredientRequirementCalculator();

    private static <T> T withId(T entity, long id) {
        try {
            Field f = entity.getClass().getDeclaredField("id");
            f.setAccessible(true);
            f.set(entity, id);
            return entity;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static BigDecimal bd(String v) { return new BigDecimal(v); }

    private Ingredient ingredient(long id, String stock) {
        return withId(new Ingredient("nl" + id, "g", bd(stock), bd("0")), id);
    }

    private void assertAmount(String expected, BigDecimal actual) {
        assertEquals(0, bd(expected).compareTo(actual));
    }

    @Test
    void baseRecipeMultipliedByQuantity() {
        Food food = withId(new Food(null, "Phở", bd("50000")), 1);
        Ingredient beef = ingredient(1, "1000");
        List<IngredientNeed> needs = calc.calculate(List.of(new Recipe(food, beef, bd("100"))), 3, List.of());
        assertEquals(1, needs.size());
        assertAmount("300", needs.get(0).amount());
    }

    @Test
    void sizeOptionScalesWholeRecipe() {
        Food food = withId(new Food(null, "Phở", bd("50000")), 1);
        Ingredient beef = ingredient(1, "1000");
        Option large = new Option(food, "Size L", new OptionGroup("Size", SelectionType.SINGLE_CHOICE));
        large.setScaleFactor(bd("1.5"));
        List<IngredientNeed> needs = calc.calculate(List.of(new Recipe(food, beef, bd("100"))), 2, List.of(large));
        assertAmount("300", needs.get(0).amount()); // 100 * 1.5 * 2
    }

    @Test
    void addAndRemoveOptionsAdjustIngredient() {
        Food food = withId(new Food(null, "Mì", bd("40000")), 1);
        Ingredient onion = ingredient(1, "1000");
        Ingredient egg = ingredient(2, "1000");
        OptionGroup group = new OptionGroup("Thêm bớt", SelectionType.MULTI_CHOICE);

        Option noOnion = new Option(food, "Không hành", group);
        noOnion.setIngredient(onion);
        noOnion.setAdjustType(AdjustType.REMOVE);
        noOnion.setAdjustAmount(bd("50")); // lớn hơn định lượng hành -> không được âm

        Option extraEgg = new Option(food, "Thêm trứng", group);
        extraEgg.setIngredient(egg);
        extraEgg.setAdjustType(AdjustType.ADD);
        extraEgg.setAdjustAmount(bd("1"));

        List<IngredientNeed> needs = calc.calculate(
                List.of(new Recipe(food, onion, bd("20"))), 2, List.of(noOnion, extraEgg));

        assertEquals(1, needs.size()); // hành về 0 nên không còn nhu cầu
        assertEquals(2L, needs.get(0).ingredient().getId().longValue());
        assertAmount("2", needs.get(0).amount());
    }

    @Test
    void sufficiencyAccountsForAlreadyUsedInSameOrder() {
        Food food = withId(new Food(null, "Phở", bd("50000")), 1);
        Ingredient beef = ingredient(1, "250");
        List<IngredientNeed> needs = calc.calculate(List.of(new Recipe(food, beef, bd("100"))), 2, List.of());

        Map<Long, BigDecimal> used = new HashMap<>();
        assertTrue(calc.isSufficient(needs, used));   // cần 200, còn 250
        calc.accumulate(needs, used);
        assertFalse(calc.isSufficient(needs, used));  // dòng thứ hai lại cần 200, chỉ còn 50
    }
}
