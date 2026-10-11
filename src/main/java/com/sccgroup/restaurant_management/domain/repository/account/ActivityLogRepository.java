package com.sccgroup.restaurant_management.domain.repository.account;

import com.sccgroup.restaurant_management.domain.entity.account.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

// Chỉ thêm file này nếu dự án CHƯA có ActivityLogRepository (có rồi thì bỏ qua, dùng file của nhóm)
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
}
