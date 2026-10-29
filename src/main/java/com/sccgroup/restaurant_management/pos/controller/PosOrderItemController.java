package com.sccgroup.restaurant_management.pos.controller;

import com.sccgroup.restaurant_management.pos.dto.RejectRequest;
import com.sccgroup.restaurant_management.pos.service.PosOrderActionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pos/order-items")
public class PosOrderItemController {

    private final PosOrderActionService posOrderActionService;

    public PosOrderItemController(PosOrderActionService posOrderActionService) {
        this.posOrderActionService = posOrderActionService;
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<Void> approve(@PathVariable Long id) {
        posOrderActionService.approve(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<Void> reject(@PathVariable Long id, @RequestBody RejectRequest request) {
        posOrderActionService.reject(id, request.reason());
        return ResponseEntity.noContent().build();
    }


    @PatchMapping("/{id}/served")
    public ResponseEntity<Void> served(@PathVariable Long id) {
        posOrderActionService.markServed(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/return")
    public ResponseEntity<Void> returnItem(@PathVariable Long id) {
        posOrderActionService.markReturned(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/undo-return")
    public ResponseEntity<Void> undoReturn(@PathVariable Long id) {
        posOrderActionService.undoReturn(id);
        return ResponseEntity.noContent().build();
    }
}