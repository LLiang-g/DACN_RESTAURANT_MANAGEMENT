package com.sccgroup.restaurant_management.payment.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
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

        // Mỗi hóa đơn chỉ giữ một giao dịch đang chờ: các giao dịch cũ coi như hết hạn.
        txRepository.findByInvoiceIdAndStatus(invoiceId, PaymentTransactionStatus.PENDING)
                .forEach(t -> t.setStatus(PaymentTransactionStatus.EXPIRED));

        String txnRef = "INV" + invoiceId + "T" + System.currentTimeMillis();
        PaymentTransaction tx = txRepository.save(
                new PaymentTransaction(invoiceRepository.getReferenceById(invoiceId), type, txnRef, total));

        PaymentInitResult init = provider.initiate(tx, clientIp);
        return new PaymentResponse(tx.getTxnRef(), type, tx.getAmount(), tx.getStatus(), init.payUrl());
    }

    /** Dùng chung cho webhook giả lập và IPN VNPay sau này. Idempotent. */
    @Transactional
    public PaymentTransactionStatus applyResult(String txnRef, BigDecimal amount,
                                                boolean success, String providerTxnNo) {
        PaymentTransaction tx = txRepository.findByTxnRefForUpdate(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch"));

        if (tx.getStatus() != PaymentTransactionStatus.PENDING) {
            return tx.getStatus(); // đã xử lý rồi (bị gọi lại): không làm gì thêm
        }
        if (tx.getAmount().compareTo(amount) != 0) {
            throw new BusinessException("PAYMENT_AMOUNT_MISMATCH", "Số tiền không khớp giao dịch");
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
        return new PaymentResponse(tx.getTxnRef(), tx.getProvider(), tx.getAmount(), tx.getStatus(), null);
    }

    @Transactional
    public PaymentTransactionStatus mockConfirm(String txnRef) {
        PaymentTransaction tx = txRepository.findByTxnRef(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch"));
        if (tx.getProvider() != PaymentProviderType.MOCK) {
            throw new BusinessException("NOT_MOCK_TRANSACTION", "Chỉ giả lập được giao dịch MOCK");
        }
        return applyResult(txnRef, tx.getAmount(), true, "MOCK-" + System.currentTimeMillis());
    }
}
