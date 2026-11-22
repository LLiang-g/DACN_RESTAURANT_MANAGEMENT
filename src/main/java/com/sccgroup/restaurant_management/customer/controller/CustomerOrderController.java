package com.sccgroup.restaurant_management.customer.controller;

import com.sccgroup.restaurant_management.customer.dto.OrderResponse;
import com.sccgroup.restaurant_management.customer.dto.PlaceOrderRequest;
import com.sccgroup.restaurant_management.customer.service.CustomerOrderSubmissionService;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** API gửi đơn gọi món của khách (không cần đăng nhập). */
@RestController
@RequestMapping("/api/customer")
public class CustomerOrderController {

    private final CustomerOrderSubmissionService orderService;

    public CustomerOrderController(CustomerOrderSubmissionService orderService) {
        this.orderService = orderService;
    }

    /** Gửi đơn: một mã gửi tạo tối đa một Order; gửi lại đúng mã và nội dung nhận kết quả cũ. */
    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> placeOrder(@RequestBody PlaceOrderRequest request,
            @RequestHeader(value="Idempotency-Key",required=false) String requestKey) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.placeOrder(request, requestKey));
    }
}
