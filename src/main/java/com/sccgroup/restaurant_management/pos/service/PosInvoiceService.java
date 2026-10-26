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
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderRepository;
import com.sccgroup.restaurant_management.pos.dto.InvoiceDetailResponse;
import com.sccgroup.restaurant_management.pos.dto.InvoiceItemResponse;
import com.sccgroup.restaurant_management.pos.dto.PayRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class PosInvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final TableReleaseService tableReleaseService;

    public PosInvoiceService(InvoiceRepository invoiceRepository,
                             OrderRepository orderRepository,
                             OrderItemRepository orderItemRepository,
                             RealtimeEventPublisher realtimeEventPublisher,
                             TableReleaseService tableReleaseService) {
        this.invoiceRepository = invoiceRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.tableReleaseService = tableReleaseService;
    }

    @Transactional(readOnly = true)
    public InvoiceDetailResponse getInvoiceDetail(Long invoiceId) {
        Invoice invoice = invoiceRepository.findByIdWithTable(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn với id = " + invoiceId));

        List<OrderItem> items = loadInvoiceItems(invoiceId);

        List<InvoiceItemResponse> itemDtos = items.stream()
                .map(oi -> new InvoiceItemResponse(
                        oi.getId(),
                        oi.getFood().getName(),
                        oi.getQuantity(),
                        oi.getUnitPrice(),
                        oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity())),
                        oi.getStatus().name()
                ))
                .toList();

        RestaurantTable table = invoice.getTable();

        return new InvoiceDetailResponse(
                invoice.getId(), table.getId(), table.getTableNumber(), table.getFloor(),
                invoice.getStatus().name(), itemDtos, calculateTotal(items)
        );
    }

    @Transactional
    public void pay(Long invoiceId, PayRequest request) {
        // Không còn điều kiện "mọi món phải SERVED mới được thanh toán" nữa —
        // lễ tân có thể thu tiền bất kỳ lúc nào khách yêu cầu, kể cả khi món
        // vẫn còn đang nấu. Việc trả bàn về Trống được quyết định riêng ở
        // TableReleaseService ngay bên dưới, không gắn cứng vào bước này nữa.
        Invoice invoice = getOpenInvoiceOrThrow(invoiceId);
        List<OrderItem> items = loadInvoiceItems(invoiceId);
        BigDecimal total = calculateTotal(items);

        if (request.paymentMethod() == PaymentMethod.CASH) {
            if (request.amountReceived() == null || request.amountReceived().compareTo(total) < 0) {
                throw new BusinessException("AMOUNT_RECEIVED_INSUFFICIENT",
                        "Số tiền khách đưa nhỏ hơn tổng tiền hóa đơn");
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

        realtimeEventPublisher.publishAfterCommit(
                "/topic/pos",
                new InvoiceStatusEvent(invoice.getId(), invoice.getTable().getId(), invoice.getStatus().name())
        );
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
        if (orders.isEmpty()) {
            return List.of();
        }
        List<Long> orderIds = orders.stream().map(Order::getId).toList();
        return orderItemRepository.findByOrderIdInWithFood(orderIds);
    }

    private BigDecimal calculateTotal(List<OrderItem> items) {
        return items.stream()
                .filter(this::isBillable)
                .map(oi -> oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Chỉ tính tiền món đã được lễ tân duyệt (qua khỏi PENDING) và chưa bị loại khỏi hóa đơn.
// PENDING: chưa duyệt, có thể còn bị từ chối -> chưa chắc chắn nên không tính.
// REJECTED/RETURNED: đã loại khỏi hóa đơn -> không tính.
// CONFIRMED/COOKING/DONE/SERVED: đã duyệt, chắc chắn tính dù chưa phục vụ xong.
    private boolean isBillable(OrderItem item) {
        return switch (item.getStatus()) {
            case CONFIRMED, COOKING, DONE, SERVED -> true;
            case PENDING, REJECTED, RETURNED -> false;
        };
    }
}