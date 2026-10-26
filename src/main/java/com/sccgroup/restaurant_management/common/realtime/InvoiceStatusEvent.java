package com.sccgroup.restaurant_management.common.realtime;

public record InvoiceStatusEvent(
        Long invoiceId,
        Long tableId,
        String status
) {}