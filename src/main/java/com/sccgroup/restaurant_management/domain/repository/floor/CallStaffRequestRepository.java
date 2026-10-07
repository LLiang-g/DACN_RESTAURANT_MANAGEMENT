package com.sccgroup.restaurant_management.domain.repository.floor;

import com.sccgroup.restaurant_management.domain.entity.floor.CallStaffRequest;
import com.sccgroup.restaurant_management.domain.entity.floor.CallStaffStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CallStaffRequestRepository extends JpaRepository<CallStaffRequest, Long> {

    Optional<CallStaffRequest> findFirstByTableIdAndStatusOrderByCreatedAtDesc(Long tableId, CallStaffStatus status);
}
