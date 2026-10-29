package com.sccgroup.restaurant_management.admin.controller;

import com.sccgroup.restaurant_management.admin.service.AdminImageService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/** Public menu images; writes remain protected by the Admin security chain. */
@RestController
@RequestMapping("/api/customer/media")
public class AdminImageReadController {
    private final AdminImageService service;
    public AdminImageReadController(AdminImageService service) { this.service = service; }
    @GetMapping("/{filename}")
    public ResponseEntity<FileSystemResource> read(@PathVariable String filename) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG)
            .header("X-Content-Type-Options","nosniff")
            .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(30)))
            .body(new FileSystemResource(service.get(filename)));
    }
}
