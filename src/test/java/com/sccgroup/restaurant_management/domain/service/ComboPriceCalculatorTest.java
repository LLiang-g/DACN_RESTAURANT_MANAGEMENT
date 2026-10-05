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

    private final ComboPriceCalculator calc = new ComboPriceCalculator();

    private List<ComboItem> items(Combo combo) {
        Food a = new Food(null, "A", new BigDecimal("50000"));
        Food b = new Food(null, "B", new BigDecimal("20000"));
        return List.of(new ComboItem(combo, a, 1), new ComboItem(combo, b, 2)); // 50000 + 2*20000 = 90000
    }

    @Test
    void fixedDiscountValueIsComboPrice() {
        Combo combo = new Combo("C", DiscountType.FIXED, new BigDecimal("75000"));
        assertEquals(0, new BigDecimal("75000").compareTo(calc.price(combo, items(combo))));
    }

    @Test
    void percentDiscountComputedFromChildrenTotal() {
        Combo combo = new Combo("C", DiscountType.PERCENT, new BigDecimal("10"));
        assertEquals(0, new BigDecimal("81000").compareTo(calc.price(combo, items(combo))));
        assertEquals(0, new BigDecimal("90000").compareTo(calc.originalPrice(items(combo))));
    }
}
