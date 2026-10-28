package com.sccgroup.restaurant_management.admin.security;

import com.sccgroup.restaurant_management.common.exception.ErrorResponse;
import com.sccgroup.restaurant_management.common.security.AppUserPrincipal;
import com.sccgroup.restaurant_management.common.security.JwtUtil;
import com.sccgroup.restaurant_management.domain.entity.account.StaffRole;
import com.sccgroup.restaurant_management.domain.repository.AdminStaffAccountRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {
    private final AdminStaffAccountRepository accounts;
    private final PasswordEncoder encoder;
    private final JwtUtil jwt;
    private final String dummyHash;

    public AdminAuthController(AdminStaffAccountRepository accounts, PasswordEncoder encoder, JwtUtil jwt) {
        this.accounts = accounts;
        this.encoder = encoder;
        this.jwt = jwt;
        this.dummyHash = encoder.encode("admin-login-timing-placeholder");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Credentials request) {
        if (request.username() == null || request.username().isBlank()
                || request.password() == null || request.password().isEmpty()
                || request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_INPUT", "Vui lòng nhập tên đăng nhập và mật khẩu hợp lệ"));
        }
        var account = accounts.findByUsername(request.username().trim());
        String hash = account.map(a -> a.getPasswordHash()).orElse(dummyHash);
        boolean matches = encoder.matches(request.password(), hash == null ? dummyHash : hash);
        if (account.isEmpty() || !matches) {
            return ResponseEntity.status(401).body(new ErrorResponse("INVALID_CREDENTIALS", "Sai tên đăng nhập hoặc mật khẩu"));
        }
        var staff = account.get();
        if (staff.getRole() != StaffRole.ADMIN) {
            return ResponseEntity.status(403).body(new ErrorResponse("ADMIN_REQUIRED", "Tài khoản không có quyền quản trị viên"));
        }
        String token = jwt.generateToken(staff.getUsername(), Map.of(
                "accountId", staff.getId(), "accountType", "STAFF", "role", "ADMIN"));
        return ResponseEntity.ok(new Session(token, staff.getUsername(), "STAFF", "ADMIN"));
    }

    @GetMapping("/me")
    public Map<String, String> me(@AuthenticationPrincipal AppUserPrincipal principal) {
        return Map.of("username", principal.getUsername(), "accountType", "STAFF", "role", "ADMIN");
    }

    public record Credentials(String username, String password) {}
    public record Session(String token, String username, String accountType, String role) {}
}
