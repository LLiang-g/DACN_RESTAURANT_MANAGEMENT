package com.sccgroup.restaurant_management.domain.repository.billing;
import com.sccgroup.restaurant_management.domain.entity.billing.CollectionEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CollectionEntryRepository extends JpaRepository<CollectionEntry,Long>{
 Optional<CollectionEntry> findByRequestKey(String key);
 Optional<CollectionEntry> findBySourceKey(String key);
 List<CollectionEntry> findByInvoiceIdOrderByIdAsc(Long invoiceId);
}
