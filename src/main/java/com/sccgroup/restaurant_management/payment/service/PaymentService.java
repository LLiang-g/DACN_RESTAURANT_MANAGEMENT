package com.sccgroup.restaurant_management.payment.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ConflictException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentProviderType;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransaction;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransactionStatus;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import com.sccgroup.restaurant_management.domain.repository.billing.PaymentTransactionRepository;
import com.sccgroup.restaurant_management.payment.provider.PaymentInitResult;
import com.sccgroup.restaurant_management.payment.provider.PaymentProvider;
import com.sccgroup.restaurant_management.payment.dto.PaymentResponse;
import com.sccgroup.restaurant_management.pos.service.PosInvoiceService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    private final PosInvoiceService posInvoiceService;
    private final InvoiceRepository invoiceRepository;
    private final PaymentTransactionRepository txRepository;
    private final Map<PaymentProviderType, PaymentProvider> providers;

    public PaymentService(PosInvoiceService posInvoiceService, InvoiceRepository invoiceRepository,
                          PaymentTransactionRepository txRepository, List<PaymentProvider> providerList) {
        this.posInvoiceService = posInvoiceService;
        this.invoiceRepository = invoiceRepository;
        this.txRepository = txRepository;
        this.providers = providerList.stream()
                .collect(Collectors.toMap(PaymentProvider::type, Function.identity()));
    }

    @Transactional
    public PaymentResponse create(Long invoiceId, PaymentProviderType type, String clientIp) {
        PaymentProvider provider = providers.get(type);
        if (provider == null) {
            throw new BusinessException("PAYMENT_PROVIDER_UNSUPPORTED", "Phương thức thanh toán không được hỗ trợ");
        }
        BigDecimal total = posInvoiceService.preparePayment(invoiceId); // khóa + kiểm tra

        var existing = txRepository.findByInvoiceIdAndStatusIn(invoiceId, com.sccgroup.restaurant_management.payment.service.UnresolvedPayments.STATUSES);
        if (!existing.isEmpty()) {
            PaymentTransaction pending = latestPending(existing);
            if (pending.getProvider() != type) {
                throw new ConflictException("PAYMENT_PENDING_EXISTS", "Hóa đơn đang chờ thanh toán bằng phương thức khác. Hãy mở lại giao dịch đang chờ.");
            }
            if (type == PaymentProviderType.VNPAY && pending.getPayUrl() == null) {
                throw new ConflictException("PAYMENT_RESUME_UNAVAILABLE", "Giao dịch cũ chưa lưu link QR. Cần kiểm tra và đối soát giao dịch; không tạo link thay thế.");
            }
            return toResponse(pending);
        }

        String txnRef = "INV" + invoiceId + "T" + System.currentTimeMillis();
        PaymentTransaction tx = txRepository.save(
                new PaymentTransaction(invoiceRepository.getReferenceById(invoiceId), type, txnRef, total));

        PaymentInitResult init = provider.initiate(tx, clientIp);
        tx.setPaymentLink(init.payUrl(), init.expiresAt());
        return toResponse(tx);
    }

    /** Dùng chung cho webhook giả lập và IPN VNPay sau này. Idempotent. */
    @Transactional
    public PaymentTransactionStatus applyResult(String txnRef, BigDecimal amount,
                                                boolean success, String providerTxnNo) {
        Long invoiceId = txRepository.findInvoiceIdByTxnRef(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch"));
        // Same order as create(): invoice first, then payment transaction.
        invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn"));
        PaymentTransaction tx = txRepository.findByTxnRefForUpdate(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch"));

        if (amount == null || tx.getAmount().compareTo(amount) != 0) {
            throw new BusinessException("PAYMENT_AMOUNT_MISMATCH", "Số tiền không khớp giao dịch");
        }
        if (tx.getStatus() == PaymentTransactionStatus.SUCCESS) {
            return tx.getStatus(); // Duplicate result: never close or charge the invoice again.
        }
        boolean waiting = tx.getStatus() == PaymentTransactionStatus.PENDING
                || tx.getStatus() == PaymentTransactionStatus.RECONCILING;
        boolean locallyExpiredSuccess = tx.getStatus() == PaymentTransactionStatus.EXPIRED && success;
        if (!waiting && !locallyExpiredSuccess) {
            if (success) {
                throw new ConflictException("PAYMENT_RESULT_CONFLICT",
                        "Giao dịch có kết quả thành công trái với trạng thái đã ghi nhận, cần đối soát.");
            }
            return tx.getStatus();
        }
        if (!success) {
            tx.setStatus(PaymentTransactionStatus.FAILED);
            return tx.getStatus();
        }

        posInvoiceService.markPaidOnline(tx.getInvoice().getId(), tx.getTxnRef(), tx.getAmount());
        tx.setStatus(PaymentTransactionStatus.SUCCESS);
        tx.setProviderTxnNo(providerTxnNo);
        tx.setPaidAt(LocalDateTime.now());
        return tx.getStatus();
    }

    @Transactional(readOnly = true)
    public PaymentResponse get(String txnRef) {
        PaymentTransaction tx = txRepository.findByTxnRef(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch"));
        return toResponse(tx);
    }

    /** Recover the persisted pending link without initiating a new provider transaction. */
    @Transactional
    public PaymentResponse getPending(Long invoiceId) {
        invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn"));
        var pending = txRepository.findByInvoiceIdAndStatusIn(invoiceId, com.sccgroup.restaurant_management.payment.service.UnresolvedPayments.STATUSES);
        return pending.isEmpty() ? null : toResponse(latestPending(pending));
    }

    private PaymentTransaction latestPending(List<PaymentTransaction> pending) {
        return pending.stream().max(java.util.Comparator.comparing(PaymentTransaction::getId)).orElseThrow();
    }

    private PaymentResponse toResponse(PaymentTransaction tx) {
        String expiry = tx.getExpiresAt() == null ? null : tx.getExpiresAt()
                .atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime().toString();
        return new PaymentResponse(tx.getTxnRef(), tx.getProvider(), tx.getAmount(), tx.getStatus(),
                tx.getStatus() == PaymentTransactionStatus.PENDING ? tx.getPayUrl() : null, expiry);
    }

    @Transactional
    public PaymentTransactionStatus mockConfirm(String txnRef) {
        // Read scalar values only, so applyResult locks and loads fresh transaction state.
        PaymentProviderType provider = txRepository.findProviderByTxnRef(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch"));
        if (provider != PaymentProviderType.MOCK) {
            throw new BusinessException("NOT_MOCK_TRANSACTION", "Chỉ giả lập được giao dịch MOCK");
        }
        BigDecimal amount = txRepository.findAmountByTxnRef(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch"));
        return applyResult(txnRef, amount, true, "MOCK-" + System.currentTimeMillis());
    }
}
