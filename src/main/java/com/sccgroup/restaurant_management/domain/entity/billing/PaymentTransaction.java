package com.sccgroup.restaurant_management.domain.entity.billing;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transaction")
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentProviderType provider;

    /** Mã giao dịch phía hệ thống mình, gửi cho đối tác, phải duy nhất. */
    @Column(name = "txn_ref", nullable = false, unique = true, length = 64)
    private String txnRef;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentTransactionStatus status;

    /** Mã giao dịch phía đối tác (vnp_TransactionNo...). */
    @Column(name = "provider_txn_no", length = 64)
    private String providerTxnNo;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    protected PaymentTransaction() {}

    public PaymentTransaction(Invoice invoice, PaymentProviderType provider, String txnRef, BigDecimal amount) {
        this.invoice = invoice;
        this.provider = provider;
        this.txnRef = txnRef;
        this.amount = amount;
        this.status = PaymentTransactionStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Invoice getInvoice() { return invoice; }
    public PaymentProviderType getProvider() { return provider; }
    public String getTxnRef() { return txnRef; }
    public BigDecimal getAmount() { return amount; }
    public PaymentTransactionStatus getStatus() { return status; }
    public String getProviderTxnNo() { return providerTxnNo; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setStatus(PaymentTransactionStatus status) { this.status = status; }
    public void setProviderTxnNo(String no) { this.providerTxnNo = no; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
}