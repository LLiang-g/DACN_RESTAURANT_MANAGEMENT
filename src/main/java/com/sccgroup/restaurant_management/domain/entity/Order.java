package com.sccgroup.restaurant_management.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_order")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    protected Order() {}

    public Order(Invoice invoice, LocalDateTime createdAt) {
        this.invoice = invoice;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public Invoice getInvoice() { return invoice; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}