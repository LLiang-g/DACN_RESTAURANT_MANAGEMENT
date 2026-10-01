package com.sccgroup.restaurant_management.domain.entity.billing;

import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoice")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    private RestaurantTable table;

    @Enumerated(EnumType.STRING)
    private InvoiceStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod; // null cho tới khi thanh toán

    @Column(name = "amount_received", precision = 12, scale = 2)
    private BigDecimal amountReceived;

    @Column(name = "change_amount", precision = 12, scale = 2)
    private BigDecimal changeAmount;

    @Column(name = "bank_transaction_ref")
    private String bankTransactionRef;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    protected Invoice() {}

    public Invoice(RestaurantTable table, InvoiceStatus status, LocalDateTime openedAt) {
        this.table = table;
        this.status = status;
        this.openedAt = openedAt;
    }

    public Long getId() { return id; }
    public RestaurantTable getTable() { return table; }
    public InvoiceStatus getStatus() { return status; }
    public void setStatus(InvoiceStatus status) { this.status = status; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public void setAmountReceived(BigDecimal amountReceived) { this.amountReceived = amountReceived; }
    public void setChangeAmount(BigDecimal changeAmount) { this.changeAmount = changeAmount; }
    public void setBankTransactionRef(String ref) { this.bankTransactionRef = ref; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    public LocalDateTime getOpenedAt() { return openedAt; }

}