package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.inventory.Ingredient;
import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import com.sccgroup.restaurant_management.domain.entity.menu.AdjustType;
import com.sccgroup.restaurant_management.domain.entity.menu.Option;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
        for (Option option : options) {
            if (option.getScaleFactor() != null) {
                scale = scale.multiply(option.getScaleFactor());
            }
        }

        Map<Long, Ingredient> ingredients = new LinkedHashMap<>();
        Map<Long, BigDecimal> perUnit = new LinkedHashMap<>();

        for (Recipe recipe : recipes) {
            if (recipe.getQuantityRequired() == null) continue;
            Ingredient ingredient = recipe.getIngredient();
            ingredients.putIfAbsent(ingredient.getId(), ingredient);
            perUnit.merge(ingredient.getId(), recipe.getQuantityRequired().multiply(scale), BigDecimal::add);
        }

        for (Option option : options) {
            if (option.getIngredient() == null || option.getAdjustAmount() == null || option.getAdjustType() == null) continue;
            Ingredient ingredient = option.getIngredient();
            ingredients.putIfAbsent(ingredient.getId(), ingredient);
            BigDecimal delta = option.getAdjustType() == AdjustType.ADD
                    ? option.getAdjustAmount()
                    : option.getAdjustAmount().negate();
            perUnit.merge(ingredient.getId(), delta, BigDecimal::add);
        }

        BigDecimal quantityAsDecimal = BigDecimal.valueOf(quantity);
        List<IngredientNeed> result = new java.util.ArrayList<>();
        perUnit.forEach((id, amount) -> {
            BigDecimal total = amount.max(BigDecimal.ZERO).multiply(quantityAsDecimal); // REMOVE không làm âm
            if (total.signum() > 0) {
                result.add(new IngredientNeed(ingredients.get(id), total));
            }
        });
        return result;
    }

    /** Gom danh sách công thức thành foodId -> các dòng công thức của món đó. */
    public Map<Long, List<Recipe>> groupByFood(Collection<Recipe> recipes) {
        Map<Long, List<Recipe>> result = new java.util.HashMap<>();
        for (Recipe recipe : recipes) {
            result.computeIfAbsent(recipe.getFood().getId(), key -> new java.util.ArrayList<>()).add(recipe);
        }
        return result;
    }

    /**
     * Kho có đủ cho các nhu cầu này không, sau khi đã tính phần "đã dùng" bởi các dòng trước trong cùng đơn.
     * @param alreadyUsed ingredientId -> lượng các dòng trước đã cần (dùng để cộng dồn trong cùng một đơn)
     */
    public boolean isSufficient(List<IngredientNeed> needs, Map<Long, BigDecimal> alreadyUsed) {
        for (IngredientNeed need : needs) {
            BigDecimal stock = need.ingredient().getStockQuantity() == null
                    ? BigDecimal.ZERO : need.ingredient().getStockQuantity();
            BigDecimal used = alreadyUsed.getOrDefault(need.ingredient().getId(), BigDecimal.ZERO);
            if (stock.subtract(used).compareTo(need.amount()) < 0) {
                return false;
            }
        }
        return true;
    }

    /** Ghi nhận các nhu cầu vào map "đã dùng" sau khi một dòng đã được chấp nhận. */
    public void accumulate(List<IngredientNeed> needs, Map<Long, BigDecimal> alreadyUsed) {
        for (IngredientNeed need : needs) {
            alreadyUsed.merge(need.ingredient().getId(), need.amount(), BigDecimal::add);
        }
    }

    /**
     * Số suất tối đa còn làm được = min theo từng nguyên liệu của floor((tồn kho − đã giữ chỗ) / lượng cần mỗi suất).
     * Các nhu cầu trùng nguyên liệu (vd. nhiều món con của combo) được cộng gộp trước khi chia.
     * @param perPortionNeeds nhu cầu nguyên liệu của MỘT suất (một món hoặc một combo)
     * @param reserved        ingredientId -> lượng đã giữ chỗ bởi các đơn chưa tới bếp
     * @return null nếu món không có công thức (không giới hạn được)
     */
    public Integer maxPortions(List<IngredientNeed> perPortionNeeds, Map<Long, BigDecimal> reserved) {
        if (perPortionNeeds.isEmpty()) return null;
        Map<Long, Ingredient> ingredients = new LinkedHashMap<>();
        Map<Long, BigDecimal> total = new LinkedHashMap<>();
        for (IngredientNeed need : perPortionNeeds) {
            ingredients.putIfAbsent(need.ingredient().getId(), need.ingredient());
            total.merge(need.ingredient().getId(), need.amount(), BigDecimal::add);
        }
        int best = Integer.MAX_VALUE;
        for (Map.Entry<Long, BigDecimal> entry : total.entrySet()) {
            BigDecimal stock = ingredients.get(entry.getKey()).getStockQuantity();
            BigDecimal available = (stock == null ? BigDecimal.ZERO : stock)
                    .subtract(reserved.getOrDefault(entry.getKey(), BigDecimal.ZERO)).max(BigDecimal.ZERO);
            BigDecimal portions = available.divide(entry.getValue(), 0, RoundingMode.FLOOR);
            best = Math.min(best, portions.min(BigDecimal.valueOf(9999)).intValue());
        }
        return best;
    }
}
