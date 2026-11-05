package com.sccgroup.restaurant_management.domain.repository.inventory;

import com.sccgroup.restaurant_management.domain.entity.inventory.Ingredient;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.query.Param;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {

    /** Serialize stock changes with cooking and other inventory transactions. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Ingredient i where i.id = :id")
    Optional<Ingredient> findByIdForUpdate(@Param("id") Long id);

    /**
     * Khóa toàn bộ nguyên liệu (theo thứ tự id, tránh deadlock) làm "cổng" cho việc kiểm tra + giữ chỗ khi gửi đơn,
     * để hai khách ở hai bàn khác nhau không cùng giành món cuối cùng.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Ingredient i order by i.id")
    List<Ingredient> findAllForUpdate();
}
