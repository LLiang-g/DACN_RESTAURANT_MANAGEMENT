package com.sccgroup.restaurant_management.kds.repository;

import com.sccgroup.restaurant_management.domain.entity.account.KitchenStation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KitchenStationRepository extends JpaRepository<KitchenStation, Long> {
}
