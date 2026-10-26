package com.sccgroup.restaurant_management.pos.controller;

import com.sccgroup.restaurant_management.pos.dto.TableOverviewResponse;
import com.sccgroup.restaurant_management.pos.service.PosTableService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pos/tables")
public class PosTableController {

    private final PosTableService posTableService;

    public PosTableController(PosTableService posTableService) {
        this.posTableService = posTableService;
    }

    @GetMapping
    public ResponseEntity<List<TableOverviewResponse>> getTableOverview() {
        return ResponseEntity.ok(posTableService.getTableOverview());
    }

    @PatchMapping("/{id}/free")
    public ResponseEntity<Void> freeTable(@PathVariable Long id) {
        posTableService.freeTable(id);
        return ResponseEntity.noContent().build();
    }
}