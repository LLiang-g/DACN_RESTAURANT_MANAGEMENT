package com.sccgroup.restaurant_management.domain.repository.floor;

import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, Long> {

    /**
     * Khóa dòng bàn (SELECT ... FOR UPDATE) để 2 khách cùng bàn gửi đơn đồng thời
     * không tạo ra 2 hóa đơn OPEN cho cùng một bàn.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from RestaurantTable t where t.id = :id")
    Optional<RestaurantTable> findByIdForUpdate(@Param("id") Long id);



}
