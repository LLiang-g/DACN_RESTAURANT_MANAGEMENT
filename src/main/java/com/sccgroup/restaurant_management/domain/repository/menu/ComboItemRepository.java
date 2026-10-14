package com.sccgroup.restaurant_management.domain.repository.menu;

import com.sccgroup.restaurant_management.domain.entity.menu.ComboItem;
import com.sccgroup.restaurant_management.domain.entity.menu.ComboItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ComboItemRepository extends JpaRepository<ComboItem, ComboItemId> {

    @Query("select ci from ComboItem ci join fetch ci.food join fetch ci.combo where ci.combo.id in :comboIds")
    List<ComboItem> findByComboIds(@Param("comboIds") Collection<Long> comboIds);

    @Query("select ci from ComboItem ci join fetch ci.food join fetch ci.combo")
    List<ComboItem> findAllWithFood();
}
