package com.sccgroup.restaurant_management.domain.entity.floor;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "call_staff_request")
public class CallStaffRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    private RestaurantTable table;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt; // NULL = chưa xử lý

    @Enumerated(EnumType.STRING)
    private CallStaffStatus status;

    protected CallStaffRequest() {}

    public CallStaffRequest(RestaurantTable table, LocalDateTime createdAt) {
        this.table = table;
        this.createdAt = createdAt;
        this.status = CallStaffStatus.PENDING;
    }

    public Long getId() { return id; }
    public RestaurantTable getTable() { return table; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime t) { this.resolvedAt = t; }
    public CallStaffStatus getStatus() { return status; }
    public void setStatus(CallStaffStatus status) { this.status = status; }
}