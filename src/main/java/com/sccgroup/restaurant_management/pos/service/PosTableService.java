package com.sccgroup.restaurant_management.pos.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.common.realtime.RealtimeEventPublisher;
import com.sccgroup.restaurant_management.common.realtime.TableStatusEvent;
import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.entity.floor.TableStatus;
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
    private final RealtimeEventPublisher realtimeEventPublisher;
    public PosTableService(RestaurantTableRepository restaurantTableRepository,
                           InvoiceRepository invoiceRepository,
                           RealtimeEventPublisher realtimeEventPublisher) {
        this.restaurantTableRepository = restaurantTableRepository;
        this.invoiceRepository = invoiceRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    @Transactional(readOnly = true)
    public List<TableOverviewResponse> getTableOverview() {
        List<RestaurantTable> tables = restaurantTableRepository.findAll();

        // Chỉ cần tìm hóa đơn cho các bàn đang SERVING — bàn AVAILABLE không cần link hóa đơn
        List<Long> servingTableIds = tables.stream()
                .filter(t -> t.getStatus() == TableStatus.SERVING)
                .map(RestaurantTable::getId)
                .toList();

        // Lấy hóa đơn GẦN NHẤT của mỗi bàn (bất kể OPEN hay đã PAID/CANCELLED) —
        // khác với trước đây chỉ lấy hóa đơn OPEN, vì giờ hóa đơn có thể đã PAID
        // mà bàn vẫn SERVING (còn món dở dang), lễ tân vẫn cần bấm vào xem được.
        Map<Long, Invoice> latestInvoiceByTableId = servingTableIds.isEmpty()
                ? Map.of()
                : invoiceRepository.findLatestByTableIdsOrderByIdDesc(servingTableIds).stream()
                .collect(Collectors.toMap(
                        inv -> inv.getTable().getId(),
                        inv -> inv,
                        (first, second) -> first // đã order by id desc -> bản ghi gặp đầu tiên là mới nhất
                ));

        return tables.stream()
                .sorted(Comparator.comparing(RestaurantTable::getFloor)
                        .thenComparing(RestaurantTable::getTableNumber))
                .map(table -> {
                    Invoice invoice = latestInvoiceByTableId.get(table.getId());
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

    // Method mới — lễ tân chủ động đưa bàn về Trống, KHÔNG phụ thuộc trạng thái hóa đơn/món.
    // Cố ý không kiểm tra gì thêm — đây là "cửa thoát" thủ công cho các trường hợp đặc biệt
    // (khách rời đi đột xuất, sai sót dữ liệu...) nên để lễ tân tự chịu trách nhiệm quyết định.
    // nếu bàn còn hóa đơn mà hủy thì báo lỗi
    @Transactional
    public void freeTable(Long tableId) {
        RestaurantTable table = restaurantTableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với id = " + tableId));

        boolean hasOpenInvoice = invoiceRepository.findByTableAndStatus(table, InvoiceStatus.OPEN).isPresent();
        if (hasOpenInvoice) {
            throw new BusinessException("TABLE_HAS_OPEN_INVOICE",
                    "Bàn này còn hóa đơn chưa thanh toán, không thể đưa về Trống");
        }

        table.setStatus(TableStatus.AVAILABLE);
        restaurantTableRepository.save(table);

        realtimeEventPublisher.publishAfterCommit(
                "/topic/pos",
                new TableStatusEvent(table.getId(), TableStatus.AVAILABLE.name())
        );
    }
}