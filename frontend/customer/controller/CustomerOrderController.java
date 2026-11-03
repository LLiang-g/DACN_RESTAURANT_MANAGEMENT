package com.sccgroup.restaurant_management.customer.controller;

import com.sccgroup.restaurant_management.customer.dto.OrderResponse;
import com.sccgroup.restaurant_management.customer.dto.PlaceOrderRequest;
import com.sccgroup.restaurant_management.customer.service.CustomerOrderService;
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

    private final CustomerOrderService orderService;

    public CustomerOrderController(CustomerOrderService orderService) {
        this.orderService = orderService;
    }

    /** Gửi đơn: luôn tạo một Order mới với các món ở trạng thái PENDING. */
    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> placeOrder(@RequestBody PlaceOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.placeOrder(request));
    }
}
