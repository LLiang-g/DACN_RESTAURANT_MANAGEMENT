package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.inventory.Ingredient;
import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import com.sccgroup.restaurant_management.domain.entity.menu.AdjustType;
import com.sccgroup.restaurant_management.domain.entity.menu.Option;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tính lượng nguyên liệu cần cho một dòng món (BOM + ảnh hưởng của option) và
 * kiểm tra kho có đủ hay không. Lớp thuần logic, không truy cập DB, dùng chung
 * cho Customer (kiểm tra còn/hết) và KDS (trừ kho khi bấm "Nấu").
 *
 * Quy tắc option (theo Database.dbml — các trường độc lập, trường nào có giá trị thì áp dụng):
 *  - scaleFactor  : nhân toàn bộ định lượng của món (option kiểu size)
 *  - ingredient + adjustAmount + adjustType: ADD cộng thêm, REMOVE bớt đúng lượng đó (không âm)
 * Giả định: đơn vị của Recipe và Ingredient trùng nhau (schema chưa có hệ số quy đổi đơn vị).
 */
@Component
public class IngredientRequirementCalculator {

    /** Nhu cầu của một nguyên liệu: Ingredient (mang theo tồn kho hiện tại) + lượng cần. */
    public record IngredientNeed(Ingredient ingredient, BigDecimal amount) {}

    /**
     * @param recipes  công thức của món
     * @param quantity số phần
     * @param options  các option khách đã chọn (có thể rỗng)
     */
    public List<IngredientNeed> calculate(Collection<Recipe> recipes, int quantity, Collection<Option> options) {
        BigDecimal scale = BigDecimal.ONE;
        for (Option o : options) {
            if (o.getScaleFactor() != null) {
                scale = scale.multiply(o.getScaleFactor());
            }
        }

        Map<Long, Ingredient> ingredients = new LinkedHashMap<>();
        Map<Long, BigDecimal> perUnit = new LinkedHashMap<>();

        for (Recipe r : recipes) {
            if (r.getQuantityRequired() == null) continue;
            Ingredient ing = r.getIngredient();
            ingredients.putIfAbsent(ing.getId(), ing);
            perUnit.merge(ing.getId(), r.getQuantityRequired().multiply(scale), BigDecimal::add);
        }

        for (Option o : options) {
            if (o.getIngredient() == null || o.getAdjustAmount() == null || o.getAdjustType() == null) continue;
            Ingredient ing = o.getIngredient();
            ingredients.putIfAbsent(ing.getId(), ing);
            BigDecimal delta = o.getAdjustType() == AdjustType.ADD
                    ? o.getAdjustAmount()
                    : o.getAdjustAmount().negate();
            perUnit.merge(ing.getId(), delta, BigDecimal::add);
        }

        BigDecimal qty = BigDecimal.valueOf(quantity);
        List<IngredientNeed> result = new java.util.ArrayList<>();
        perUnit.forEach((id, amount) -> {
            BigDecimal total = amount.max(BigDecimal.ZERO).multiply(qty); // REMOVE không làm âm
            if (total.signum() > 0) {
                result.add(new IngredientNeed(ingredients.get(id), total));
            }
        });
        return result;
    }

    /** Gom danh sách công thức thành foodId -> các dòng công thức của món đó. */
    public Map<Long, List<Recipe>> groupByFood(Collection<Recipe> recipes) {
        Map<Long, List<Recipe>> result = new java.util.HashMap<>();
        for (Recipe r : recipes) {
            result.computeIfAbsent(r.getFood().getId(), k -> new java.util.ArrayList<>()).add(r);
        }
        return result;
    }

    /**
     * Kho có đủ cho các nhu cầu này không, sau khi đã tính phần "đã dùng" bởi các dòng trước trong cùng đơn.
     * @param alreadyUsed ingredientId -> lượng các dòng trước đã cần (dùng để cộng dồn trong cùng một đơn)
     */
    public boolean isSufficient(List<IngredientNeed> needs, Map<Long, BigDecimal> alreadyUsed) {
        for (IngredientNeed n : needs) {
            BigDecimal stock = n.ingredient().getStockQuantity() == null
                    ? BigDecimal.ZERO : n.ingredient().getStockQuantity();
            BigDecimal used = alreadyUsed.getOrDefault(n.ingredient().getId(), BigDecimal.ZERO);
            if (stock.subtract(used).compareTo(n.amount()) < 0) {
                return false;
            }
        }
        return true;
    }

    /** Ghi nhận các nhu cầu vào map "đã dùng" sau khi một dòng đã được chấp nhận. */
    public void accumulate(List<IngredientNeed> needs, Map<Long, BigDecimal> alreadyUsed) {
        for (IngredientNeed n : needs) {
            alreadyUsed.merge(n.ingredient().getId(), n.amount(), BigDecimal::add);
        }
    }
}
