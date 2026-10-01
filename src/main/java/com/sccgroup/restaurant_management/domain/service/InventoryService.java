package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.domain.entity.account.AccountType;
import com.sccgroup.restaurant_management.domain.entity.account.ActivityLog;
import com.sccgroup.restaurant_management.domain.entity.inventory.Ingredient;
import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import com.sccgroup.restaurant_management.domain.entity.menu.*;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemOption;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class InventoryService {
    private final FoodRepository foods;
    private final RecipeRepository recipes;
    private final IngredientRepository ingredients;
    private final OptionRepository options;
    private final OrderItemRepository orderItems;
    private final OrderItemOptionRepository orderItemOptions;
    private final StockTransactionRepository transactions;
    private final ActivityLogRepository activityLogs;

    public InventoryService(FoodRepository foods, RecipeRepository recipes, IngredientRepository ingredients,
                            OptionRepository options, OrderItemRepository orderItems, OrderItemOptionRepository orderItemOptions,
                            StockTransactionRepository transactions, ActivityLogRepository activityLogs) {
        this.foods = foods; this.recipes = recipes; this.ingredients = ingredients; this.options = options;
        this.orderItems = orderItems; this.orderItemOptions = orderItemOptions; this.transactions = transactions; this.activityLogs = activityLogs;
    }

    @Transactional
    public OrderItem startCooking(Long orderItemId, Long accountId, AccountType accountType) {
        OrderItem item = orderItems.findLockedById(orderItemId).orElseThrow(() -> new ResourceNotFoundException("Order item not found: " + orderItemId));
        if (item.getStatus() == OrderItemStatus.COOKING || item.getStartedCookingAt() != null) throw new BusinessException("Order item has already started cooking");
        if (item.getStatus() != OrderItemStatus.CONFIRMED) throw new BusinessException("Only confirmed order items can start cooking");

        List<OrderItemOption> selected = orderItemOptions.findByOrderItemId(orderItemId);
        Map<Long, BigDecimal> requirements = requirements(item.getFood().getId(), item.getQuantity(), selected);
        for (Map.Entry<Long, BigDecimal> entry : requirements.entrySet()) {
            Ingredient ingredient = ingredients.findById(entry.getKey()).orElseThrow(() -> new ResourceNotFoundException("Ingredient not found: " + entry.getKey()));
            if (ingredient.getStockQuantity().compareTo(entry.getValue()) < 0) throw new BusinessException("Insufficient stock for ingredient: " + ingredient.getName());
        }
        for (Map.Entry<Long, BigDecimal> entry : requirements.entrySet()) {
            Ingredient ingredient = ingredients.findById(entry.getKey()).orElseThrow();
            ingredient.setStockQuantity(ingredient.getStockQuantity().subtract(entry.getValue()));
            ingredients.save(ingredient);
            transactions.save(new StockTransaction(ingredient, StockTransactionType.EXPORT, entry.getValue(), "Order item " + orderItemId + " started cooking", LocalDateTime.now()));
        }
        item.setStatus(OrderItemStatus.COOKING);
        item.setStartedCookingAt(LocalDateTime.now());
        OrderItem saved = orderItems.save(item);
        if (accountId != null && accountType != null) activityLogs.save(new ActivityLog(accountId, accountType, "start_cooking", "order_item", orderItemId, "Inventory deducted", LocalDateTime.now()));
        return saved;
    }

    public boolean isAvailable(Long foodId, List<Long> optionIds, int quantity) {
        if (quantity < 1) return false;
        List<OrderItemOption> selected = optionIds == null ? List.of() : optionIds.stream().map(id -> new OrderItemOption(null, options.findById(id).orElseThrow(() -> new ResourceNotFoundException("Option not found: " + id)))).toList();
        return requirements(foodId, quantity, selected).entrySet().stream().allMatch(entry -> ingredients.findById(entry.getKey()).map(i -> i.getStockQuantity().compareTo(entry.getValue()) >= 0).orElse(false));
    }

    public Map<Long, BigDecimal> requirements(Long foodId, int quantity, List<OrderItemOption> selectedOptions) {
        if (!foods.existsById(foodId)) throw new ResourceNotFoundException("Food not found: " + foodId);
        BigDecimal scale = BigDecimal.ONE;
        Map<Long, BigDecimal> result = new HashMap<>();
        for (Recipe recipe : recipes.findByFoodId(foodId)) result.merge(recipe.getIngredient().getId(), recipe.getQuantityRequired().multiply(BigDecimal.valueOf(quantity)), BigDecimal::add);
        for (OrderItemOption selected : selectedOptions) {
            Option option = selected.getOption();
            if (option.getFood().getId().equals(foodId) && option.getScaleFactor() != null) scale = scale.multiply(option.getScaleFactor());
        }
        if (scale.compareTo(BigDecimal.ONE) != 0) {
            BigDecimal bomScale = scale;
            result.replaceAll((id, value) -> value.multiply(bomScale));
        }
        for (OrderItemOption selected : selectedOptions) {
            Option option = selected.getOption();
            if (option.getFood().getId().equals(foodId) && option.getIngredient() != null && option.getAdjustAmount() != null && option.getAdjustType() != null) {
                BigDecimal amount = option.getAdjustAmount().multiply(BigDecimal.valueOf(quantity));
                if (option.getAdjustType() == AdjustType.ADD) result.merge(option.getIngredient().getId(), amount, BigDecimal::add);
                else result.merge(option.getIngredient().getId(), amount.negate(), BigDecimal::add);
            }
        }
        result.entrySet().removeIf(entry -> entry.getValue().signum() <= 0);
        return result;
    }
}
