package com.sccgroup.restaurant_management.admin.security;

import com.sccgroup.restaurant_management.common.security.JwtUtil;
import com.sccgroup.restaurant_management.domain.entity.account.StaffAccount;
import com.sccgroup.restaurant_management.domain.entity.account.StaffRole;
import com.sccgroup.restaurant_management.domain.repository.AdminStaffAccountRepository;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitConfig(AdminAuthTest.Config.class)
@WebAppConfiguration
class AdminAuthTest {
    @TestConfiguration
    @EnableWebMvc
    @EnableWebSecurity
    @Import({AdminSecurityConfig.class, AdminAuthController.class, com.sccgroup.restaurant_management.config.CorsConfig.class})
    static class Config {
        @Bean AdminStaffAccountRepository accounts() { return mock(AdminStaffAccountRepository.class); }
        @Bean PasswordEncoder encoder() { return new BCryptPasswordEncoder(); }
        @Bean JwtUtil jwt() {
            JwtUtil jwt = new JwtUtil();
            ReflectionTestUtils.setField(jwt, "secret", "VGhpc0lzQVNlY3JldEtleUZvckpXVFNpZ25pbmdEb05vdFNoYXJl");
            return jwt;
        }
    }

    @Autowired WebApplicationContext context;
    @Autowired AdminStaffAccountRepository accounts;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtUtil jwt;
    MockMvc mvc;

    @BeforeEach void setup() {
        reset(accounts);
        ReflectionTestUtils.setField(jwt, "secret", "VGhpc0lzQVNlY3JldEtleUZvckpXVFNpZ25pbmdEb05vdFNoYXJl");
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", Filter.class)).build();
        when(accounts.findByUsername("admin.test")).thenReturn(Optional.of(account(StaffRole.ADMIN)));
    }

    private StaffAccount account(StaffRole role) {
        StaffAccount staff = new StaffAccount("admin.test", encoder.encode("Test@123"), role);
        ReflectionTestUtils.setField(staff, "id", 1L);
        return staff;
    }

    private String token() { return jwt.generateToken("admin.test", Map.of("role", "ADMIN", "accountType", "STAFF", "accountId", 1L)); }

    @Test void adminCanLoginWithBcrypt() throws Exception {
        mvc.perform(post("/api/admin/auth/login").contentType("application/json")
                .content("{\"username\":\" admin.test \",\"password\":\"Test@123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.username").value("admin.test"))
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test void wrongPasswordReturns401() throws Exception {
        mvc.perform(post("/api/admin/auth/login").contentType("application/json")
                .content("{\"username\":\"admin.test\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test void unknownAccountReturns401() throws Exception {
        mvc.perform(post("/api/admin/auth/login").contentType("application/json")
                .content("{\"username\":\"missing\",\"password\":\"Test@123\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test void receptionistCannotLoginToAdmin() throws Exception {
        when(accounts.findByUsername("admin.test")).thenReturn(Optional.of(account(StaffRole.RECEPTIONIST)));
        mvc.perform(post("/api/admin/auth/login").contentType("application/json")
                .content("{\"username\":\"admin.test\",\"password\":\"Test@123\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test void emptyInputReturns400() throws Exception {
        mvc.perform(post("/api/admin/auth/login").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test void kitchenTokenCannotImpersonateSameNamedAdmin() throws Exception {
        String token = jwt.generateToken("admin.test", Map.of("accountType", "KITCHEN", "accountId", 1L));
        mvc.perform(get("/api/admin/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test void recreatedAccountCannotReuseOldToken() throws Exception {
        String token = jwt.generateToken("admin.test", Map.of("accountType", "STAFF", "accountId", 99L));
        mvc.perform(get("/api/admin/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test void adminLoginSupportsFrontendCorsPreflight() throws Exception {
        mvc.perform(options("/api/admin/auth/login")
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test void missingTokenReturns401() throws Exception {
        mvc.perform(get("/api/admin/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test void invalidTokenReturns401() throws Exception {
        mvc.perform(get("/api/admin/auth/me").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
    }

    @Test void validTokenReturnsCurrentAdmin() throws Exception {
        mvc.perform(get("/api/admin/auth/me").header("Authorization", "Bearer " + token()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("admin.test"));
    }

    @Test void deletedAccountCannotReuseToken() throws Exception {
        when(accounts.findByUsername("admin.test")).thenReturn(Optional.empty());
        mvc.perform(get("/api/admin/auth/me").header("Authorization", "Bearer " + token()))
                .andExpect(status().isUnauthorized());
    }

    @Test void downgradedAccountCannotReuseToken() throws Exception {
        when(accounts.findByUsername("admin.test")).thenReturn(Optional.of(account(StaffRole.RECEPTIONIST)));
        mvc.perform(get("/api/admin/auth/me").header("Authorization", "Bearer " + token()))
                .andExpect(status().isForbidden());
    }
}
