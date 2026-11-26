package com.sccgroup.restaurant_management.domain.entity.billing;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity @Table(name="collection_case",uniqueConstraints=@UniqueConstraint(columnNames="entry_id"))
public class CollectionCase {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="entry_id",nullable=false) private CollectionEntry entry;
 @Column(nullable=false,length=20) private String status;
 @Column(nullable=false,precision=12,scale=2) private BigDecimal amount;
 @Column(nullable=false,length=500) private String reason;
 @Column(name="created_at",nullable=false) private LocalDateTime createdAt;
 @Column(name="processed_by") private Long processedBy;
 @Column(name="processed_at") private LocalDateTime processedAt;
 @Column(name="completed_by") private Long completedBy;
 @Column(name="completed_at") private LocalDateTime completedAt;
 @Column(name="refund_reference",length=120) private String refundReference;
 @Column(name="completion_note",length=500) private String completionNote;
 protected CollectionCase(){}
 public CollectionCase(CollectionEntry e,BigDecimal amount,boolean review,String reason){entry=e;this.amount=amount;this.reason=reason;status=review?"REVIEW":"REQUIRED";createdAt=LocalDateTime.now();}
 public void requireRefund(BigDecimal value){status="REQUIRED";amount=value;}
 public void resolve(Long actor,String reference,String note){status="RESOLVED";completedBy=actor;completedAt=LocalDateTime.now();refundReference=reference;completionNote=note;}
 public void start(Long actor){status="PROCESSING";processedBy=actor;processedAt=LocalDateTime.now();}
 public void complete(Long actor,String reference,String note){status="COMPLETED";completedBy=actor;completedAt=LocalDateTime.now();refundReference=reference;completionNote=note;}
 public Long getId(){return id;} public CollectionEntry getEntry(){return entry;} public String getStatus(){return status;} public BigDecimal getAmount(){return amount;} public String getReason(){return reason;} public Long getProcessedBy(){return processedBy;} public Long getCompletedBy(){return completedBy;} public String getRefundReference(){return refundReference;} public String getCompletionNote(){return completionNote;} public LocalDateTime getCreatedAt(){return createdAt;} public LocalDateTime getProcessedAt(){return processedAt;} public LocalDateTime getCompletedAt(){return completedAt;}
}
