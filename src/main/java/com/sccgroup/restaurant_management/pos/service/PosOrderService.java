package com.sccgroup.restaurant_management.pos.service;

import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.entity.order.Order;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemOption;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemOptionRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderRepository;
import com.sccgroup.restaurant_management.pos.dto.PendingOrderItemResponse;
import com.sccgroup.restaurant_management.pos.dto.PendingOrderResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PosOrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderItemOptionRepository orderItemOptionRepository;

    public PosOrderService(OrderRepository orderRepository,
                           OrderItemRepository orderItemRepository,
                           OrderItemOptionRepository orderItemOptionRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderItemOptionRepository = orderItemOptionRepository;
    }

    @Transactional(readOnly = true)
    public List<PendingOrderResponse> getPendingOrders() {

        // Bước 1: lấy các Order có ít nhất 1 OrderItem đang PENDING
        List<Order> orders = orderRepository.findOrdersContainingItemStatus(OrderItemStatus.PENDING);
        if (orders.isEmpty()) {
            return List.of();
        }
        List<Long> orderIds = orders.stream().map(Order::getId).toList();

        // Bước 2: lấy toàn bộ OrderItem (kèm food) của các order đó
        List<OrderItem> items = orderItemRepository.findByOrderIdInWithFood(orderIds);
        List<Long> itemIds = items.stream().map(OrderItem::getId).toList();

        // Bước 3: lấy toàn bộ OrderItemOption (kèm option) của các item đó
        List<OrderItemOption> options = itemIds.isEmpty()
                ? List.of()
                : orderItemOptionRepository.findByOrderItemIdInWithOption(itemIds);

        // Gom option theo orderItemId -> danh sách tên option
        Map<Long, List<String>> optionNamesByItemId = options.stream()
                .collect(Collectors.groupingBy(
                        oio -> oio.getOrderItem().getId(),
                        Collectors.mapping(oio -> oio.getOption().getName(), Collectors.toList())
                ));

        // Gom item theo orderId, CHỈ giữ item đang PENDING
        // (order có thể có item khác đã CONFIRMED/COOKING từ lần gửi trước,
        //  lễ tân chỉ cần thấy phần đang chờ duyệt)
        Map<Long, List<OrderItem>> pendingItemsByOrderId = items.stream()
                .filter(oi -> oi.getStatus() == OrderItemStatus.PENDING)
                .collect(Collectors.groupingBy(oi -> oi.getOrder().getId()));

        // Ráp lại thành DTO cuối cùng
        return orders.stream()
                .map(order -> toResponse(order, pendingItemsByOrderId, optionNamesByItemId))
                .filter(dto -> !dto.items().isEmpty()) // phòng hờ trường hợp order rỗng sau khi lọc
                .toList();
    }

    private PendingOrderResponse toResponse(Order order,
                                            Map<Long, List<OrderItem>> pendingItemsByOrderId,
                                            Map<Long, List<String>> optionNamesByItemId) {

        List<OrderItem> orderItems = pendingItemsByOrderId.getOrDefault(order.getId(), List.of());

        List<PendingOrderItemResponse> itemDtos = orderItems.stream()
                .map(oi -> new PendingOrderItemResponse(
                        oi.getId(),
                        oi.getFood().getId(),
                        oi.getFood().getName(),
                        oi.getQuantity(),
                        oi.getNote(),
                        oi.getUnitPrice(),
                        optionNamesByItemId.getOrDefault(oi.getId(), List.of())
                ))
                .toList();

        RestaurantTable table = order.getInvoice().getTable();

        return new PendingOrderResponse(
                order.getId(),
                table.getId(),
                table.getTableNumber(),
                table.getFloor(),
                order.getCreatedAt(),
                itemDtos
        );
    }
}