package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.menu.Combo;
import com.sccgroup.restaurant_management.domain.entity.menu.ComboItem;
import com.sccgroup.restaurant_management.domain.entity.menu.DiscountType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;

/**
 * Tính giá combo. Bảng combo không có cột giá, giá được suy ra từ (discountType, discountValue):
 *  - FIXED   : discountValue chính là giá bán của combo ("nhập số tiền cụ thể")
 *  - PERCENT : giá = tổng giá các món con × (1 − discountValue/100), làm tròn đến đồng
 */
@Component
public class ComboPriceCalculator {

    /** Tổng giá gốc của các món con (giá món × số lượng trong combo). */
    public BigDecimal originalPrice(Collection<ComboItem> items) {
        BigDecimal sum = BigDecimal.ZERO;
        for (ComboItem ci : items) {
            BigDecimal price = ci.getFood().getPrice() == null ? BigDecimal.ZERO : ci.getFood().getPrice();
            sum = sum.add(price.multiply(BigDecimal.valueOf(ci.getQuantity() == null ? 1 : ci.getQuantity())));
        }
        return sum;
    }

    /** Giá bán của 1 combo. */
    public BigDecimal price(Combo combo, Collection<ComboItem> items) {
        BigDecimal original = originalPrice(items);
        BigDecimal value = combo.getDiscountValue();
        if (combo.getDiscountType() == null || value == null) {
            return original;
        }
        BigDecimal price;
        if (combo.getDiscountType() == DiscountType.FIXED) {
            price = value;
        } else {
            BigDecimal factor = BigDecimal.ONE.subtract(value.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
            price = original.multiply(factor);
        }
        return price.max(BigDecimal.ZERO).setScale(0, RoundingMode.HALF_UP);
    }
}
