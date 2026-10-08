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
import com.sccgroup.restaurant_management.domain.entity.menu.SelectionType;
import com.sccgroup.restaurant_management.domain.entity.order.Order;
import com.sccgroup.restaurant_management.domain.entity.order.OrderCombo;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemOption;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository;
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
import com.sccgroup.restaurant_management.domain.service.InvoiceService;
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
 *  - Order gắn vào hóa đơn OPEN của bàn; chưa có thì tự tạo hóa đơn mới và chuyển bàn sang DANG_PHUC_VU.
 *  - Giá được chốt tại thời điểm đặt (unitPrice / comboPrice), không tin giá do client gửi lên.
 *  - KHÔNG trừ kho ở bước này (kho chỉ bị trừ khi bếp bấm "Nấu"); chỉ kiểm tra còn đủ nguyên liệu.
 */
@Service
public class CustomerOrderService {

    private static final int MAX_QUANTITY = 99;

    private final RestaurantTableRepository tableRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;

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


    public CustomerOrderService(RestaurantTableRepository tableRepository,
                                InvoiceRepository invoiceRepository,
                                InvoiceService invoiceService,

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
                                ComboPriceCalculator comboPriceCalculator) {
        this.tableRepository = tableRepository;
        this.invoiceRepository = invoiceRepository;
        this.invoiceService = invoiceService;
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

        // ---- 1. Nạp dữ liệu theo lô ----
        Set<Long> comboIds = new LinkedHashSet<>();
        for (OrderComboLine cl : comboLines) {
            if (cl == null || cl.comboId() == null) throw new BusinessException("Thiếu thông tin combo");
            comboIds.add(cl.comboId());
        }
        Map<Long, Combo> combos = new HashMap<>();
        Map<Long, List<ComboItem>> comboItems = new HashMap<>();
        if (!comboIds.isEmpty()) {
            comboRepository.findAllById(comboIds).forEach(c -> combos.put(c.getId(), c));
            for (ComboItem ci : comboItemRepository.findByComboIds(comboIds)) {
                comboItems.computeIfAbsent(ci.getCombo().getId(), k -> new ArrayList<>()).add(ci);
            }
        }

        Set<Long> foodIds = new LinkedHashSet<>();
        Set<Long> optionIds = new LinkedHashSet<>();
        for (OrderLine l : lines) {
            if (l == null || l.foodId() == null) throw new BusinessException("Thiếu thông tin món");
            foodIds.add(l.foodId());
            addAllNonNull(optionIds, l.optionIds());
        }
        for (OrderComboLine cl : comboLines) {
            comboItems.getOrDefault(cl.comboId(), List.of()).forEach(ci -> foodIds.add(ci.getFood().getId()));
            if (cl.items() != null) {
                for (ComboItemSelection s : cl.items()) {
                    if (s != null) addAllNonNull(optionIds, s.optionIds());
                }
            }
        }

        Map<Long, Food> foods = new HashMap<>();
        if (!foodIds.isEmpty()) foodRepository.findAllById(foodIds).forEach(f -> foods.put(f.getId(), f));
        Map<Long, Option> options = new HashMap<>();
        if (!optionIds.isEmpty()) optionRepository.findByIdIn(optionIds).forEach(o -> options.put(o.getId(), o));
        Map<Long, List<Recipe>> recipes = foodIds.isEmpty() ? Map.of()
                : requirementCalculator.groupByFood(recipeRepository.findByFoodIdIn(foodIds));

        // ---- 2. Kiểm tra hợp lệ + tính giá ----
        List<PlannedItem> plannedItems = new ArrayList<>();
        List<PlannedCombo> plannedCombos = new ArrayList<>();

        for (OrderLine l : lines) {
            int qty = checkQuantity(l.quantity());
            Food food = foods.get(l.foodId());
            if (food == null) throw new ResourceNotFoundException("Không tìm thấy món với ID " + l.foodId());
            List<Option> chosen = resolveOptions(food, l.optionIds(), options);
            BigDecimal unitPrice = orZero(food.getPrice()).add(sumPriceDelta(chosen));
            plannedItems.add(new PlannedItem(food, qty, chosen, unitPrice, null));
        }

        for (OrderComboLine cl : comboLines) {
            int comboQty = checkQuantity(cl.quantity());
            Combo combo = combos.get(cl.comboId());
            if (combo == null) throw new ResourceNotFoundException("Không tìm thấy combo với ID " + cl.comboId());
            List<ComboItem> items = comboItems.getOrDefault(combo.getId(), List.of());
            if (items.isEmpty()) throw new BusinessException("Combo \"" + combo.getName() + "\" chưa có món nào");

            Map<Long, List<Long>> selections = new HashMap<>();
            if (cl.items() != null) {
                for (ComboItemSelection s : cl.items()) {
                    if (s == null || s.foodId() == null) throw new BusinessException("Thiếu thông tin món trong combo");
                    boolean inCombo = items.stream().anyMatch(ci -> ci.getFood().getId().equals(s.foodId()));
                    if (!inCombo) {
                        throw new BusinessException("Món ID " + s.foodId() + " không thuộc combo \"" + combo.getName() + "\"");
                    }
                    if (selections.put(s.foodId(), s.optionIds()) != null) {
                        throw new BusinessException("Món ID " + s.foodId() + " bị lặp trong lựa chọn của combo");
                    }
                }
            }

            PlannedCombo pc = new PlannedCombo(combo, comboQty, comboPriceCalculator.price(combo, items));
            plannedCombos.add(pc);

            items.sort(Comparator.comparing(ci -> ci.getFood().getId()));
            for (ComboItem ci : items) {
                Food food = foods.get(ci.getFood().getId());
                List<Option> chosen = resolveOptions(food, selections.get(food.getId()), options);
                int childQty = (ci.getQuantity() == null ? 1 : ci.getQuantity()) * comboQty;
                // Món trong combo đã nằm trong giá combo; unitPrice chỉ là phụ thu của option (vd. nâng size)
                plannedItems.add(new PlannedItem(food, childQty, chosen, sumPriceDelta(chosen), pc));
            }
        }

        // ---- 3. Kiểm tra còn đủ nguyên liệu (cộng dồn cả đơn, KHÔNG trừ kho) ----
        Map<Long, BigDecimal> used = new HashMap<>();
        for (PlannedItem p : plannedItems) {
            List<IngredientNeed> needs = requirementCalculator.calculate(
                    recipes.getOrDefault(p.food().getId(), List.of()), p.quantity(), p.options());
            if (!requirementCalculator.isSufficient(needs, used)) {
                throw new BusinessException("Món \"" + p.food().getName() + "\" hiện tạm hết, vui lòng chọn món khác");
            }
            requirementCalculator.accumulate(needs, used);
        }

        // ---- 4. Ghi DB ----
        LocalDateTime now = LocalDateTime.now();

        // THAY BẰNG 1 dòng này:
        Invoice invoice = invoiceService.getOrCreateOpenInvoice(table);

        Order order = orderRepository.save(new Order(invoice, now));

        for (PlannedCombo pc : plannedCombos) {
            pc.saved = orderComboRepository.save(new OrderCombo(order, pc.combo, pc.quantity, pc.price));
        }

        List<OrderResponse.ItemDto> itemDtos = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (PlannedItem p : plannedItems) {
            OrderItem item = new OrderItem(order, p.food(), p.quantity(), p.unitPrice()); // status = PENDING
            if (p.combo() != null) item.setOrderCombo(p.combo().saved);
            item = orderItemRepository.save(item);
            for (Option o : p.options()) {
                orderItemOptionRepository.save(new OrderItemOption(item, o));
            }
            total = total.add(p.unitPrice().multiply(BigDecimal.valueOf(p.quantity())));
            itemDtos.add(new OrderResponse.ItemDto(
                    item.getId(), p.food().getId(), p.food().getName(), p.quantity(), p.unitPrice(),
                    item.getStatus(), p.combo() == null ? null : p.combo().saved.getId(),
                    p.options().stream().map(Option::getName).toList()));
        }

        List<OrderResponse.ComboDto> comboDtos = new ArrayList<>();
        for (PlannedCombo pc : plannedCombos) {
            total = total.add(pc.price.multiply(BigDecimal.valueOf(pc.quantity)));
            comboDtos.add(new OrderResponse.ComboDto(
                    pc.saved.getId(), pc.combo.getId(), pc.combo.getName(), pc.quantity, pc.price));
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

    /** Kiểm tra option thuộc đúng món và nhóm chọn-một không bị chọn quá một. */
    private List<Option> resolveOptions(Food food, List<Long> ids, Map<Long, Option> loaded) {
        if (ids == null || ids.isEmpty()) return List.of();
        List<Option> result = new ArrayList<>();
        Set<Long> singleChoiceGroups = new HashSet<>();
        for (Long id : new LinkedHashSet<>(ids)) { // bỏ trùng
            Option o = loaded.get(id);
            if (o == null) throw new ResourceNotFoundException("Không tìm thấy tùy chọn với ID " + id);
            if (!o.getFood().getId().equals(food.getId())) {
                throw new BusinessException("Tùy chọn \"" + o.getName() + "\" không thuộc món \"" + food.getName() + "\"");
            }
            if (o.getOptionGroup().getSelectionType() == SelectionType.SINGLE_CHOICE
                    && !singleChoiceGroups.add(o.getOptionGroup().getId())) {
                throw new BusinessException("Nhóm \"" + o.getOptionGroup().getName() + "\" chỉ được chọn một tùy chọn");
            }
            result.add(o);
        }
        return result;
    }

    private BigDecimal sumPriceDelta(List<Option> chosen) {
        BigDecimal sum = BigDecimal.ZERO;
        for (Option o : chosen) sum = sum.add(orZero(o.getPriceDelta()));
        return sum;
    }

    private BigDecimal orZero(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
