package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import com.sccgroup.restaurant_management.domain.entity.menu.Option;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemOption;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.inventory.RecipeRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemOptionRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import com.sccgroup.restaurant_management.domain.service.IngredientRequirementCalculator.IngredientNeed;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Lượng nguyên liệu đang được "giữ chỗ" bởi các món khách đã gửi nhưng bếp CHƯA bấm Nấu
 * (PENDING / CONFIRMED). Kho thật chỉ bị trừ khi bếp bấm Nấu, nên số suất còn lại hiển thị cho khách là
 * (tồn kho − giữ chỗ). Giữ chỗ được suy ra từ trạng thái món nên tự được trả lại khi món bị hủy/từ chối
 * (hoặc chuyển sang COOKING, lúc đó kho thật đã bị trừ) mà không module nào phải gọi "cộng lại bộ đếm".
 */
@Service
public class StockReservationService {

    private final OrderItemRepository orderItemRepository;
    private final OrderItemOptionRepository orderItemOptionRepository;
    private final RecipeRepository recipeRepository;
    private final IngredientRequirementCalculator calculator;

    public StockReservationService(OrderItemRepository orderItemRepository,
                                   OrderItemOptionRepository orderItemOptionRepository,
                                   RecipeRepository recipeRepository,
                                   IngredientRequirementCalculator calculator) {
        this.orderItemRepository = orderItemRepository;
        this.orderItemOptionRepository = orderItemOptionRepository;
        this.recipeRepository = recipeRepository;
        this.calculator = calculator;
    }

    /** ingredientId -> lượng đang giữ chỗ. Luôn trả về map mới, có thể sửa. */
    public Map<Long, BigDecimal> reservedByIngredient() {
        Map<Long, BigDecimal> reserved = new HashMap<>();
        List<OrderItem> items = orderItemRepository.findByStatusIn(
                List.of(OrderItemStatus.PENDING, OrderItemStatus.CONFIRMED));
        if (items.isEmpty()) return reserved;

        List<Long> itemIds = items.stream().map(OrderItem::getId).toList();
        List<Long> foodIds = items.stream().map(orderItem -> orderItem.getFood().getId()).distinct().toList();

        Map<Long, List<Option>> optionsByItem = new HashMap<>();
        for (OrderItemOption orderItemOption : orderItemOptionRepository.findByOrderItemIdIn(itemIds)) {
            optionsByItem.computeIfAbsent(orderItemOption.getOrderItem().getId(), key -> new ArrayList<>()).add(orderItemOption.getOption());
        }
        Map<Long, List<Recipe>> recipesByFood = calculator.groupByFood(recipeRepository.findByFoodIdIn(foodIds));

        for (OrderItem item : items) {
            List<IngredientNeed> needs = calculator.calculate(
                    recipesByFood.getOrDefault(item.getFood().getId(), List.of()),
                    item.getQuantity(),
                    optionsByItem.getOrDefault(item.getId(), List.of()));
            calculator.accumulate(needs, reserved);
        }
        return reserved;
    }
}
