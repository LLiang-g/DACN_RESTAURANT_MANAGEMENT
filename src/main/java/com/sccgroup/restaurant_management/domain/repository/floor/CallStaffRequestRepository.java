package com.sccgroup.restaurant_management.domain.repository.floor;

import com.sccgroup.restaurant_management.domain.entity.floor.CallStaffRequest;
import com.sccgroup.restaurant_management.domain.entity.floor.CallStaffStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CallStaffRequestRepository extends JpaRepository<CallStaffRequest, Long> {

    Optional<CallStaffRequest> findFirstByTableIdAndStatusOrderByCreatedAtDesc(Long tableId, CallStaffStatus status);

    @Query("select r from CallStaffRequest r join fetch r.table t where r.status = :status order by r.createdAt asc")
    List<CallStaffRequest> findByStatusOrderByCreatedAtAsc(@Param("status") CallStaffStatus status);
}