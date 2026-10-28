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
                invoice.getStatus().name(), itemDtos, comboDtos, calculateTotal(items, combos)
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

        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setCancelledAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        realtimeEventPublisher.publishAfterCommit(
                "/topic/pos",
                new InvoiceStatusEvent(invoice.getId(), invoice.getTable().getId(), invoice.getStatus().name())
        );
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
                .map(oi -> new InvoiceComboItemResponse(oi.getFood().getName(), oi.getQuantity(), oi.getStatus().name()))
                .toList();
        BigDecimal base = combo.getComboPrice().multiply(BigDecimal.valueOf(combo.getQuantity()));
        BigDecimal surcharge = children.stream()
                .map(oi -> oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new InvoiceComboResponse(combo.getId(), combo.getCombo().getName(), combo.getQuantity(),
                combo.getComboPrice(), base.add(surcharge), childDtos);
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
                .map(combo -> {
                    List<OrderItem> children = childrenByComboId.getOrDefault(combo.getId(), List.of());
                    BigDecimal base = combo.getComboPrice().multiply(BigDecimal.valueOf(combo.getQuantity()));
                    BigDecimal surcharge = children.stream()
                            .map(oi -> oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return base.add(surcharge);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return itemTotal.add(comboTotal);
    }

    private boolean isComboBillable(List<OrderItem> children) {
        return !children.isEmpty() && children.stream().allMatch(this::isBillable);
    }

    private boolean isBillable(OrderItem item) {
        return switch (item.getStatus()) {
            case CONFIRMED, COOKING, DONE, SERVED -> true;
            case PENDING, REJECTED, RETURNED -> false;
        };
    }
}