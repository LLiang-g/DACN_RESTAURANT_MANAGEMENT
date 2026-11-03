package com.sccgroup.restaurant_management.customer.dto;

import java.time.LocalDateTime;

/** alreadyPending = true nếu bàn đã có yêu cầu chưa xử lý (không tạo thêm yêu cầu trùng). */
public record CallStaffResponse(Long id, LocalDateTime createdAt, boolean alreadyPending) {
}
