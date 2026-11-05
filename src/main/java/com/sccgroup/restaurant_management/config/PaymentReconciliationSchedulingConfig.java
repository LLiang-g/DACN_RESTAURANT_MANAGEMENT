package com.sccgroup.restaurant_management.config;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
@Configuration
@ConditionalOnProperty(name="vnpay.enabled",havingValue="true")
public class PaymentReconciliationSchedulingConfig {
    @Bean(name="paymentReconciliationScheduler")
    ThreadPoolTaskScheduler paymentReconciliationScheduler(){return scheduler("payment-query-",1);}
    // Preserve a default scheduler for existing jobs, separate from network reconciliation work.
    @Bean(name="taskScheduler")
    ThreadPoolTaskScheduler taskScheduler(){return scheduler("app-scheduled-",2);}
    private ThreadPoolTaskScheduler scheduler(String prefix,int size){
        var scheduler=new ThreadPoolTaskScheduler();scheduler.setPoolSize(size);scheduler.setThreadNamePrefix(prefix);scheduler.setDaemon(true);return scheduler;
    }
}
