package com.sccgroup.restaurant_management.common.exception;

public class BusinessException extends RuntimeException {
    private final String code;

    public BusinessException(String message) {
        this(null, message);
    }

    // Constructor mới — dùng khi cần trả mã lỗi cụ thể cho frontend phân biệt
    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}