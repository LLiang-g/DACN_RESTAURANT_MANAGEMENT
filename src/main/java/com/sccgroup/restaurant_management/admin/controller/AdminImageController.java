package com.sccgroup.restaurant_management.admin.controller;

import com.sccgroup.restaurant_management.admin.service.AdminImageService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/food-images")
public class AdminImageController {
    private final AdminImageService service;
    public AdminImageController(AdminImageService service) { this.service = service; }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,String> upload(@RequestParam("file") MultipartFile file) throws IOException {
        return Map.of("url",service.store(file));
    }
}
