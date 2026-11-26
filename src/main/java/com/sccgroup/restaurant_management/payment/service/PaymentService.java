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
    private final CollectionService collection;
    private final InvoiceRepository invoiceRepository;
    private final PaymentTransactionRepository txRepository;
    private final Map<PaymentProviderType, PaymentProvider> providers;

    public PaymentService(PosInvoiceService posInvoiceService, InvoiceRepository invoiceRepository,
                          PaymentTransactionRepository txRepository, List<PaymentProvider> providerList, CollectionService collection) {
        this.collection = collection;
        this.posInvoiceService = posInvoiceService;
        this.invoiceRepository = invoiceRepository;
        this.txRepository = txRepository;
        this.providers = providerList.stream()
                .collect(Collectors.toMap(PaymentProvider::type, Function.identity()));
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PaymentResponse create(Long invoiceId, PaymentProviderType type, String clientIp) {
        PaymentProvider provider = providers.get(type);
        if (provider == null) {
            throw new BusinessException("PAYMENT_PROVIDER_UNSUPPORTED", "Phương thức thanh toán không được hỗ trợ");
        }
        BigDecimal total = collection.prepare(invoiceRepository.findByIdForUpdate(invoiceId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn")));

        var existing = txRepository.findByInvoiceIdAndStatusIn(invoiceId, com.sccgroup.restaurant_management.payment.service.UnresolvedPayments.STATUSES);
        if (!existing.isEmpty() && existing.stream().anyMatch(tx -> tx.getStatus() == PaymentTransactionStatus.PENDING && (tx.getExpiresAt() == null || tx.getExpiresAt().isAfter(LocalDateTime.now())))) {
            PaymentTransaction pending = latestPending(existing.stream().filter(tx -> tx.getStatus() == PaymentTransactionStatus.PENDING && (tx.getExpiresAt() == null || tx.getExpiresAt().isAfter(LocalDateTime.now()))).toList());
            if (pending.getProvider() != type) {
                throw new ConflictException("PAYMENT_PENDING_EXISTS", "Hóa đơn đang chờ thanh toán bằng phương thức khác. Hãy mở lại giao dịch đang chờ.");
            }
            if (type == PaymentProviderType.VNPAY && pending.getPayUrl() == null) {
                throw new ConflictException("PAYMENT_RESUME_UNAVAILABLE", "Giao dịch cũ chưa lưu link QR. Cần kiểm tra và đối soát giao dịch; không tạo link thay thế.");
            }
            if (pending.getAmount().compareTo(total)==0) return toResponse(pending);
        }

        String txnRef = "INV" + invoiceId + "T" + java.util.UUID.randomUUID().toString().replace("-", "");
        PaymentTransaction tx = txRepository.save(
                new PaymentTransaction(invoiceRepository.getReferenceById(invoiceId), type, txnRef, total));

        PaymentInitResult init = provider.initiate(tx, clientIp);
        tx.setPaymentLink(init.payUrl(), init.expiresAt());
        return toResponse(tx);
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PaymentResponse replace(Long invoiceId,String previousRef,String clientIp) {
        var invoice=invoiceRepository.findByIdForUpdate(invoiceId).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hóa đơn"));
        BigDecimal due=collection.prepare(invoice);
        var old=txRepository.findByTxnRefForUpdate(previousRef).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy QR cũ"));
        if(!old.getInvoice().getId().equals(invoiceId))throw new ConflictException("PAYMENT_INVOICE_MISMATCH","QR không thuộc hóa đơn");
        var newer=txRepository.findByInvoiceIdOrderByIdDesc(invoiceId).stream().filter(x->x.getId()>old.getId()).findFirst();
        if(newer.isPresent())return toResponse(newer.get());
        if(old.getAmount().compareTo(due)==0 && (old.getExpiresAt()==null||old.getExpiresAt().isAfter(LocalDateTime.now())))throw new ConflictException("PAYMENT_NOT_EXPIRED","QR chưa hết hạn; tiếp tục dùng mã hiện tại");
        return create(invoiceId,old.getProvider(),clientIp);
    }

    /** Dùng chung cho webhook giả lập và IPN VNPay sau này. Idempotent. */
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
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
        boolean locallyExpiredSuccess = success && (tx.getStatus() == PaymentTransactionStatus.EXPIRED || tx.getStatus() == PaymentTransactionStatus.FAILED);
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

        collection.providerSuccess(tx, providerTxnNo);
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
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PaymentResponse getPending(Long invoiceId) {
        invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn"));
        if (invoiceRepository.findStatusById(invoiceId).orElse(null) != com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus.OPEN) return null;
        var pending = txRepository.findByInvoiceIdAndStatusIn(invoiceId, com.sccgroup.restaurant_management.payment.service.UnresolvedPayments.STATUSES);
        return pending.isEmpty() ? null : toResponse(latestPending(pending));
    }

    @Transactional(readOnly=true)
    public List<PaymentResponse> history(Long invoiceId){return txRepository.findByInvoiceIdOrderByIdDesc(invoiceId).stream().map(this::toResponse).toList();}

    private PaymentTransaction latestPending(List<PaymentTransaction> pending) {
        return pending.stream().max(java.util.Comparator.comparing(PaymentTransaction::getId)).orElseThrow();
    }

    private PaymentResponse toResponse(PaymentTransaction tx) {
        String expiry = tx.getExpiresAt() == null ? null : tx.getExpiresAt()
                .atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime().toString();
        return new PaymentResponse(tx.getTxnRef(), tx.getProvider(), tx.getAmount(), tx.getStatus(),
                tx.getStatus() == PaymentTransactionStatus.PENDING && (tx.getExpiresAt() == null || tx.getExpiresAt().isAfter(LocalDateTime.now())) && tx.getInvoice().getStatus() == com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus.OPEN && tx.getAmount().compareTo(collection.summary(tx.getInvoice().getId()).remaining())==0 ? tx.getPayUrl() : null, expiry);
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
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
