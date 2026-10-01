package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.menu.OptionGroup;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OptionGroupRepository extends JpaRepository<OptionGroup, Long> {
}
