package com.sccgroup.restaurant_management.admin.dto;

import com.sccgroup.restaurant_management.domain.entity.account.StaffRole;
import com.sccgroup.restaurant_management.domain.entity.floor.TableStatus;
import com.sccgroup.restaurant_management.domain.entity.inventory.Ingredient;
import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import com.sccgroup.restaurant_management.domain.entity.menu.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class AdminDtos {
    private AdminDtos() {
    }

    public record StationRequest(String name) {
    }

    public record CategoryRequest(String name, Long stationId) {
    }

    public record FoodRequest(Long categoryId, String name, BigDecimal price, String image, String description,
                              Integer estimatedCookingTime) {
    }

    public record IngredientRequest(String name, String unit, BigDecimal stockQuantity, BigDecimal minThreshold) {
    }

    public record RecipeRequest(Long foodId, Long ingredientId, BigDecimal quantityRequired) {
    }

    public record StockRequest(Long ingredientId, StockTransactionType type, BigDecimal quantity, String note) {
    }

    public record OptionGroupRequest(String name, SelectionType selectionType) {
    }

    public record OptionRequest(Long foodId, String name, Long groupId, Long ingredientId, BigDecimal adjustAmount,
                                AdjustType adjustType, BigDecimal priceDelta, BigDecimal scaleFactor) {
    }

    public record ComboRequest(String name, DiscountType discountType, BigDecimal discountValue) {
    }

    public record ComboItemRequest(Long foodId, Integer quantity) {
    }

    public record TableRequest(String floor, String tableNumber, TableStatus status) {
    }

    public record StaffAccountRequest(String username, String password, StaffRole role) {
    }

    public record KitchenAccountRequest(String username, String password, Long stationId) {
    }

    public record IdResponse(Long id) {
    }

    public record CategoryResponse(Long id, String name, Long stationId, String kitchenStation) {
    }

    public record FoodResponse(Long id, Long categoryId, String category, String name, BigDecimal price, String image,
                               String description, Integer estimatedCookingTime) {
    }

    public record RecipeResponse(Long id, Long foodId, String foodName, Long ingredientId, String ingredientName,
                                 String ingredientUnit, BigDecimal quantityRequired) {
    }

    public record StockTransactionResponse(Long id, Long ingredientId, String ingredientName, StockTransactionType type,
                                           BigDecimal quantity, String note, LocalDateTime createdAt) {
    }

    public record OptionResponse(Long id, Long foodId, String foodName, String name, Long groupId, String groupName,
                                 Long ingredientId, String ingredientName, BigDecimal adjustAmount,
                                 AdjustType adjustType, BigDecimal priceDelta, BigDecimal scaleFactor) {
    }

    public record ComboItemResponse(Long comboId, Long foodId, String foodName, BigDecimal foodPrice, Integer quantity) {
    }

    public record AccountResponse(Long id, String username, StaffRole role, Long stationId) {
    }

    public static CategoryResponse toCategory(Category c) {
        if (c == null) return null;
        Long stationId = c.getKitchenStation() != null ? c.getKitchenStation().getId() : null;
        String stationName = c.getKitchenStation() != null ? c.getKitchenStation().getName() : null;
        return new CategoryResponse(c.getId(), c.getName(), stationId, stationName);
    }

    public static FoodResponse toFood(Food f) {
        if (f == null) return null;
        Long catId = f.getCategory() != null ? f.getCategory().getId() : null;
        String catName = f.getCategory() != null ? f.getCategory().getName() : null;
        return new FoodResponse(f.getId(), catId, catName, f.getName(), f.getPrice(), f.getImage(), f.getDescription(), f.getEstimatedCookingTime());
    }

    public static RecipeResponse toRecipe(Recipe r) {
        if (r == null) return null;
        Long foodId = r.getFood() != null ? r.getFood().getId() : null;
        String foodName = r.getFood() != null ? r.getFood().getName() : null;
        Long ingId = r.getIngredient() != null ? r.getIngredient().getId() : null;
        String ingName = r.getIngredient() != null ? r.getIngredient().getName() : null;
        String ingUnit = r.getIngredient() != null ? r.getIngredient().getUnit() : null;
        return new RecipeResponse(r.getId(), foodId, foodName, ingId, ingName, ingUnit, r.getQuantityRequired());
    }

    public static StockTransactionResponse toStockTransaction(StockTransaction s) {
        if (s == null) return null;
        Long ingId = s.getIngredient() != null ? s.getIngredient().getId() : null;
        String ingName = s.getIngredient() != null ? s.getIngredient().getName() : null;
        return new StockTransactionResponse(s.getId(), ingId, ingName, s.getType(), s.getQuantity(), s.getNote(), s.getCreatedAt());
    }

    public static OptionResponse toOption(Option o) {
        if (o == null) return null;
        Long foodId = o.getFood() != null ? o.getFood().getId() : null;
        String foodName = o.getFood() != null ? o.getFood().getName() : null;
        Long groupId = o.getOptionGroup() != null ? o.getOptionGroup().getId() : null;
        String groupName = o.getOptionGroup() != null ? o.getOptionGroup().getName() : null;
        Long ingId = o.getIngredient() != null ? o.getIngredient().getId() : null;
        String ingName = o.getIngredient() != null ? o.getIngredient().getName() : null;
        return new OptionResponse(o.getId(), foodId, foodName, o.getName(), groupId, groupName, ingId, ingName, o.getAdjustAmount(), o.getAdjustType(), o.getPriceDelta(), o.getScaleFactor());
    }

    public static ComboItemResponse toComboItem(ComboItem ci) {
        if (ci == null) return null;
        Long comboId = ci.getCombo() != null ? ci.getCombo().getId() : null;
        Long foodId = ci.getFood() != null ? ci.getFood().getId() : null;
        String foodName = ci.getFood() != null ? ci.getFood().getName() : null;
        BigDecimal foodPrice = ci.getFood() != null ? ci.getFood().getPrice() : null;
        return new ComboItemResponse(comboId, foodId, foodName, foodPrice, ci.getQuantity());
    }
}
