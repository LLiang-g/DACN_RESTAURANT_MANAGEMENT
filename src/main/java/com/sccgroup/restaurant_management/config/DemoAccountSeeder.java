package com.sccgroup.restaurant_management.config;

import com.sccgroup.restaurant_management.domain.entity.account.StaffAccount;
import com.sccgroup.restaurant_management.domain.entity.account.StaffRole;
import com.sccgroup.restaurant_management.domain.repository.account.KitchenAccountRepository;
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
            KitchenAccountRepository kitchenAccounts,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.demo-accounts.enabled:false}") boolean enabled,
            @Value("${app.seed.demo-accounts.admin-password:}") String adminPassword,
            @Value("${app.seed.demo-accounts.manager-password:}") String managerPassword,
            @Value("${app.seed.demo-accounts.kitchen-password:}") String kitchenPassword) {
        return args -> {
            if (!enabled) {
                log.info("Demo account seeding is disabled.");
                return;
            }

            if (adminPassword.isBlank() || managerPassword.isBlank() || kitchenPassword.isBlank()) {
                throw new IllegalStateException("Set all DEMO_*_PASSWORD variables before enabling demo accounts");
            }

            seed(staffAccounts, passwordEncoder, "ADMIN", adminPassword, StaffRole.ADMIN);
            seed(staffAccounts, passwordEncoder, "admin", adminPassword, StaffRole.ADMIN);
            seed(staffAccounts, passwordEncoder, "admin.demo", adminPassword, StaffRole.ADMIN);
            seed(staffAccounts, passwordEncoder, "admin.test", adminPassword, StaffRole.ADMIN);
            seed(staffAccounts, passwordEncoder, "manager.demo", managerPassword, StaffRole.RECEPTIONIST);
            seed(staffAccounts, passwordEncoder, "manager.test", managerPassword, StaffRole.RECEPTIONIST);
            seed(staffAccounts, passwordEncoder, "letan01", managerPassword, StaffRole.RECEPTIONIST);

            for (var k : kitchenAccounts.findAll()) {
                if (k.getPasswordHash() != null && k.getPasswordHash().startsWith("$2b$12$DEMO_HASH_")) {
                    k.setPasswordHash(passwordEncoder.encode(kitchenPassword));
                    kitchenAccounts.save(k);
                    log.info("Updated placeholder password for kitchen account '{}'.", k.getUsername());
                }
            }
        };
    }

    private void seed(
            StaffAccountRepository staffAccounts,
            PasswordEncoder passwordEncoder,
            String username,
            String password,
            StaffRole role) {
        var existing = staffAccounts.findByUsername(username);
        if (existing.isPresent()) {
            StaffAccount acc = existing.get();
            if (acc.getPasswordHash() == null || acc.getPasswordHash().startsWith("$2b$12$DEMO_HASH_")) {
                acc.setPasswordHash(passwordEncoder.encode(password));
                acc.setRole(role);
                staffAccounts.save(acc);
                log.info("Overwrote placeholder password for demo account '{}'.", username);
            } else {
                log.info("Demo account '{}' already exists; leaving it unchanged.", username);
            }
            return;
        }

        staffAccounts.save(new StaffAccount(username, passwordEncoder.encode(password), role));
        log.info("Created demo account '{}' with role {}.", username, role);
    }
}
