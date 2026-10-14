package com.sccgroup.restaurant_management.domain.repository.menu;

import com.sccgroup.restaurant_management.domain.entity.menu.Combo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComboRepository extends JpaRepository<Combo, Long> {
}
