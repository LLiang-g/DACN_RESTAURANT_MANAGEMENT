package com.sccgroup.restaurant_management.kds.controller;

import com.sccgroup.restaurant_management.common.security.AppUserPrincipal;
import com.sccgroup.restaurant_management.kds.dto.KdsOrderDto;
import com.sccgroup.restaurant_management.kds.service.KdsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/kds")
public class KdsController {

    private final KdsService kdsService;

    public KdsController(KdsService kdsService) {
        this.kdsService = kdsService;
    }

    /** Toàn bộ order trên màn hình bếp (mọi khu bếp thấy hết, chỉ được bấm món của khu mình). */
    @GetMapping("/orders")
    public List<KdsOrderDto> getOrders() {
        return kdsService.getBoard();
    }

    @PostMapping("/items/{itemId}/start")
    public ResponseEntity<Void> start(@PathVariable Long itemId,
                                      @AuthenticationPrincipal AppUserPrincipal principal) {
        kdsService.startCooking(itemId, principal);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/items/{itemId}/finish")
    public ResponseEntity<Void> finish(@PathVariable Long itemId,
                                       @AuthenticationPrincipal AppUserPrincipal principal) {
        kdsService.finishCooking(itemId, principal);
        return ResponseEntity.noContent().build();
    }
}
