package com.sccgroup.restaurant_management.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Bật @Scheduled (dùng cho tự hủy hóa đơn rỗng sau grace period). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
