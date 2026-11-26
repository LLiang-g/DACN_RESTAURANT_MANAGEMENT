package com.sccgroup.restaurant_management.payment.service;
import java.math.BigDecimal;
public final class CollectionMath {
 private CollectionMath(){}
 public static BigDecimal balance(BigDecimal total,BigDecimal received){return total.subtract(received).max(BigDecimal.ZERO);}
 public static BigDecimal excess(BigDecimal total,BigDecimal before,BigDecimal added){return added.subtract(balance(total,before)).max(BigDecimal.ZERO);}
 public static BigDecimal cashAccepted(BigDecimal total,BigDecimal before,BigDecimal tender){return tender.min(balance(total,before));}
}
