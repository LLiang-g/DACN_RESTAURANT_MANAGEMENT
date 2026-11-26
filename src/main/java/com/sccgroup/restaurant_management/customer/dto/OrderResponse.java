package com.sccgroup.restaurant_management.customer.dto;

import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Kết quả sau khi gửi đơn. totalAmount là tổng tiền của RIÊNG đơn này:
 * Σ(unitPrice × quantity của các món lẻ) + Σ(unitPrice × quantity phụ thu option của món trong combo)
 * + Σ(comboPrice × quantity của combo).
 */
public record OrderResponse(
        Long orderId,
        Long invoiceId,
        Long tableId,
        LocalDateTime createdAt,
        BigDecimal totalAmount,
        List<ItemDto> items,
        List<ComboDto> combos) {

    /** comboOrderId khác null nếu món này là món con của một combo trong đơn. */
    public record ItemDto(
            Long id,
            Long foodId,
            String foodName,
            Integer quantity,
            BigDecimal unitPrice,
            OrderItemStatus status,
            Long comboOrderId,
            List<String> optionNames) {}

    public record ComboDto(Long id, Long comboId, String comboName, Integer quantity, BigDecimal comboPrice) {}
}
