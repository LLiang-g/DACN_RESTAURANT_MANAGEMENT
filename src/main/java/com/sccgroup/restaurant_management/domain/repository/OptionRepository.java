package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.menu.Option;
import org.springframework.data.jpa.repository.JpaRepository;

@org.springframework.stereotype.Repository("adminOptionRepository")
public interface OptionRepository extends JpaRepository<Option, Long> {
}
