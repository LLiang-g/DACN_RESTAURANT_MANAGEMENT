package com.sccgroup.restaurant_management.admin.dto;

import com.sccgroup.restaurant_management.domain.entity.account.StaffRole;
import com.sccgroup.restaurant_management.domain.entity.floor.TableStatus;
import com.sccgroup.restaurant_management.domain.entity.menu.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class AdminDtos {
    private AdminDtos() {}

    public record StationRequest(String name) {}
    public record CategoryRequest(String name, Long stationId) {}
    public record FoodRequest(Long categoryId, String name, BigDecimal price, String image, String description, Integer estimatedCookingTime) {}
    public record IngredientRequest(String name, String unit, BigDecimal stockQuantity, BigDecimal minThreshold) {}
    public record RecipeRequest(Long foodId, Long ingredientId, BigDecimal quantityRequired) {}
    public record StockRequest(Long ingredientId, StockTransactionType type, BigDecimal quantity, String note) {}
    public record OptionGroupRequest(String name, SelectionType selectionType) {}
    public record OptionRequest(Long foodId, String name, Long groupId, Long ingredientId, BigDecimal adjustAmount, AdjustType adjustType, BigDecimal priceDelta, BigDecimal scaleFactor) {}
    public record ComboRequest(String name, DiscountType discountType, BigDecimal discountValue) {}
    public record ComboItemRequest(Long foodId, Integer quantity) {}
    public record TableRequest(String floor, String tableNumber, TableStatus status) {}
    public record StaffAccountRequest(String username, String password, StaffRole role) {}
    public record KitchenAccountRequest(String username, String password, Long stationId) {}

    public record IdResponse(Long id) {}
    public record StockTransactionResponse(Long id, Long ingredientId, StockTransactionType type, BigDecimal quantity, String note, LocalDateTime createdAt) {}
    public record AccountResponse(Long id, String username, StaffRole role, Long stationId) {}
}
