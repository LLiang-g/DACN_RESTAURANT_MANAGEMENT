package com.sccgroup.restaurant_management.common.exception;

/** Xung đột trạng thái (đã thanh toán, hóa đơn không còn OPEN...) -> HTTP 409. */
public class ConflictException extends BusinessException {
    public ConflictException(String code, String message) {
        super(code, message);
    }
}