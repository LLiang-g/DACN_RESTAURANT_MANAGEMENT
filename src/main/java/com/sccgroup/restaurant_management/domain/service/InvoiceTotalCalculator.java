package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.order.OrderCombo;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Shared arithmetic only; no database access and no payment state changes. */
public final class InvoiceTotalCalculator {
    private InvoiceTotalCalculator() {}

    /** Customer preview still includes items waiting for POS approval. */
    public static BigDecimal previewTotal(List<OrderItem> items, List<OrderCombo> combos) {
        return total(items, combos, true);
    }

    /** POS payable total excludes pending items and incompletely reviewed combos. */
    public static BigDecimal confirmedTotal(List<OrderItem> items, List<OrderCombo> combos) {
        return total(items, combos, false);
    }

    public static BigDecimal comboPreviewTotal(OrderCombo combo, List<OrderItem> children) {
        return comboTotal(combo, children, true);
    }

    public static BigDecimal comboConfirmedTotal(OrderCombo combo, List<OrderItem> children) {
        return comboTotal(combo, children, false);
    }

    private static BigDecimal total(List<OrderItem> items, List<OrderCombo> combos, boolean includePending) {
        Map<Long, List<OrderItem>> children = items.stream()
                .filter(item -> item.getOrderCombo() != null)
                .collect(Collectors.groupingBy(item -> item.getOrderCombo().getId()));
        BigDecimal singles = items.stream()
                .filter(item -> item.getOrderCombo() == null && included(item, includePending))
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal bundles = combos.stream()
                .map(combo -> comboTotal(combo, children.getOrDefault(combo.getId(), List.of()), includePending))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return singles.add(bundles);
    }

    public record ComboAmounts(BigDecimal baseTotal, BigDecimal removedDeduction,
                               BigDecimal optionSurcharge, BigDecimal lineTotal) {}

    public static ComboAmounts comboPreviewAmounts(OrderCombo combo, List<OrderItem> children) {
        return comboAmounts(combo, children, true);
    }

    private static BigDecimal comboTotal(OrderCombo combo, List<OrderItem> children, boolean includePending) {
        return comboAmounts(combo, children, includePending).lineTotal();
    }

    private static ComboAmounts comboAmounts(OrderCombo combo, List<OrderItem> children, boolean includePending) {
        if (children.stream().noneMatch(item -> included(item, includePending)))
            return new ComboAmounts(BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO);
        if (!includePending && children.stream().anyMatch(item -> item.getStatus() == OrderItemStatus.PENDING)) {
            return new ComboAmounts(BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO);
        }
        BigDecimal base = combo.getComboPrice().multiply(BigDecimal.valueOf(combo.getQuantity()));
        // Preserve the existing POS deduction rule. Historical price snapshots are a separate fix.
        BigDecimal deduction = children.stream()
                .filter(InvoiceTotalCalculator::inactive)
                .map(item -> item.getFood().getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        // For combo children, unitPrice stores only the option surcharge, not the base food price.
        BigDecimal options = children.stream().filter(item -> included(item, includePending))
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new ComboAmounts(base, deduction.min(base), options, base.subtract(deduction).max(BigDecimal.ZERO).add(options));
    }

    private static boolean inactive(OrderItem item) {
        return item.getStatus() == OrderItemStatus.REJECTED || item.getStatus() == OrderItemStatus.RETURNED;
    }

    private static boolean included(OrderItem item, boolean includePending) {
        return !inactive(item) && (includePending || item.getStatus() != OrderItemStatus.PENDING);
    }
}
