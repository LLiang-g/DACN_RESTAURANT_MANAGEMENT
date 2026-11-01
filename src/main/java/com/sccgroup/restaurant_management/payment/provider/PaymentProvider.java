package com.sccgroup.restaurant_management.payment.provider;

import com.sccgroup.restaurant_management.domain.entity.billing.PaymentProviderType;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransaction;

public interface PaymentProvider {
    PaymentProviderType type();
    /** Bắt đầu một giao dịch. VNPay sẽ trả URL thanh toán, Mock trả null. */
    PaymentInitResult initiate(PaymentTransaction tx, String clientIp);
}
