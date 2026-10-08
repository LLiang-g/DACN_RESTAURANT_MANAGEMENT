package com.sccgroup.restaurant_management.customer.service;

import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.customer.dto.CallStaffResponse;
import com.sccgroup.restaurant_management.domain.entity.floor.CallStaffRequest;
import com.sccgroup.restaurant_management.domain.entity.floor.CallStaffStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.repository.floor.CallStaffRequestRepository;
import com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** Khách bấm "Gọi nhân viên": tạo yêu cầu gắn với bàn để Lễ tân xử lý. */
@Service
public class CustomerCallStaffService {

    private final RestaurantTableRepository tableRepository;
    private final CallStaffRequestRepository requestRepository;

    public CustomerCallStaffService(RestaurantTableRepository tableRepository,
                                    CallStaffRequestRepository requestRepository) {
        this.tableRepository = tableRepository;
        this.requestRepository = requestRepository;
    }

    /** Bàn đã có yêu cầu chưa xử lý thì trả lại yêu cầu đó, không tạo trùng (chống bấm liên tục). */
    @Transactional
    public CallStaffResponse callStaff(Long tableId) {
        RestaurantTable table = tableRepository.findByIdForUpdate(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với ID " + tableId));

        return requestRepository.findFirstByTableIdAndStatusOrderByCreatedAtDesc(tableId, CallStaffStatus.PENDING)
                .map(callStaffRequest -> new CallStaffResponse(callStaffRequest.getId(), callStaffRequest.getCreatedAt(), true))
                .orElseGet(() -> {
                    CallStaffRequest callStaffRequest = requestRepository.save(new CallStaffRequest(table, LocalDateTime.now()));
                    return new CallStaffResponse(callStaffRequest.getId(), callStaffRequest.getCreatedAt(), false);
                });
    }
}
