package com.sccgroup.restaurant_management.kds.service;

import com.sccgroup.restaurant_management.domain.service.TableEventPublisher;
import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.common.security.AppUserPrincipal;
import com.sccgroup.restaurant_management.domain.entity.account.AccountType;
import com.sccgroup.restaurant_management.domain.entity.account.ActivityLog;
import com.sccgroup.restaurant_management.domain.entity.menu.StockTransaction;
import com.sccgroup.restaurant_management.domain.entity.menu.StockTransactionType;
import com.sccgroup.restaurant_management.domain.entity.order.Order;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.account.ActivityLogRepository;
import com.sccgroup.restaurant_management.domain.repository.inventory.KdsStockRepository;
import com.sccgroup.restaurant_management.domain.repository.inventory.StockTransactionRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import com.sccgroup.restaurant_management.domain.service.IngredientRequirementCalculator;
import com.sccgroup.restaurant_management.kds.dto.KdsOrderDto;
import com.sccgroup.restaurant_management.kds.dto.KdsOrderItemDto;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class KdsService {

    /** Món nào thì hiện trên màn hình bếp. */
    private static final List<OrderItemStatus> BOARD_STATUSES =
            List.of(OrderItemStatus.CONFIRMED, OrderItemStatus.COOKING, OrderItemStatus.DONE);

    private final OrderItemRepository orderItemRepository;
    private final KdsStockRepository stockRepository;
    private final IngredientRequirementCalculator calculator;
    private final KdsEventPublisher eventPublisher;
    private final StockTransactionRepository stockTransactionRepository;
    private final ActivityLogRepository activityLogRepository;
    private final TableEventPublisher tableEventPublisher;

    public KdsService(OrderItemRepository orderItemRepository,
                      KdsStockRepository stockRepository,
                      IngredientRequirementCalculator calculator,
                      KdsEventPublisher eventPublisher,
                      StockTransactionRepository stockTransactionRepository,
                      ActivityLogRepository activityLogRepository,
                      TableEventPublisher tableEventPublisher) {
        this.tableEventPublisher = tableEventPublisher;
        this.orderItemRepository = orderItemRepository;
        this.stockRepository = stockRepository;
        this.calculator = calculator;
        this.eventPublisher = eventPublisher;
        this.stockTransactionRepository = stockTransactionRepository;
        this.activityLogRepository = activityLogRepository;
    }

    // ------------------------------------------------------------------ Lấy danh sách

    /** Toàn bộ order còn món chờ nấu / đang nấu / đã xong, order cũ nhất trước. Khu bếp nào cũng thấy hết. */
    @Transactional(readOnly = true)
    public List<KdsOrderDto> getBoard() {
        List<OrderItem> items = orderItemRepository.findForKds(BOARD_STATUSES);
        if (items.isEmpty()) return List.of();

        Map<Long, List<String>> optionsByItem = new HashMap<>();
        List<Long> ids = items.stream().map(OrderItem::getId).toList();
        for (Object[] row : orderItemRepository.findOptionNamesByItemIds(ids)) {
            optionsByItem.computeIfAbsent((Long) row[0], k -> new ArrayList<>()).add((String) row[1]);
        }

        // Giữ nguyên thứ tự truy vấn (cũ nhất trước) nhờ LinkedHashMap
        Map<Long, List<OrderItem>> byOrder = new LinkedHashMap<>();
        for (OrderItem item : items) {
            byOrder.computeIfAbsent(item.getOrder().getId(), k -> new ArrayList<>()).add(item);
        }

        List<KdsOrderDto> result = new ArrayList<>();
        for (List<OrderItem> group : byOrder.values()) {
            Order order = group.get(0).getOrder();
            var table = order.getInvoice().getTable();
            List<KdsOrderItemDto> dtos = group.stream()
                    .map(i -> toDto(i, optionsByItem.getOrDefault(i.getId(), List.of())))
                    .toList();
            result.add(new KdsOrderDto(order.getId(), table.getFloor(), table.getTableNumber(),
                    order.getCreatedAt(), dtos));
        }
        return result;
    }

    private KdsOrderItemDto toDto(OrderItem item, List<String> options) {
        var food = item.getFood();
        var station = food.getCategory().getKitchenStation();
        return new KdsOrderItemDto(
                item.getId(),
                food.getName(),
                item.getQuantity(),
                item.getStatus(),
                station.getId(),
                station.getName(),
                food.getEstimatedCookingTime(),
                item.getStartedCookingAt(),
                item.getDoneAt(),
                options,
                null,
                item.getOrderCombo() == null ? null : item.getOrderCombo().getCombo().getName());
    }

    // ------------------------------------------------------------------ Bấm "Nấu"

    /**
     * CONFIRMED -> COOKING. Trong cùng một giao dịch: trừ kho theo BOM + option, ghi StockTransaction,
     * ghi activity_log. Thiếu nguyên liệu thì ném BusinessException và mọi thay đổi bị hoàn lại.
     */
    @Transactional
    public void startCooking(Long itemId, AppUserPrincipal principal) {
        OrderItem item = lockOwnedItem(itemId, principal);
        if (item.getStatus() != OrderItemStatus.CONFIRMED) {
            throw new BusinessException("Món này không ở trạng thái chờ nấu");
        }
        startItem(item, principal, LocalDateTime.now(), "START_COOKING");
        eventPublisher.publishChanged();
        tableEventPublisher.publishTableChanged(item.getOrder().getInvoice().getTable().getId());
    }

    /** Chuyển một món sang đang nấu: trừ kho, đặt giờ bắt đầu, ghi log. Dùng chung cho bấm tay và tự động. */
    private void startItem(OrderItem item, AppUserPrincipal principal, LocalDateTime now, String action) {
        deductStock(item, now);
        item.setStatus(OrderItemStatus.COOKING);
        item.setStartedCookingAt(now);
        log(principal, action, item, now);
    }

    /**
     * Trừ kho cho một món. Thứ tự: khóa nguyên liệu (theo id) -> kiểm tra tồn kho thật -> mới trừ.
     * Nếu thiếu thì ném BusinessException TRƯỚC khi thay đổi bất cứ thứ gì, nên nhánh tự động
     * (bỏ qua món thiếu nguyên liệu) có thể bắt ngoại lệ mà không để lại trừ kho dở dang.
     */
    private void deductStock(OrderItem item, LocalDateTime now) {
        var recipes = stockRepository.findRecipesByFoodId(item.getFood().getId());
        var options = orderItemRepository.findOptionsByItemId(item.getId());
        var needs = new ArrayList<>(calculator.calculate(recipes, item.getQuantity(), options));
        if (needs.isEmpty()) return;
        // Luôn khóa/trừ theo thứ tự id nguyên liệu: hai món nấu cùng lúc sẽ không khóa chéo nhau (deadlock)
        needs.sort(Comparator.comparing(n -> n.ingredient().getId()));

        stockRepository.lockByIds(needs.stream().map(n -> n.ingredient().getId()).toList());
        for (var need : needs) {
            BigDecimal stock = stockRepository.findStockQuantity(need.ingredient().getId());
            if (stock == null || stock.compareTo(need.amount()) < 0) {
                throw new BusinessException("Không đủ nguyên liệu để nấu: " + need.ingredient().getName());
            }
        }

        for (var need : needs) {
            int updated = stockRepository.deduct(need.ingredient().getId(), need.amount());
            if (updated == 0) { // đã khóa và kiểm tra ở trên nên không thể xảy ra, giữ lại làm chốt an toàn
                throw new BusinessException("Không đủ nguyên liệu để nấu: " + need.ingredient().getName());
            }
            stockTransactionRepository.save(new StockTransaction(need.ingredient(), StockTransactionType.EXPORT,
                    need.amount(), "Nấu món #" + item.getId(), now));
        }
    }

    // ------------------------------------------------------------------ Bấm "Xong"

    /**
     * COOKING -> DONE. Nếu đây là món cuối cùng chưa xong của khu bếp này trong order thì tự động chuyển
     * mọi món của khu bếp trong order cũ nhất kế tiếp (đang chờ nấu) sang đang nấu.
     * Mọi thứ nằm trong một giao dịch và chỉ đẩy tín hiệu sau khi commit, nên tất cả màn hình thấy cùng một trạng thái.
     */
    @Transactional
    public void finishCooking(Long itemId, AppUserPrincipal principal) {
        Long stationId = requireStation(principal);
        Long orderId = orderItemRepository.findOrderIdByItemId(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món #" + itemId));

        // Khóa mọi món của khu mình trong order này: hai người cùng khu bấm Xong cùng lúc sẽ xếp hàng,
        // người sau thấy đúng trạng thái người trước vừa ghi.
        List<OrderItem> mine = orderItemRepository.findByOrderIdAndStationIdForUpdate(orderId, stationId);
        OrderItem item = mine.stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Món này không thuộc khu bếp của bạn"));
        if (item.getStatus() != OrderItemStatus.COOKING) {
            throw new BusinessException("Món này không ở trạng thái đang nấu");
        }

        LocalDateTime now = LocalDateTime.now();
        item.setStatus(OrderItemStatus.DONE);
        item.setDoneAt(now);
        log(principal, "FINISH_COOKING", item, now);

        boolean lastOne = mine.stream().noneMatch(i ->
                i.getStatus() == OrderItemStatus.CONFIRMED || i.getStatus() == OrderItemStatus.COOKING);
        if (lastOne) {
            autoStartNextOrder(stationId, principal, now);
        }
        eventPublisher.publishChanged();
        tableEventPublisher.publishTableChanged(item.getOrder().getInvoice().getTable().getId());
    }

    /**
     * Tìm order cũ nhất còn món chờ nấu của khu bếp (order không có món nào của khu bếp tự bị bỏ qua)
     * và chuyển các món chờ nấu của khu bếp trong order đó sang đang nấu.
     * Món nào thiếu nguyên liệu thì bỏ qua, giữ nguyên chờ nấu để bếp tự bấm và thấy thông báo lỗi.
     */
    private void autoStartNextOrder(Long stationId, AppUserPrincipal principal, LocalDateTime now) {
        List<Long> next = orderItemRepository.findOrderIdsWithStatusForStation(
                OrderItemStatus.CONFIRMED, stationId, PageRequest.of(0, 1));
        if (next.isEmpty()) return;

        for (OrderItem candidate : orderItemRepository.findByOrderIdAndStationIdForUpdate(next.get(0), stationId)) {
            if (candidate.getStatus() != OrderItemStatus.CONFIRMED) continue;
            try {
                startItem(candidate, principal, now, "AUTO_START_COOKING");
            } catch (BusinessException e) {
                // thiếu nguyên liệu: chưa thay đổi gì nên cứ để món này ở trạng thái chờ nấu
            }
        }
    }

    // ------------------------------------------------------------------ Dùng chung

    private Long requireStation(AppUserPrincipal principal) {
        if (principal.getStationId() == null) {
            throw new BusinessException("Tài khoản này không thuộc khu bếp nào");
        }
        return principal.getStationId();
    }

    /** Khóa dòng món rồi kiểm tra món có thuộc khu bếp của tài khoản đang đăng nhập không. */
    private OrderItem lockOwnedItem(Long itemId, AppUserPrincipal principal) {
        Long stationId = requireStation(principal);
        OrderItem item = orderItemRepository.findAllByIdForUpdate(List.of(itemId)).stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món #" + itemId));

        Long itemStationId = item.getFood().getCategory().getKitchenStation().getId();
        if (!itemStationId.equals(stationId)) {
            throw new BusinessException("Món này không thuộc khu bếp của bạn");
        }
        return item;
    }

    private void log(AppUserPrincipal principal, String action, OrderItem item, LocalDateTime now) {
        String detail = item.getFood().getName() + " x" + item.getQuantity();
        activityLogRepository.save(new ActivityLog(principal.getAccountId(), AccountType.KITCHEN, action,
                "order_item", item.getId(), detail, now));
    }
}
