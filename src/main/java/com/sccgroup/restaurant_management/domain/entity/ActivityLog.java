package com.sccgroup.restaurant_management.domain.entity;

import com.sccgroup.restaurant_management.domain.entity.AccountType;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_log")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id")
    private Long accountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type")
    private AccountType accountType;

    private String action;

    @Column(name = "target_type")
    private String targetType; // order / invoice / food / ingredient ...

    @Column(name = "target_id")
    private Long targetId;

    @Column(length = 500)
    private String detail;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    protected ActivityLog() {}

    public ActivityLog(Long accountId, AccountType accountType, String action,
                       String targetType, Long targetId, String detail, LocalDateTime createdAt) {
        this.accountId = accountId;
        this.accountType = accountType;
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
        this.detail = detail;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public Long getAccountId() { return accountId; }
    public AccountType getAccountType() { return accountType; }
    public String getAction() { return action; }
    public String getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public String getDetail() { return detail; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}