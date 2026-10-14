package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.menu.Combo;
import com.sccgroup.restaurant_management.domain.entity.menu.ComboItem;
import com.sccgroup.restaurant_management.domain.entity.menu.DiscountType;
import com.sccgroup.restaurant_management.domain.entity.menu.Food;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ComboPriceCalculatorTest {

    private final ComboPriceCalculator calculator = new ComboPriceCalculator();

    private List<ComboItem> items(Combo combo) {
        Food firstFood = new Food(null, "A", new BigDecimal("50000"));
        Food secondFood = new Food(null, "B", new BigDecimal("20000"));
        return List.of(new ComboItem(combo, firstFood, 1), new ComboItem(combo, secondFood, 2)); // 50000 + 2*20000 = 90000
    }

    @Test
    void fixedDiscountValueIsComboPrice() {
        Combo combo = new Combo("C", DiscountType.FIXED, new BigDecimal("75000"));
        assertEquals(0, new BigDecimal("75000").compareTo(calculator.price(combo, items(combo))));
    }

    @Test
    void percentDiscountComputedFromChildrenTotal() {
        Combo combo = new Combo("C", DiscountType.PERCENT, new BigDecimal("10"));
        assertEquals(0, new BigDecimal("81000").compareTo(calculator.price(combo, items(combo))));
        assertEquals(0, new BigDecimal("90000").compareTo(calculator.originalPrice(items(combo))));
    }
}
