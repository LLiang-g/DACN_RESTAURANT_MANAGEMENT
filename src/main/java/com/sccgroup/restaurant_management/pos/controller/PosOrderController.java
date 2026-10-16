package com.sccgroup.restaurant_management.pos.controller;

import com.sccgroup.restaurant_management.pos.dto.PendingOrderResponse;
import com.sccgroup.restaurant_management.pos.service.PosOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pos/orders")
public class PosOrderController {

    private final PosOrderService posOrderService;

    public PosOrderController(PosOrderService posOrderService) {
        this.posOrderService = posOrderService;
    }

    @GetMapping("/pending")
    public ResponseEntity<List<PendingOrderResponse>> getPendingOrders() {
        return ResponseEntity.ok(posOrderService.getPendingOrders());
    }
}