package com.sccgroup.restaurant_management.pos.controller;

import com.sccgroup.restaurant_management.pos.dto.CallStaffRequestResponse;
import com.sccgroup.restaurant_management.pos.service.PosCallStaffService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pos/call-staff-requests")
public class PosCallStaffController {

    private final PosCallStaffService callStaffService;

    public PosCallStaffController(PosCallStaffService callStaffService) {
        this.callStaffService = callStaffService;
    }

    @GetMapping("/pending")
    public List<CallStaffRequestResponse> getPending() {
        return callStaffService.getPendingRequests();
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<Void> resolve(@PathVariable Long id) {
        callStaffService.resolve(id);
        return ResponseEntity.noContent().build();
    }
}