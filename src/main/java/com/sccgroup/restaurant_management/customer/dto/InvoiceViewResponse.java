package com.sccgroup.restaurant_management.customer.dto;

import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Hóa đơn đang mở của bàn: mọi Order khách đã gọi + trạng thái từng món + tổng tạm tính.
 * Chưa gọi gì thì invoiceId = null và orders rỗng.
 * totalAmount bỏ qua món REJECTED (kể cả khách tự hủy) và RETURNED; combo chỉ tính khi còn ít nhất một món con hiệu lực.
 */
public record InvoiceViewResponse(
        Long invoiceId,
        LocalDateTime openedAt,
        BigDecimal totalAmount,
        boolean callStaffPending,
        List<OrderDto> orders) {

    public record OrderDto(Long orderId, LocalDateTime createdAt, List<ItemDto> items, List<ComboDto> combos) {}

    /** cancellable = true khi món đang PENDING/CONFIRMED (bếp chưa bấm Nấu). */
    public record ItemDto(
            Long id,
            Long foodId,
            String foodName,
            Integer quantity,
            BigDecimal unitPrice,
            OrderItemStatus status,
            String note,                    // lý do từ chối / trả món
            boolean cancelledByCustomer,    // REJECTED do chính khách hủy
            LocalDateTime startedCookingAt, // khác null khi đã vào bếp
            Integer estimatedCookingMinutes,
            Long comboOrderId,
            List<String> optionNames,
            boolean cancellable) {}

    public record ComboDto(Long id, Long comboId, String comboName, Integer quantity, BigDecimal comboPrice, boolean active) {}
}
