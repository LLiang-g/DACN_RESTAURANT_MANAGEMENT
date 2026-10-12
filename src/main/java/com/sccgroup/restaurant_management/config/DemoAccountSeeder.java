package com.sccgroup.restaurant_management.config;

import com.sccgroup.restaurant_management.domain.entity.account.StaffAccount;
import com.sccgroup.restaurant_management.domain.entity.account.StaffRole;
import com.sccgroup.restaurant_management.domain.repository.account.StaffAccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DemoAccountSeeder {
    private static final Logger log = LoggerFactory.getLogger(DemoAccountSeeder.class);

    @Bean
    CommandLineRunner seedDemoAccounts(
            StaffAccountRepository staffAccounts,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.demo-accounts.enabled:true}") boolean enabled,
            @Value("${app.seed.demo-accounts.admin-password:Admin@123}") String adminPassword,
            @Value("${app.seed.demo-accounts.manager-password:Manager@123}") String managerPassword) {
        return args -> {
            if (!enabled) {
                log.info("Demo account seeding is disabled.");
                return;
            }

            seed(staffAccounts, passwordEncoder, "admin.demo", adminPassword, StaffRole.ADMIN);
            seed(staffAccounts, passwordEncoder, "admin.test", adminPassword, StaffRole.ADMIN);
            seed(staffAccounts, passwordEncoder, "manager.demo", managerPassword, StaffRole.LE_TAN);
            seed(staffAccounts, passwordEncoder, "manager.test", managerPassword, StaffRole.LE_TAN);
        };
    }

    private void seed(
            StaffAccountRepository staffAccounts,
            PasswordEncoder passwordEncoder,
            String username,
            String password,
            StaffRole role) {
        if (staffAccounts.findByUsername(username).isPresent()) {
            log.info("Demo account '{}' already exists; leaving it unchanged.", username);
            return;
        }

        staffAccounts.save(new StaffAccount(username, passwordEncoder.encode(password), role));
        log.info("Created demo account '{}' with role {}.", username, role);
    }
}
