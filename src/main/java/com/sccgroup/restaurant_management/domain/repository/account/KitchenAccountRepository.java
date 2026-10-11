package com.sccgroup.restaurant_management.domain.repository.account;
import com.sccgroup.restaurant_management.domain.entity.account.KitchenAccount;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface KitchenAccountRepository extends JpaRepository<KitchenAccount, Long> {

    // Nạp luôn khu bếp trong cùng câu truy vấn để đăng nhập không bị LazyInitializationException
    @EntityGraph(attributePaths = "kitchenStation")
    Optional<KitchenAccount> findByUsername(String username);
}
