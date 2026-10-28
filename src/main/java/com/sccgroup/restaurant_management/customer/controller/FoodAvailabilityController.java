package com.sccgroup.restaurant_management.customer.controller;

import com.sccgroup.restaurant_management.domain.service.InventoryService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/foods")
public class FoodAvailabilityController {
    private final InventoryService inventoryService;
    public FoodAvailabilityController(InventoryService inventoryService) { this.inventoryService = inventoryService; }

    @GetMapping("/{foodId}/availability")
    public Map<String, Boolean> availability(@PathVariable Long foodId,
                                              @RequestParam(required = false) List<Long> optionIds,
                                              @RequestParam(defaultValue = "1") int quantity) {
        return Map.of("available", inventoryService.isAvailable(foodId, optionIds, quantity));
    }
}
