package com.sccgroup.restaurant_management.payment.service;

import com.sccgroup.restaurant_management.common.exception.ConflictException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import com.sccgroup.restaurant_management.domain.repository.billing.PaymentTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Invoice lock is retained by the caller until the whole mutation commits. */
@Service
public class InvoiceMutationGuard {
    private final CollectionService collection;
    private final InvoiceRepository invoices;
    private final PaymentTransactionRepository payments;

    public InvoiceMutationGuard(InvoiceRepository invoices, PaymentTransactionRepository payments, CollectionService collection) {
        this.collection=collection;
        this.invoices = invoices;
        this.payments = payments;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Invoice lockForMutation(Long invoiceId) {
        Invoice invoice = invoices.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn"));
        // Scalar read avoids a previously cached Invoice carrying an outdated status.
        InvoiceStatus status = invoices.findStatusById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn"));
        if (status != InvoiceStatus.OPEN) {
            throw new ConflictException("INVOICE_NOT_OPEN", "Hóa đơn không còn mở, không thể thay đổi món");
        }
        // Payment create/IPN/QueryDR take the same invoice lock before changing payment state.
        if (collection.hasEntries(invoiceId) || !payments.findByInvoiceIdAndStatusIn(invoiceId, UnresolvedPayments.STATUSES).isEmpty()) {
            throw new ConflictException("INVOICE_PAYMENT_PENDING",
                    "Hóa đơn đang chờ thanh toán hoặc đối soát, chưa thể hủy, trả hay thay đổi món");
        }
        return invoice;
    }
}
