package com.sccgroup.restaurant_management.customer.dto;

/** Thông tin bàn ứng với mã QR khách vừa quét. */
public record TableInfoResponse(Long id, String floor, String tableNumber) {
}
