package com.sccgroup.restaurant_management.pos.service;

import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository;
import com.sccgroup.restaurant_management.pos.dto.TableOverviewResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PosTableService {

    private final RestaurantTableRepository restaurantTableRepository;
    private final InvoiceRepository invoiceRepository;

    public PosTableService(RestaurantTableRepository restaurantTableRepository,
                           InvoiceRepository invoiceRepository) {
        this.restaurantTableRepository = restaurantTableRepository;
        this.invoiceRepository = invoiceRepository;
    }

    @Transactional(readOnly = true)
    public List<TableOverviewResponse> getTableOverview() {
        List<RestaurantTable> tables = restaurantTableRepository.findAll();
        List<Invoice> openInvoices = invoiceRepository.findAllOpenWithTable();

        Map<Long, Invoice> openInvoiceByTableId = openInvoices.stream()
                .collect(Collectors.toMap(inv -> inv.getTable().getId(), inv -> inv));

        return tables.stream()
                .sorted(Comparator.comparing(RestaurantTable::getFloor)
                        .thenComparing(RestaurantTable::getTableNumber))
                .map(table -> {
                    Invoice invoice = openInvoiceByTableId.get(table.getId());
                    return new TableOverviewResponse(
                            table.getId(),
                            table.getTableNumber(),
                            table.getFloor(),
                            table.getStatus().name(),
                            invoice != null ? invoice.getId() : null,
                            invoice != null ? invoice.getOpenedAt() : null
                    );
                })
                .toList();
    }
}