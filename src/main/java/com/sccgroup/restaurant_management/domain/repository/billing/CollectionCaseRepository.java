package com.sccgroup.restaurant_management.domain.repository.billing;
import com.sccgroup.restaurant_management.domain.entity.billing.CollectionCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.*;
public interface CollectionCaseRepository extends JpaRepository<CollectionCase,Long>{
 @Query("select c.entry.invoice.id from CollectionCase c where c.id=:id") Optional<Long> invoiceId(Long id);
 Optional<CollectionCase> findByEntryId(Long id);
 @Query("select c from CollectionCase c join fetch c.entry e join fetch e.invoice i where i.id=:invoiceId order by c.id desc")
 List<CollectionCase> forInvoice(Long invoiceId);
 @Query("select c from CollectionCase c join fetch c.entry e join fetch e.invoice i where c.status not in ('COMPLETED','RESOLVED') order by c.id desc")
 List<CollectionCase> openCases(org.springframework.data.domain.Pageable page);
}
