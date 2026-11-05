package com.sccgroup.restaurant_management.payment.provider;
import java.math.BigDecimal;
public record VnPayQueryResult(Outcome outcome, String code, BigDecimal amount, String providerTxnNo) {
    public enum Outcome { SUCCESS, FAILED, UNKNOWN }
    public static VnPayQueryResult unknown(String code) { return new VnPayQueryResult(Outcome.UNKNOWN, code, null, null); }
}
