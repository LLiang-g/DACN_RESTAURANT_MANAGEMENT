package com.sccgroup.restaurant_management.payment.controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import java.util.Map;
@RestControllerAdvice(assignableTypes=CollectionController.class) @Order(0)
public class CollectionConflictAdvice {
 @ExceptionHandler(DataIntegrityViolationException.class)
 public ResponseEntity<Map<String,String>> conflict(DataIntegrityViolationException e){return ResponseEntity.status(409).body(Map.of("code","COLLECTION_CONCURRENT_CONFLICT","message","Yêu cầu hoặc mã ngân hàng vừa được ghi nhận. Tải lại lịch sử; không thu tiền thêm lần nữa."));}
}
