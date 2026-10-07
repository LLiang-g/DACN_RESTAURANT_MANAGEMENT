package com.sccgroup.restaurant_management.customer.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.customer.dto.OrderResponse;
import com.sccgroup.restaurant_management.customer.dto.PlaceOrderRequest;
import com.sccgroup.restaurant_management.customer.dto.PlaceOrderRequest.ComboItemSelection;
import com.sccgroup.restaurant_management.customer.dto.PlaceOrderRequest.OrderComboLine;
import com.sccgroup.restaurant_management.customer.dto.PlaceOrderRequest.OrderLine;
import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.entity.floor.TableStatus;
import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import com.sccgroup.restaurant_management.domain.entity.menu.Combo;
import com.sccgroup.restaurant_management.domain.entity.menu.ComboItem;
import com.sccgroup.restaurant_management.domain.entity.menu.Food;
import com.sccgroup.restaurant_management.domain.entity.menu.Option;
import com.sccgroup.restaurant_management.domain.entity.menu.OptionGroup;
import com.sccgroup.restaurant_management.domain.entity.menu.SelectionType;
import com.sccgroup.restaurant_management.domain.entity.order.Order;
import com.sccgroup.restaurant_management.domain.entity.order.OrderCombo;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemOption;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository;
import com.sccgroup.restaurant_management.domain.repository.inventory.IngredientRepository;
import com.sccgroup.restaurant_management.domain.repository.inventory.RecipeRepository;
import com.sccgroup.restaurant_management.domain.repository.menu.ComboItemRepository;
import com.sccgroup.restaurant_management.domain.repository.menu.ComboRepository;
import com.sccgroup.restaurant_management.domain.repository.menu.FoodRepository;
import com.sccgroup.restaurant_management.domain.repository.menu.OptionRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderComboRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemOptionRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderRepository;
import com.sccgroup.restaurant_management.domain.service.ComboPriceCalculator;
import com.sccgroup.restaurant_management.domain.service.IngredientRequirementCalculator;
import com.sccgroup.restaurant_management.domain.service.IngredientRequirementCalculator.IngredientNeed;
import com.sccgroup.restaurant_management.domain.service.StockReservationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Nghiệp vụ "gửi đơn" của khách: tạo một Order mới, mọi OrderItem ở trạng thái PENDING.
 *
 * Quy tắc áp dụng:
 *  - Mỗi lần gửi = một Order mới (không gộp vào Order cũ).
 *  - Order gắn vào hóa đơn OPEN của bàn; chưa có thì tự tạo hóa đơn mới và chuyển bàn sang SERVING.
 *  - Giá được chốt tại thời điểm đặt (unitPrice / comboPrice), không tin giá do client gửi lên.
 *  - KHÔNG trừ kho ở bước này (kho chỉ bị trừ khi bếp bấm "Nấu"); chỉ kiểm tra còn đủ nguyên liệu
 *    sau khi đã tính phần giữ chỗ của các đơn chưa tới bếp.
 *  - Nhóm tùy chọn SINGLE_CHOICE là bắt buộc chọn đúng một.
 */
@Service
public class CustomerOrderService {

    private static final int MAX_QUANTITY = 99;

    private final RestaurantTableRepository tableRepository;
    private final InvoiceRepository invoiceRepository;
    private final FoodRepository foodRepository;
    private final OptionRepository optionRepository;
    private final ComboRepository comboRepository;
    private final ComboItemRepository comboItemRepository;
    private final RecipeRepository recipeRepository;
    private final OrderRepository orderRepository;
    private final OrderComboRepository orderComboRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderItemOptionRepository orderItemOptionRepository;
    private final IngredientRequirementCalculator requirementCalculator;
    private final ComboPriceCalculator comboPriceCalculator;
    private final IngredientRepository ingredientRepository;
    private final StockReservationService reservationService;

    public CustomerOrderService(RestaurantTableRepository tableRepository,
                                InvoiceRepository invoiceRepository,
                                FoodRepository foodRepository,
                                OptionRepository optionRepository,
                                ComboRepository comboRepository,
                                ComboItemRepository comboItemRepository,
                                RecipeRepository recipeRepository,
                                OrderRepository orderRepository,
                                OrderComboRepository orderComboRepository,
                                OrderItemRepository orderItemRepository,
                                OrderItemOptionRepository orderItemOptionRepository,
                                IngredientRequirementCalculator requirementCalculator,
                                ComboPriceCalculator comboPriceCalculator,
                                IngredientRepository ingredientRepository,
                                StockReservationService reservationService) {
        this.tableRepository = tableRepository;
        this.invoiceRepository = invoiceRepository;
        this.foodRepository = foodRepository;
        this.optionRepository = optionRepository;
        this.comboRepository = comboRepository;
        this.comboItemRepository = comboItemRepository;
        this.recipeRepository = recipeRepository;
        this.orderRepository = orderRepository;
        this.orderComboRepository = orderComboRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderItemOptionRepository = orderItemOptionRepository;
        this.requirementCalculator = requirementCalculator;
        this.comboPriceCalculator = comboPriceCalculator;
        this.ingredientRepository = ingredientRepository;
        this.reservationService = reservationService;
    }

    /** Một dòng món đã được kiểm tra hợp lệ và tính giá, chờ ghi xuống DB. */
    private record PlannedItem(Food food, int quantity, List<Option> options,
                               BigDecimal unitPrice, PlannedCombo combo) {}

    /** Một combo đã kiểm tra hợp lệ; saved được gán sau khi lưu DB. */
    private static final class PlannedCombo {
        final Combo combo;
        final int quantity;
        final BigDecimal price;
        OrderCombo saved;

        PlannedCombo(Combo combo, int quantity, BigDecimal price) {
            this.combo = combo;
            this.quantity = quantity;
            this.price = price;
        }
    }

    @Transactional
    public OrderResponse placeOrder(PlaceOrderRequest request) {
        if (request == null || request.tableId() == null) {
            throw new BusinessException("Thiếu thông tin bàn");
        }
        List<OrderLine> lines = request.items() == null ? List.of() : request.items();
        List<OrderComboLine> comboLines = request.combos() == null ? List.of() : request.combos();
        if (lines.isEmpty() && comboLines.isEmpty()) {
            throw new BusinessException("Đơn hàng chưa có món nào");
        }

        // Khóa dòng bàn để các đơn đồng thời của cùng một bàn được xử lý tuần tự
        RestaurantTable table = tableRepository.findByIdForUpdate(request.tableId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với ID " + request.tableId()));
        // Khóa kho làm cổng giữ chỗ: hai bàn khác nhau không thể cùng giành món cuối cùng.
        // Phải đặt TRƯỚC mọi lần đọc không khóa để các truy vấn sau thấy dữ liệu mới nhất.
        ingredientRepository.findAllForUpdate();

        // ---- 1. Nạp dữ liệu theo lô ----
        Set<Long> comboIds = new LinkedHashSet<>();
        for (OrderComboLine comboLine : comboLines) {
            if (comboLine == null || comboLine.comboId() == null) throw new BusinessException("Thiếu thông tin combo");
            comboIds.add(comboLine.comboId());
        }
        Map<Long, Combo> combos = new HashMap<>();
        Map<Long, List<ComboItem>> comboItems = new HashMap<>();
        if (!comboIds.isEmpty()) {
            comboRepository.findAllById(comboIds).forEach(combo -> combos.put(combo.getId(), combo));
            for (ComboItem comboItem : comboItemRepository.findByComboIds(comboIds)) {
                comboItems.computeIfAbsent(comboItem.getCombo().getId(), key -> new ArrayList<>()).add(comboItem);
            }
        }

        Set<Long> foodIds = new LinkedHashSet<>();
        Set<Long> optionIds = new LinkedHashSet<>();
        for (OrderLine orderLine : lines) {
            if (orderLine == null || orderLine.foodId() == null) throw new BusinessException("Thiếu thông tin món");
            foodIds.add(orderLine.foodId());
            addAllNonNull(optionIds, orderLine.optionIds());
        }
        for (OrderComboLine comboLine : comboLines) {
            comboItems.getOrDefault(comboLine.comboId(), List.of()).forEach(comboItem -> foodIds.add(comboItem.getFood().getId()));
            if (comboLine.items() != null) {
                for (ComboItemSelection selection : comboLine.items()) {
                    if (selection != null) addAllNonNull(optionIds, selection.optionIds());
                }
            }
        }

        Map<Long, Food> foods = new HashMap<>();
        if (!foodIds.isEmpty()) foodRepository.findAllById(foodIds).forEach(food -> foods.put(food.getId(), food));
        Map<Long, Option> options = new HashMap<>();
        if (!optionIds.isEmpty()) optionRepository.findByIdIn(optionIds).forEach(option -> options.put(option.getId(), option));
        // Toàn bộ option của các món trong đơn: để biết nhóm chọn-một nào bắt buộc phải chọn
        Map<Long, List<Option>> optionsByFood = new HashMap<>();
        if (!foodIds.isEmpty()) {
            for (Option option : optionRepository.findByFoodIdIn(foodIds)) {
                optionsByFood.computeIfAbsent(option.getFood().getId(), key -> new ArrayList<>()).add(option);
            }
        }
        Map<Long, List<Recipe>> recipes = foodIds.isEmpty() ? Map.of()
                : requirementCalculator.groupByFood(recipeRepository.findByFoodIdIn(foodIds));

        // ---- 2. Kiểm tra hợp lệ + tính giá ----
        List<PlannedItem> plannedItems = new ArrayList<>();
        List<PlannedCombo> plannedCombos = new ArrayList<>();

        for (OrderLine orderLine : lines) {
            int quantity = checkQuantity(orderLine.quantity());
            Food food = foods.get(orderLine.foodId());
            if (food == null) throw new ResourceNotFoundException("Không tìm thấy món với ID " + orderLine.foodId());
            List<Option> chosen = resolveOptions(food, orderLine.optionIds(), options, optionsByFood);
            BigDecimal unitPrice = orZero(food.getPrice()).add(sumPriceDelta(chosen));
            plannedItems.add(new PlannedItem(food, quantity, chosen, unitPrice, null));
        }

        for (OrderComboLine comboLine : comboLines) {
            int comboQuantity = checkQuantity(comboLine.quantity());
            Combo combo = combos.get(comboLine.comboId());
            if (combo == null) throw new ResourceNotFoundException("Không tìm thấy combo với ID " + comboLine.comboId());
            List<ComboItem> items = comboItems.getOrDefault(combo.getId(), List.of());
            if (items.isEmpty()) throw new BusinessException("Combo \"" + combo.getName() + "\" chưa có món nào");

            Map<Long, List<Long>> selections = new HashMap<>();
            if (comboLine.items() != null) {
                for (ComboItemSelection selection : comboLine.items()) {
                    if (selection == null || selection.foodId() == null) throw new BusinessException("Thiếu thông tin món trong combo");
                    boolean inCombo = items.stream().anyMatch(comboItem -> comboItem.getFood().getId().equals(selection.foodId()));
                    if (!inCombo) {
                        throw new BusinessException("Món ID " + selection.foodId() + " không thuộc combo \"" + combo.getName() + "\"");
                    }
                    if (selections.put(selection.foodId(), selection.optionIds()) != null) {
                        throw new BusinessException("Món ID " + selection.foodId() + " bị lặp trong lựa chọn của combo");
                    }
                }
            }

            PlannedCombo plannedCombo = new PlannedCombo(combo, comboQuantity, comboPriceCalculator.price(combo, items));
            plannedCombos.add(plannedCombo);

            items.sort(Comparator.comparing(comboItem -> comboItem.getFood().getId()));
            for (ComboItem comboItem : items) {
                Food food = foods.get(comboItem.getFood().getId());
                List<Option> chosen = resolveOptions(food, selections.get(food.getId()), options, optionsByFood);
                int childQuantity = (comboItem.getQuantity() == null ? 1 : comboItem.getQuantity()) * comboQuantity;
                // Món trong combo đã nằm trong giá combo; unitPrice chỉ là phụ thu của option (vd. nâng size)
                plannedItems.add(new PlannedItem(food, childQuantity, chosen, sumPriceDelta(chosen), plannedCombo));
            }
        }

        // ---- 3. Kiểm tra còn đủ nguyên liệu (cộng dồn cả đơn, KHÔNG trừ kho) ----
        // Bắt đầu từ phần đã giữ chỗ bởi các đơn trước chưa tới bếp (kho thật chỉ trừ khi bếp Nấu)
        Map<Long, BigDecimal> used = reservationService.reservedByIngredient();
        for (PlannedItem plannedItem : plannedItems) {
            List<IngredientNeed> needs = requirementCalculator.calculate(
                    recipes.getOrDefault(plannedItem.food().getId(), List.of()), plannedItem.quantity(), plannedItem.options());
            if (!requirementCalculator.isSufficient(needs, used)) {
                throw new BusinessException("Món \"" + plannedItem.food().getName() + "\" hiện tạm hết, vui lòng chọn món khác");
            }
            requirementCalculator.accumulate(needs, used);
        }

        // ---- 4. Ghi DB ----
        LocalDateTime now = LocalDateTime.now();

        Invoice invoice = invoiceRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(table.getId(), InvoiceStatus.OPEN)
                .orElseGet(() -> invoiceRepository.save(new Invoice(table, InvoiceStatus.OPEN, now)));
        table.setStatus(TableStatus.SERVING);

        Order order = orderRepository.save(new Order(invoice, now));

        for (PlannedCombo plannedCombo : plannedCombos) {
            plannedCombo.saved = orderComboRepository.save(new OrderCombo(order, plannedCombo.combo, plannedCombo.quantity, plannedCombo.price));
        }

        List<OrderResponse.ItemDto> itemDtos = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (PlannedItem plannedItem : plannedItems) {
            OrderItem item = new OrderItem(order, plannedItem.food(), plannedItem.quantity(), plannedItem.unitPrice()); // status = PENDING
            if (plannedItem.combo() != null) item.setOrderCombo(plannedItem.combo().saved);
            item = orderItemRepository.save(item);
            for (Option option : plannedItem.options()) {
                orderItemOptionRepository.save(new OrderItemOption(item, option));
            }
            total = total.add(plannedItem.unitPrice().multiply(BigDecimal.valueOf(plannedItem.quantity())));
            itemDtos.add(new OrderResponse.ItemDto(
                    item.getId(), plannedItem.food().getId(), plannedItem.food().getName(), plannedItem.quantity(), plannedItem.unitPrice(),
                    item.getStatus(), plannedItem.combo() == null ? null : plannedItem.combo().saved.getId(),
                    plannedItem.options().stream().map(Option::getName).toList()));
        }

        List<OrderResponse.ComboDto> comboDtos = new ArrayList<>();
        for (PlannedCombo plannedCombo : plannedCombos) {
            total = total.add(plannedCombo.price.multiply(BigDecimal.valueOf(plannedCombo.quantity)));
            comboDtos.add(new OrderResponse.ComboDto(
                    plannedCombo.saved.getId(), plannedCombo.combo.getId(), plannedCombo.combo.getName(), plannedCombo.quantity, plannedCombo.price));
        }

        return new OrderResponse(order.getId(), invoice.getId(), table.getId(), order.getCreatedAt(),
                total, itemDtos, comboDtos);
    }

    // ------------------------------------------------------------------ helper

    private int checkQuantity(Integer quantity) {
        if (quantity == null || quantity < 1 || quantity > MAX_QUANTITY) {
            throw new BusinessException("Số lượng phải từ 1 đến " + MAX_QUANTITY);
        }
        return quantity;
    }

    private void addAllNonNull(Set<Long> target, List<Long> source) {
        if (source == null) return;
        for (Long id : source) {
            if (id == null) throw new BusinessException("Mã tùy chọn không hợp lệ");
            target.add(id);
        }
    }

    /**
     * Kiểm tra option thuộc đúng món; nhóm SINGLE_CHOICE bắt buộc chọn đúng MỘT, nhóm MULTI_CHOICE chọn tự do.
     */
    private List<Option> resolveOptions(Food food, List<Long> ids, Map<Long, Option> loaded,
                                        Map<Long, List<Option>> optionsByFood) {
        List<Option> result = new ArrayList<>();
        Set<Long> chosenSingleGroups = new HashSet<>();
        if (ids != null) {
            for (Long id : new LinkedHashSet<>(ids)) { // bỏ trùng
                Option option = loaded.get(id);
                if (option == null) throw new ResourceNotFoundException("Không tìm thấy tùy chọn với ID " + id);
                if (!option.getFood().getId().equals(food.getId())) {
                    throw new BusinessException("Tùy chọn \"" + option.getName() + "\" không thuộc món \"" + food.getName() + "\"");
                }
                if (option.getOptionGroup().getSelectionType() == SelectionType.SINGLE_CHOICE
                        && !chosenSingleGroups.add(option.getOptionGroup().getId())) {
                    throw new BusinessException("Nhóm \"" + option.getOptionGroup().getName() + "\" chỉ được chọn một tùy chọn");
                }
                result.add(option);
            }
        }
        Map<Long, OptionGroup> requiredGroups = new LinkedHashMap<>();
        for (Option option : optionsByFood.getOrDefault(food.getId(), List.of())) {
            if (option.getOptionGroup().getSelectionType() == SelectionType.SINGLE_CHOICE) {
                requiredGroups.putIfAbsent(option.getOptionGroup().getId(), option.getOptionGroup());
            }
        }
        for (OptionGroup optionGroup : requiredGroups.values()) {
            if (!chosenSingleGroups.contains(optionGroup.getId())) {
                throw new BusinessException("Vui lòng chọn \"" + optionGroup.getName() + "\" cho món \"" + food.getName() + "\"");
            }
        }
        return result;
    }

    private BigDecimal sumPriceDelta(List<Option> chosen) {
        BigDecimal sum = BigDecimal.ZERO;
        for (Option option : chosen) sum = sum.add(orZero(option.getPriceDelta()));
        return sum;
    }

    private BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
