package com.sccgroup.restaurant_management.common.realtime;

public record CallStaffStatusEvent(Long requestId, Long tableId, String status) {}