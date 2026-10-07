package com.sccgroup.restaurant_management.customer.controller;

import com.sccgroup.restaurant_management.customer.dto.CallStaffResponse;
import com.sccgroup.restaurant_management.customer.dto.InvoiceViewResponse;
import com.sccgroup.restaurant_management.customer.service.CustomerCallStaffService;
import com.sccgroup.restaurant_management.customer.service.CustomerInvoiceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** API theo bàn: xem hóa đơn, hủy món, gọi nhân viên (khách không cần đăng nhập). */
@RestController
@RequestMapping("/api/customer/tables/{tableId}")
public class CustomerTableController {

    private final CustomerInvoiceService invoiceService;
    private final CustomerCallStaffService callStaffService;

    public CustomerTableController(CustomerInvoiceService invoiceService, CustomerCallStaffService callStaffService) {
        this.invoiceService = invoiceService;
        this.callStaffService = callStaffService;
    }

    @GetMapping("/invoice")
    public InvoiceViewResponse getInvoice(@PathVariable Long tableId) {
        return invoiceService.getInvoice(tableId);
    }

    @PostMapping("/order-items/{orderItemId}/cancel")
    public InvoiceViewResponse cancelItem(@PathVariable Long tableId, @PathVariable Long orderItemId) {
        return invoiceService.cancelItem(tableId, orderItemId);
    }

    @PostMapping("/call-staff")
    public ResponseEntity<CallStaffResponse> callStaff(@PathVariable Long tableId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(callStaffService.callStaff(tableId));
    }
}
