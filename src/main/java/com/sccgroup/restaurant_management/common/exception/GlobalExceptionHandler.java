package com.sccgroup.restaurant_management.common.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException e) {
        String code = e.getCode() != null ? e.getCode() : "BUSINESS_ERROR";
        return ResponseEntity.badRequest().body(new ErrorResponse(code, e.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(e.getCode(), e.getMessage()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("UNAUTHORIZED", "Sai tên đăng nhập hoặc mật khẩu"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này"));
    }

    // Spring MVC selects the status and protocol headers; retain both and adapt the body.
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ErrorResponse response = standardError(status.value());
        if (status.is5xxServerError()) log.error("Lỗi xử lý HTTP {}", status.value(), ex);
        return super.handleExceptionInternal(ex, response, headers, status, request);
    }

    private ErrorResponse standardError(int status) {
        return switch (status) {
            case 400 -> new ErrorResponse("BAD_REQUEST", "Dữ liệu yêu cầu không hợp lệ hoặc thiếu thông tin");
            case 401 -> new ErrorResponse("UNAUTHORIZED", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
            case 403 -> new ErrorResponse("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này");
            case 404 -> new ErrorResponse("NOT_FOUND", "Không tìm thấy tài nguyên được yêu cầu");
            case 405 -> new ErrorResponse("METHOD_NOT_ALLOWED", "Phương thức HTTP không được hỗ trợ cho đường dẫn này");
            case 406 -> new ErrorResponse("NOT_ACCEPTABLE", "Định dạng phản hồi yêu cầu không được hỗ trợ");
            case 409 -> new ErrorResponse("CONFLICT", "Trạng thái dữ liệu đã thay đổi, vui lòng tải lại");
            case 413 -> new ErrorResponse("PAYLOAD_TOO_LARGE", "Dữ liệu tải lên vượt quá dung lượng cho phép");
            case 415 -> new ErrorResponse("UNSUPPORTED_MEDIA_TYPE", "Định dạng dữ liệu gửi lên không được hỗ trợ");
            case 429 -> new ErrorResponse("TOO_MANY_REQUESTS", "Có quá nhiều yêu cầu, vui lòng thử lại sau");
            default -> status >= 500
                    ? new ErrorResponse("INTERNAL_ERROR", "Đã có lỗi xảy ra, vui lòng thử lại")
                    : new ErrorResponse("HTTP_" + status, "Yêu cầu không thể được thực hiện");
        };
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnknown(Exception e) {
        log.error("Lỗi không xác định", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR", "Đã có lỗi xảy ra, vui lòng thử lại"));
    }
}
