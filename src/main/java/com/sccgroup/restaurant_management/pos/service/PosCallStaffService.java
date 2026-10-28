package com.sccgroup.restaurant_management.pos.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.common.realtime.CallStaffStatusEvent;
import com.sccgroup.restaurant_management.common.realtime.RealtimeEventPublisher;
import com.sccgroup.restaurant_management.domain.entity.floor.CallStaffRequest;
import com.sccgroup.restaurant_management.domain.entity.floor.CallStaffStatus;
import com.sccgroup.restaurant_management.domain.repository.floor.CallStaffRequestRepository;
import com.sccgroup.restaurant_management.pos.dto.CallStaffRequestResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PosCallStaffService {

    private final CallStaffRequestRepository callStaffRequestRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;

    public PosCallStaffService(CallStaffRequestRepository callStaffRequestRepository,
                               RealtimeEventPublisher realtimeEventPublisher) {
        this.callStaffRequestRepository = callStaffRequestRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    @Transactional(readOnly = true)
    public List<CallStaffRequestResponse> getPendingRequests() {
        return callStaffRequestRepository.findByStatusOrderByCreatedAtAsc(CallStaffStatus.PENDING).stream()
                .map(r -> new CallStaffRequestResponse(
                        r.getId(), r.getTable().getId(), r.getTable().getTableNumber(),
                        r.getTable().getFloor(), r.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void resolve(Long requestId) {
        CallStaffRequest request = callStaffRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu gọi nhân viên với id = " + requestId));

        if (request.getStatus() != CallStaffStatus.PENDING) {
            throw new BusinessException("CALL_STAFF_REQUEST_ALREADY_RESOLVED", "Yêu cầu này đã được xử lý trước đó");
        }

        request.setStatus(CallStaffStatus.RESOLVED);
        request.setResolvedAt(LocalDateTime.now());
        callStaffRequestRepository.save(request);

        realtimeEventPublisher.publishAfterCommit("/topic/pos",
                new CallStaffStatusEvent(request.getId(), request.getTable().getId(), CallStaffStatus.RESOLVED.name()));
    }
}