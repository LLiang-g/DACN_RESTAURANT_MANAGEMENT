package com.sccgroup.restaurant_management.payment.provider;

import com.sccgroup.restaurant_management.domain.entity.billing.PaymentProviderType;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransaction;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "payment.mock.enabled", havingValue = "true")
public class MockBankProvider implements PaymentProvider {
    @Override public PaymentProviderType type() { return PaymentProviderType.MOCK; }
    @Override public PaymentInitResult initiate(PaymentTransaction tx, String clientIp) {
        return new PaymentInitResult(null); // tiền "về" khi ta gọi webhook giả lập
    }
}
