package com.sccgroup.restaurant_management.domain.repository.account;

import com.sccgroup.restaurant_management.domain.entity.account.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
}
