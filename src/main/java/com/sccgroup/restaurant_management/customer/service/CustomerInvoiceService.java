package com.sccgroup.restaurant_management.customer.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.customer.dto.InvoiceViewResponse;
import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.CallStaffStatus;
import com.sccgroup.restaurant_management.domain.entity.order.OrderCombo;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemOption;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import com.sccgroup.restaurant_management.domain.repository.floor.CallStaffRequestRepository;
import com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderComboRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemOptionRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Xem lại hóa đơn đang mở của bàn và khách tự hủy món khi bếp chưa bấm "Nấu". */
@Service
public class CustomerInvoiceService {

    /** Ghi vào OrderItem.note khi khách tự hủy (schema không có trạng thái riêng, hủy = REJECTED + ghi chú này). */
    public static final String CUSTOMER_CANCEL_NOTE = "Khách tự hủy";

    /** Món không tính tiền: bị từ chối/hủy hoặc đã trả lại. */
    private static final Set<OrderItemStatus> INACTIVE = EnumSet.of(OrderItemStatus.REJECTED, OrderItemStatus.RETURNED);
    /** Chỉ hủy được khi bếp chưa bấm Nấu. */
    private static final Set<OrderItemStatus> CANCELLABLE = EnumSet.of(OrderItemStatus.PENDING, OrderItemStatus.CONFIRMED);

    private final RestaurantTableRepository tableRepository;
    private final InvoiceRepository invoiceRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderItemOptionRepository orderItemOptionRepository;
    private final OrderComboRepository orderComboRepository;
    private final CallStaffRequestRepository callStaffRequestRepository;

    public CustomerInvoiceService(RestaurantTableRepository tableRepository,
                                  InvoiceRepository invoiceRepository,
                                  OrderItemRepository orderItemRepository,
                                  OrderItemOptionRepository orderItemOptionRepository,
                                  OrderComboRepository orderComboRepository,
                                  CallStaffRequestRepository callStaffRequestRepository) {
        this.tableRepository = tableRepository;
        this.invoiceRepository = invoiceRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderItemOptionRepository = orderItemOptionRepository;
        this.orderComboRepository = orderComboRepository;
        this.callStaffRequestRepository = callStaffRequestRepository;
    }

    @Transactional(readOnly = true)
    public InvoiceViewResponse getInvoice(Long tableId) {
        if (!tableRepository.existsById(tableId)) {
            throw new ResourceNotFoundException("Không tìm thấy bàn với ID " + tableId);
        }
        boolean callPending = callStaffRequestRepository
                .findFirstByTableIdAndStatusOrderByCreatedAtDesc(tableId, CallStaffStatus.PENDING).isPresent();

        Optional<Invoice> found = invoiceRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(tableId, InvoiceStatus.OPEN);
        if (found.isEmpty()) {
            return new InvoiceViewResponse(null, null, BigDecimal.ZERO, callPending, List.of());
        }
        Invoice invoice = found.get();

        List<OrderItem> items = orderItemRepository.findByInvoiceId(invoice.getId());
        List<OrderCombo> combos = orderComboRepository.findByInvoiceId(invoice.getId());

        Map<Long, List<String>> optionNames = new HashMap<>();
        if (!items.isEmpty()) {
            List<Long> itemIds = items.stream().map(OrderItem::getId).toList();
            for (OrderItemOption orderItemOption : orderItemOptionRepository.findByOrderItemIdIn(itemIds)) {
                optionNames.computeIfAbsent(orderItemOption.getOrderItem().getId(), key -> new ArrayList<>())
                        .add(orderItemOption.getOption().getName());
            }
        }

        // Combo còn hiệu lực nếu còn ít nhất một món con chưa bị hủy/từ chối
        Set<Long> activeComboIds = new HashSet<>();
        for (OrderItem orderItem : items) {
            if (orderItem.getOrderCombo() != null && !INACTIVE.contains(orderItem.getStatus())) {
                activeComboIds.add(orderItem.getOrderCombo().getId());
            }
        }

        Map<Long, List<InvoiceViewResponse.ItemDto>> itemsByOrder = new LinkedHashMap<>();
        Map<Long, java.time.LocalDateTime> orderTimes = new HashMap<>();
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem orderItem : items) {
            Long orderId = orderItem.getOrder().getId();
            orderTimes.put(orderId, orderItem.getOrder().getCreatedAt());
            itemsByOrder.computeIfAbsent(orderId, key -> new ArrayList<>()).add(new InvoiceViewResponse.ItemDto(
                    orderItem.getId(), orderItem.getFood().getId(), orderItem.getFood().getName(), orderItem.getQuantity(), orderItem.getUnitPrice(),
                    orderItem.getStatus(), orderItem.getNote(),
                    orderItem.getStatus() == OrderItemStatus.REJECTED && CUSTOMER_CANCEL_NOTE.equals(orderItem.getNote()),
                    orderItem.getStartedCookingAt(), orderItem.getFood().getEstimatedCookingTime(),
                    orderItem.getOrderCombo() == null ? null : orderItem.getOrderCombo().getId(),
                    optionNames.getOrDefault(orderItem.getId(), List.of()),
                    CANCELLABLE.contains(orderItem.getStatus())));
            if (!INACTIVE.contains(orderItem.getStatus())) {
                total = total.add(orderItem.getUnitPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())));
            }
        }

        Map<Long, List<InvoiceViewResponse.ComboDto>> combosByOrder = new HashMap<>();
        for (OrderCombo orderCombo : combos) {
            boolean active = activeComboIds.contains(orderCombo.getId());
            combosByOrder.computeIfAbsent(orderCombo.getOrder().getId(), key -> new ArrayList<>()).add(
                    new InvoiceViewResponse.ComboDto(orderCombo.getId(), orderCombo.getCombo().getId(), orderCombo.getCombo().getName(),
                            orderCombo.getQuantity(), orderCombo.getComboPrice(), active));
            if (active) {
                total = total.add(orderCombo.getComboPrice().multiply(BigDecimal.valueOf(orderCombo.getQuantity())));
            }
        }

        List<InvoiceViewResponse.OrderDto> orders = new ArrayList<>();
        itemsByOrder.forEach((orderId, list) -> orders.add(new InvoiceViewResponse.OrderDto(
                orderId, orderTimes.get(orderId), list, combosByOrder.getOrDefault(orderId, List.of()))));

        return new InvoiceViewResponse(invoice.getId(), invoice.getOpenedAt(), total, callPending, orders);
    }

    /**
     * Khách hủy một món khi bếp CHƯA bấm "Nấu" (PENDING hoặc CONFIRMED).
     * Món thuộc combo thì hủy cả combo (các món con còn hiệu lực), vì giá combo không chia lẻ được.
     * Trả về hóa đơn mới nhất để giao diện cập nhật.
     */
    @Transactional
    public InvoiceViewResponse cancelItem(Long tableId, Long orderItemId) {
        Long itemTableId = orderItemRepository.findTableIdByItemId(orderItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món với ID " + orderItemId));
        if (!itemTableId.equals(tableId)) {
            throw new BusinessException("Món này không thuộc bàn của bạn");
        }

        // Thứ tự khóa luôn là: bàn -> món (cùng thứ tự với lúc gửi đơn, tránh deadlock)
        tableRepository.findByIdForUpdate(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với ID " + tableId));

        List<OrderItem> locked = orderItemRepository.findAllByIdForUpdate(List.of(orderItemId));
        OrderItem item = locked.get(0);
        Invoice invoice = item.getOrder().getInvoice();
        if (invoice.getStatus() != InvoiceStatus.OPEN) {
            throw new BusinessException("Hóa đơn đã thanh toán, không thể hủy món");
        }
        assertCancellable(item);

        List<OrderItem> targets = locked;
        if (item.getOrderCombo() != null) {
            List<Long> siblingIds = orderItemRepository.findIdsByOrderComboId(item.getOrderCombo().getId());
            targets = orderItemRepository.findAllByIdForUpdate(siblingIds);
            for (OrderItem targetItem : targets) { // thà từ chối cả combo còn hơn hủy một nửa
                if (!INACTIVE.contains(targetItem.getStatus())) assertCancellable(targetItem);
            }
        }
        for (OrderItem targetItem : targets) {
            if (INACTIVE.contains(targetItem.getStatus())) continue;
            targetItem.setStatus(OrderItemStatus.REJECTED);
            targetItem.setNote(CUSTOMER_CANCEL_NOTE);
        }

        // Hết món hợp lệ thì hóa đơn KHÔNG đóng ngay, bàn vẫn SERVING: InvoiceAutoCancelService sẽ hủy
        // hóa đơn và trả bàn sau khoảng chờ nếu vẫn không có Order mới.
        return getInvoice(tableId);
    }

    private void assertCancellable(OrderItem item) {
        if (item.getStatus() == OrderItemStatus.REJECTED) {
            throw new BusinessException("Món này đã bị hủy hoặc từ chối trước đó");
        }
        if (!CANCELLABLE.contains(item.getStatus())) {
            throw new BusinessException("Bếp đã bắt đầu chế biến món này, không thể hủy");
        }
    }
}
