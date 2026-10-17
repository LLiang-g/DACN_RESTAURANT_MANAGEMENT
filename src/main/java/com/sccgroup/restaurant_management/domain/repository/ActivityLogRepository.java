package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.account.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

@org.springframework.stereotype.Repository("adminActivityLogRepository")
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
}
