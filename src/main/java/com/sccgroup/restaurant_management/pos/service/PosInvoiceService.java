package com.sccgroup.restaurant_management.pos.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.common.realtime.InvoiceStatusEvent;
import com.sccgroup.restaurant_management.common.realtime.RealtimeEventPublisher;
import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentMethod;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.entity.order.Order;
import com.sccgroup.restaurant_management.domain.entity.order.OrderCombo;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderComboRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderRepository;
import com.sccgroup.restaurant_management.pos.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PosInvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final TableReleaseService tableReleaseService;
    private final OrderComboRepository orderComboRepository;
    private static final String INVOICE_CANCEL_NOTE = "Hóa đơn bị hủy";

    public PosInvoiceService(InvoiceRepository invoiceRepository,
                             OrderRepository orderRepository,
                             OrderItemRepository orderItemRepository,
                             OrderComboRepository orderComboRepository,
                             RealtimeEventPublisher realtimeEventPublisher,
                             TableReleaseService tableReleaseService) {
        this.invoiceRepository = invoiceRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderComboRepository = orderComboRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.tableReleaseService = tableReleaseService;
    }

    @Transactional(readOnly = true)
    public InvoiceDetailResponse getInvoiceDetail(Long invoiceId) {
        Invoice invoice = invoiceRepository.findByIdWithTable(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn với id = " + invoiceId));

        List<OrderItem> items = loadInvoiceItems(invoiceId);
        List<OrderCombo> combos = loadInvoiceCombos(invoiceId);
        Map<Long, List<OrderItem>> childrenByComboId = groupByComboId(items);

        List<InvoiceItemResponse> itemDtos = items.stream()
                .filter(oi -> oi.getOrderCombo() == null) // chỉ món lẻ, món trong combo nằm trong 'combos'
                .map(oi -> new InvoiceItemResponse(
                        oi.getId(), oi.getFood().getName(), oi.getQuantity(), oi.getUnitPrice(),
                        oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity())), oi.getStatus().name()))
                .toList();

        List<InvoiceComboResponse> comboDtos = combos.stream()
                .map(combo -> toComboResponse(combo, childrenByComboId.getOrDefault(combo.getId(), List.of())))
                .toList();

        RestaurantTable table = invoice.getTable();

        return new InvoiceDetailResponse(
                invoice.getId(), table.getId(), table.getTableNumber(), table.getFloor(),
                invoice.getStatus().name(), itemDtos, comboDtos, calculateTotal(items, combos),
                invoice.getPaymentMethod() != null ? invoice.getPaymentMethod().name() : null,
                invoice.getAmountReceived(),
                invoice.getChangeAmount(),
                invoice.getBankTransactionRef(),
                invoice.getPaidAt()
        );
    }

    @Transactional
    public void pay(Long invoiceId, PayRequest request) {
        Invoice invoice = getOpenInvoiceOrThrow(invoiceId);
        List<OrderItem> items = loadInvoiceItems(invoiceId);
        List<OrderCombo> combos = loadInvoiceCombos(invoiceId);

        if (items.stream().anyMatch(oi -> oi.getStatus() == OrderItemStatus.PENDING)) {
            throw new BusinessException("INVOICE_HAS_PENDING_ITEMS",
                    "Hóa đơn còn món chưa được duyệt, phải duyệt hoặc từ chối trước khi thanh toán");
        }

        BigDecimal total = calculateTotal(items, combos);

        if (request.paymentMethod() == PaymentMethod.CASH) {
            if (request.amountReceived() == null || request.amountReceived().compareTo(total) < 0) {
                throw new BusinessException("AMOUNT_RECEIVED_INSUFFICIENT", "Số tiền khách đưa nhỏ hơn tổng tiền hóa đơn");
            }
            invoice.setAmountReceived(request.amountReceived());
            invoice.setChangeAmount(request.amountReceived().subtract(total));
        } else {
            invoice.setBankTransactionRef(request.bankTransactionRef());
        }

        invoice.setPaymentMethod(request.paymentMethod());
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        realtimeEventPublisher.publishAfterCommit("/topic/pos",
                new InvoiceStatusEvent(invoice.getId(), invoice.getTable().getId(), invoice.getStatus().name()));
        tableReleaseService.releaseTableIfSettled(invoiceId);
    }

    @Transactional
    public void cancel(Long invoiceId) {
        Invoice invoice = getOpenInvoiceOrThrow(invoiceId);
        List<OrderItem> items = loadInvoiceItems(invoiceId);

        boolean hasCommittedItem = items.stream().anyMatch(oi -> switch (oi.getStatus()) {
            case COOKING, DONE, SERVED, RETURNED -> true;
            case PENDING, CONFIRMED, REJECTED -> false;
        });
        if (hasCommittedItem) {
            throw new BusinessException("INVOICE_HAS_COOKED_ITEMS",
                    "Hóa đơn đã có món được đưa xuống bếp nấu hoặc đã phục vụ, không thể hủy");
        }

        boolean kdsNeedsRefresh = false;
        for (OrderItem item : items) {
            if (item.getStatus() == OrderItemStatus.PENDING || item.getStatus() == OrderItemStatus.CONFIRMED) {
                if (item.getStatus() == OrderItemStatus.CONFIRMED) {
                    kdsNeedsRefresh = true; // món này bếp đã thấy trên màn hình, cần báo gỡ xuống
                }
                item.setStatus(OrderItemStatus.REJECTED);
                item.setNote(INVOICE_CANCEL_NOTE);
                orderItemRepository.save(item);
            }
        }

        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setCancelledAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        realtimeEventPublisher.publishAfterCommit("/topic/pos",
                new InvoiceStatusEvent(invoice.getId(), invoice.getTable().getId(), invoice.getStatus().name()));

        if (kdsNeedsRefresh) {
            realtimeEventPublisher.publishAfterCommit("/topic/kds", Map.of("type", "CHANGED"));
        }

        tableReleaseService.releaseTableIfSettled(invoiceId);
    }

    private Invoice getOpenInvoiceOrThrow(Long invoiceId) {
        Invoice invoice = invoiceRepository.findByIdWithTable(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn với id = " + invoiceId));

        if (invoice.getStatus() != InvoiceStatus.OPEN) {
            throw new BusinessException("INVOICE_ALREADY_PAID",
                    "Hóa đơn này đã được thanh toán hoặc đã hủy trước đó");
        }
        return invoice;
    }

    private List<OrderItem> loadInvoiceItems(Long invoiceId) {
        List<Order> orders = orderRepository.findByInvoiceId(invoiceId);
        if (orders.isEmpty()) return List.of();
        List<Long> orderIds = orders.stream().map(Order::getId).toList();
        return orderItemRepository.findByOrderIdInWithFood(orderIds);
    }

    private List<OrderCombo> loadInvoiceCombos(Long invoiceId) {
        List<Order> orders = orderRepository.findByInvoiceId(invoiceId);
        if (orders.isEmpty()) return List.of();
        List<Long> orderIds = orders.stream().map(Order::getId).toList();
        return orderComboRepository.findByOrderIdInWithCombo(orderIds);
    }

    private Map<Long, List<OrderItem>> groupByComboId(List<OrderItem> items) {
        return items.stream()
                .filter(oi -> oi.getOrderCombo() != null)
                .collect(Collectors.groupingBy(oi -> oi.getOrderCombo().getId()));
    }

    private InvoiceComboResponse toComboResponse(OrderCombo combo, List<OrderItem> children) {
        List<InvoiceComboItemResponse> childDtos = children.stream()
                .map(oi -> new InvoiceComboItemResponse(oi.getId(), oi.getFood().getName(), oi.getQuantity(), oi.getStatus().name()))
                .toList();
        return new InvoiceComboResponse(combo.getId(), combo.getCombo().getName(), combo.getQuantity(),
                combo.getComboPrice(), comboLineTotal(combo, children), childDtos);
    }

    private BigDecimal calculateTotal(List<OrderItem> items, List<OrderCombo> combos) {
        Map<Long, List<OrderItem>> childrenByComboId = groupByComboId(items);

        BigDecimal itemTotal = items.stream()
                .filter(oi -> oi.getOrderCombo() == null)
                .filter(this::isBillable)
                .map(oi -> oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal comboTotal = combos.stream()
                .filter(combo -> isComboBillable(childrenByComboId.getOrDefault(combo.getId(), List.of())))
                .map(combo -> comboLineTotal(combo, childrenByComboId.getOrDefault(combo.getId(), List.of())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return itemTotal.add(comboTotal);
    }

    private boolean isComboBillable(List<OrderItem> children) {
        return !children.isEmpty() && children.stream().noneMatch(oi -> oi.getStatus() == OrderItemStatus.PENDING);
    }

    private BigDecimal comboLineTotal(OrderCombo combo, List<OrderItem> children) {
        BigDecimal base = combo.getComboPrice().multiply(BigDecimal.valueOf(combo.getQuantity()));

        // Món bị hủy trong combo: trừ giá bán lẻ hiện tại của món đó ra khỏi giá combo
        BigDecimal rejectedDeduction = children.stream()
                .filter(oi -> oi.getStatus() == OrderItemStatus.REJECTED || oi.getStatus() == OrderItemStatus.RETURNED)
                .map(oi -> oi.getFood().getPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Phụ thu option của các món còn billable (không tính phụ thu của món đã bị hủy)
        BigDecimal surcharge = children.stream()
                .filter(this::isBillable)
                .map(oi -> oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal adjustedBase = base.subtract(rejectedDeduction).max(BigDecimal.ZERO);
        return adjustedBase.add(surcharge);
    }

    private boolean isBillable(OrderItem item) {
        return switch (item.getStatus()) {
            case CONFIRMED, COOKING, DONE, SERVED -> true;
            case PENDING, REJECTED, RETURNED -> false;
        };
    }
}