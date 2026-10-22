package com.sccgroup.restaurant_management.admin.security;

import com.sccgroup.restaurant_management.common.security.AppUserPrincipal;
import com.sccgroup.restaurant_management.common.security.JwtUtil;
import com.sccgroup.restaurant_management.domain.entity.account.StaffRole;
import com.sccgroup.restaurant_management.domain.repository.AdminStaffAccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Configuration
public class AdminSecurityConfig {
    @Bean
    @Order(1)
    SecurityFilterChain adminSecurityFilterChain(HttpSecurity http, JwtUtil jwt,
                                                AdminStaffAccountRepository accounts) throws Exception {
        return http.securityMatcher("/api/admin/**")
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/admin/auth/login").permitAll()
                        .anyRequest().hasRole("ADMIN"))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((req, res, ex) -> error(res, 401, "Vui lòng đăng nhập lại"))
                        .accessDeniedHandler((req, res, ex) -> error(res, 403, "Tài khoản không có quyền quản trị viên")))
                .addFilterBefore(new OncePerRequestFilter() {
                    @Override
                    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                                    FilterChain chain) throws ServletException, IOException {
                        if (req.getServletPath().equals("/api/admin/auth/login")) {
                            chain.doFilter(req, res);
                            return;
                        }
                        String header = req.getHeader("Authorization");
                        if (header != null && header.startsWith("Bearer ")) {
                            String token = header.substring(7);
                            if (!jwt.isValid(token)) {
                                error(res, 401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
                                return;
                            }
                            var claims = jwt.extractClaims(token);
                            if (!"STAFF".equals(claims.get("accountType"))) {
                                error(res, 403, "Tài khoản không có quyền quản trị viên");
                                return;
                            }
                            var account = accounts.findByUsername(jwt.extractUsername(token));
                            if (account.isEmpty()) {
                                error(res, 401, "Tài khoản không còn tồn tại");
                                return;
                            }
                            var staff = account.get();
                            Object accountId = claims.get("accountId");
                            if (!(accountId instanceof Number id) || id.longValue() != staff.getId()) {
                                error(res, 401, "Phiên đăng nhập không còn hợp lệ");
                                return;
                            }
                            if (staff.getRole() != StaffRole.ADMIN) {
                                error(res, 403, "Tài khoản không có quyền quản trị viên");
                                return;
                            }
                            var principal = new AppUserPrincipal(staff.getId(), staff.getUsername(),
                                    staff.getPasswordHash(), "STAFF", "ADMIN");
                            SecurityContextHolder.getContext().setAuthentication(
                                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
                        }
                        chain.doFilter(req, res);
                    }
                }, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    private static void error(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
