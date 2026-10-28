package com.sccgroup.restaurant_management.kds.controller;

import com.sccgroup.restaurant_management.common.security.AppUserPrincipal;
import com.sccgroup.restaurant_management.domain.entity.account.AccountType;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.service.InventoryService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.Map;

@RestController
@RequestMapping("/api/kds/order-items")
public class KitchenCookingController {
    private final InventoryService inventoryService;
    public KitchenCookingController(InventoryService inventoryService) { this.inventoryService = inventoryService; }

    @PostMapping("/{id}/start-cooking")
    public Map<String, Object> startCooking(@PathVariable Long id, Authentication authentication) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        OrderItem item = inventoryService.startCooking(id, principal.getAccountId(), AccountType.valueOf(principal.getAccountType()));
        return Map.of("id", item.getId(), "status", item.getStatus().name());
    }
}
