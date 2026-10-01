package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.account.StaffAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminStaffAccountRepository extends JpaRepository<StaffAccount, Long> {
}
