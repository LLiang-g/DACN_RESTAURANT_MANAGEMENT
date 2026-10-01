package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.menu.ComboItem;
import com.sccgroup.restaurant_management.domain.entity.menu.ComboItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComboItemRepository extends JpaRepository<ComboItem, ComboItemId> {
    List<ComboItem> findByComboId(Long comboId);
}
