package com.sccgroup.restaurant_management.customer.controller;

import com.sccgroup.restaurant_management.customer.dto.FoodDetailResponse;
import com.sccgroup.restaurant_management.customer.dto.MenuResponse;
import com.sccgroup.restaurant_management.customer.dto.TableInfoResponse;
import com.sccgroup.restaurant_management.customer.service.CustomerMenuService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** API xem thực đơn cho khách (không cần đăng nhập). */
@RestController
@RequestMapping("/api/customer")
public class CustomerMenuController {

    private final CustomerMenuService menuService;

    public CustomerMenuController(CustomerMenuService menuService) {
        this.menuService = menuService;
    }

    /** Khách quét QR -> frontend gọi để lấy thông tin bàn. */
    @GetMapping("/tables/{tableId}")
    public TableInfoResponse getTable(@PathVariable Long tableId) {
        return menuService.getTable(tableId);
    }

    @GetMapping("/menu")
    public MenuResponse getMenu() {
        return menuService.getMenu();
    }

    @GetMapping("/foods/{foodId}")
    public FoodDetailResponse getFoodDetail(@PathVariable Long foodId) {
        return menuService.getFoodDetail(foodId);
    }
}
