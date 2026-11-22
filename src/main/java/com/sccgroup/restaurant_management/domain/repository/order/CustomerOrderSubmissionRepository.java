package com.sccgroup.restaurant_management.domain.repository.order;
import com.sccgroup.restaurant_management.domain.entity.order.CustomerOrderSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface CustomerOrderSubmissionRepository extends JpaRepository<CustomerOrderSubmission,Long> {
    Optional<CustomerOrderSubmission> findByTableIdAndRequestKey(Long tableId,String requestKey);
}
