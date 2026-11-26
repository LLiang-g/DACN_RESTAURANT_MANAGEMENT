package com.sccgroup.restaurant_management.domain.entity.billing;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity
@Table(name="collection_entry",uniqueConstraints=@UniqueConstraint(columnNames="source_key"))
public class CollectionEntry {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="invoice_id",nullable=false) private Invoice invoice;
 @Column(name="source_key",nullable=false,length=160) private String sourceKey;
 @Column(name="request_key",unique=true,length=36) private String requestKey;
 @Column(name="request_hash",length=64) private String requestHash;
 public void bindRequest(String key,String hash){requestKey=key;requestHash=hash;}
 public String getRequestKey(){return requestKey;} public String getRequestHash(){return requestHash;}
 @Column(nullable=false,length=20) private String source;
 @Column(nullable=false,precision=12,scale=2) private BigDecimal amount;
 @Column(precision=12,scale=2) private BigDecimal tender;
 @Column(name="change_due",precision=12,scale=2) private BigDecimal changeDue;
 @Column(nullable=false,length=20) private String status;
 @Column(name="external_reference",length=120) private String externalReference;
 @Column(name="provider_txn_no",length=64) private String providerTxnNo;
 @Column(name="provider_confirmed",nullable=false) private boolean providerConfirmed;
 @Column(name="created_by") private Long createdBy;
 @Column(name="verified_by") private Long verifiedBy;
 @Column(name="created_at",nullable=false) private LocalDateTime createdAt;
 @Column(name="verified_at") private LocalDateTime verifiedAt;
 @Column(nullable=false,length=500) private String note;
 protected CollectionEntry(){}
 public CollectionEntry(Invoice i,String key,String source,BigDecimal amount,BigDecimal tender,BigDecimal change,String ref,String no,String note,Long actor,boolean verified){this.invoice=i;this.sourceKey=key;this.source=source;this.amount=amount;this.tender=tender;this.changeDue=change;this.externalReference=ref;this.providerTxnNo=no;this.note=note;this.createdBy=actor;this.createdAt=LocalDateTime.now();this.status="EVIDENCE";if(verified)verify(actor);}
 public void verify(Long actor){status="VERIFIED";verifiedBy=actor;verifiedAt=LocalDateTime.now();}
 public void voidEvidence(){status="VOID";}
 public void confirmProvider(String no){providerConfirmed=true;providerTxnNo=no;}
 public Long getId(){return id;} public Invoice getInvoice(){return invoice;} public String getSourceKey(){return sourceKey;} public String getSource(){return source;} public BigDecimal getAmount(){return amount;} public BigDecimal getTender(){return tender;} public BigDecimal getChangeDue(){return changeDue;} public String getStatus(){return status;} public String getExternalReference(){return externalReference;} public String getProviderTxnNo(){return providerTxnNo;} public boolean isProviderConfirmed(){return providerConfirmed;} public Long getCreatedBy(){return createdBy;} public Long getVerifiedBy(){return verifiedBy;} public LocalDateTime getCreatedAt(){return createdAt;} public LocalDateTime getVerifiedAt(){return verifiedAt;} public String getNote(){return note;}
}
