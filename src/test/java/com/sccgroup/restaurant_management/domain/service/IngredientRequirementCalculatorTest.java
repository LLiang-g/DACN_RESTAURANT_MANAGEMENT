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

    private final IngredientRequirementCalculator calculator = new IngredientRequirementCalculator();

    private static <T> T withId(T entity, long id) {
        try {
            Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
            return entity;
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static BigDecimal decimal(String value) { return new BigDecimal(value); }

    private Ingredient ingredient(long id, String stock) {
        return withId(new Ingredient("nl" + id, "g", decimal(stock), decimal("0")), id);
    }

    private void assertAmount(String expected, BigDecimal actual) {
        assertEquals(0, decimal(expected).compareTo(actual));
    }

    @Test
    void baseRecipeMultipliedByQuantity() {
        Food food = withId(new Food(null, "Phở", decimal("50000")), 1);
        Ingredient beef = ingredient(1, "1000");
        List<IngredientNeed> needs = calculator.calculate(List.of(new Recipe(food, beef, decimal("100"))), 3, List.of());
        assertEquals(1, needs.size());
        assertAmount("300", needs.get(0).amount());
    }

    @Test
    void sizeOptionScalesWholeRecipe() {
        Food food = withId(new Food(null, "Phở", decimal("50000")), 1);
        Ingredient beef = ingredient(1, "1000");
        Option large = new Option(food, "Size L", new OptionGroup("Size", SelectionType.SINGLE_CHOICE));
        large.setScaleFactor(decimal("1.5"));
        List<IngredientNeed> needs = calculator.calculate(List.of(new Recipe(food, beef, decimal("100"))), 2, List.of(large));
        assertAmount("300", needs.get(0).amount()); // 100 * 1.5 * 2
    }

    @Test
    void addAndRemoveOptionsAdjustIngredient() {
        Food food = withId(new Food(null, "Mì", decimal("40000")), 1);
        Ingredient onion = ingredient(1, "1000");
        Ingredient egg = ingredient(2, "1000");
        OptionGroup group = new OptionGroup("Thêm bớt", SelectionType.MULTI_CHOICE);

        Option noOnion = new Option(food, "Không hành", group);
        noOnion.setIngredient(onion);
        noOnion.setAdjustType(AdjustType.REMOVE);
        noOnion.setAdjustAmount(decimal("50")); // lớn hơn định lượng hành -> không được âm

        Option extraEgg = new Option(food, "Thêm trứng", group);
        extraEgg.setIngredient(egg);
        extraEgg.setAdjustType(AdjustType.ADD);
        extraEgg.setAdjustAmount(decimal("1"));

        List<IngredientNeed> needs = calculator.calculate(
                List.of(new Recipe(food, onion, decimal("20"))), 2, List.of(noOnion, extraEgg));

        assertEquals(1, needs.size()); // hành về 0 nên không còn nhu cầu
        assertEquals(2L, needs.get(0).ingredient().getId().longValue());
        assertAmount("2", needs.get(0).amount());
    }

    @Test
    void sufficiencyAccountsForAlreadyUsedInSameOrder() {
        Food food = withId(new Food(null, "Phở", decimal("50000")), 1);
        Ingredient beef = ingredient(1, "250");
        List<IngredientNeed> needs = calculator.calculate(List.of(new Recipe(food, beef, decimal("100"))), 2, List.of());

        Map<Long, BigDecimal> used = new HashMap<>();
        assertTrue(calculator.isSufficient(needs, used));   // cần 200, còn 250
        calculator.accumulate(needs, used);
        assertFalse(calculator.isSufficient(needs, used));  // dòng thứ hai lại cần 200, chỉ còn 50
    }

    @Test
    void maxPortionsIsLimitedByScarcestIngredientAfterReservation() {
        Food food = withId(new Food(null, "Phở", decimal("50000")), 1);
        Ingredient beef = ingredient(1, "1000");   // 1000 / 100 = 10 suất
        Ingredient noodle = ingredient(2, "600");  // 600 / 150 = 4 suất  -> nguyên liệu khan hiếm nhất
        List<IngredientNeed> perPortion = calculator.calculate(
                List.of(new Recipe(food, beef, decimal("100")), new Recipe(food, noodle, decimal("150"))), 1, List.of());

        assertEquals(4, calculator.maxPortions(perPortion, new HashMap<>()).intValue());

        Map<Long, BigDecimal> reserved = new HashMap<>();
        reserved.put(2L, decimal("300")); // các đơn chưa tới bếp đang giữ 300 bánh phở -> còn 300 / 150 = 2 suất
        assertEquals(2, calculator.maxPortions(perPortion, reserved).intValue());

        reserved.put(2L, decimal("900")); // giữ nhiều hơn tồn kho -> 0, không âm
        assertEquals(0, calculator.maxPortions(perPortion, reserved).intValue());
    }

    @Test
    void maxPortionsIsNullWhenNoRecipe() {
        assertTrue(calculator.maxPortions(List.of(), new HashMap<>()) == null);
    }

    @Test
    void sharedIngredientInComboIsSummedBeforeDividing() {
        Food firstFood = withId(new Food(null, "A", decimal("1")), 1);
        Food secondFood = withId(new Food(null, "B", decimal("1")), 2);
        Ingredient oil = ingredient(1, "100");
        List<IngredientNeed> needs = new java.util.ArrayList<>();
        needs.addAll(calculator.calculate(List.of(new Recipe(firstFood, oil, decimal("30"))), 1, List.of()));
        needs.addAll(calculator.calculate(List.of(new Recipe(secondFood, oil, decimal("20"))), 2, List.of())); // 30 + 40 = 70 / combo
        assertEquals(1, calculator.maxPortions(needs, new HashMap<>()).intValue()); // 100 / 70 = 1
    }
}
