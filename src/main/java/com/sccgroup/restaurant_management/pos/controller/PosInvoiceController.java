package com.sccgroup.restaurant_management.pos.controller;

import com.sccgroup.restaurant_management.pos.dto.InvoiceDetailResponse;
import com.sccgroup.restaurant_management.pos.dto.PayRequest;
import com.sccgroup.restaurant_management.pos.service.PosInvoiceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pos/invoices")
public class PosInvoiceController {

    private final PosInvoiceService posInvoiceService;

    public PosInvoiceController(PosInvoiceService posInvoiceService) {
        this.posInvoiceService = posInvoiceService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDetailResponse> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(posInvoiceService.getInvoiceDetail(id));
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<Void> pay(@PathVariable Long id, @RequestBody PayRequest request) {
        posInvoiceService.pay(id, request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        posInvoiceService.cancel(id);
        return ResponseEntity.noContent().build();
    }
}