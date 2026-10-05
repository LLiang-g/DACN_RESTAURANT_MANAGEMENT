package com.sccgroup.restaurant_management.domain.repository.account;
import com.sccgroup.restaurant_management.domain.entity.account.StaffAccount;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StaffAccountRepository extends JpaRepository<StaffAccount, Long> {
    Optional<StaffAccount> findByUsername(String username);
}