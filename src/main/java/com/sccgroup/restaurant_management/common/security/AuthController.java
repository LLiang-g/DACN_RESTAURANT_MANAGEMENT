package com.sccgroup.restaurant_management.common.security;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

record LoginRequest(String username, String password) {}
record LoginResponse(String token, String accountType, String role) {}

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        var authToken = new UsernamePasswordAuthenticationToken(request.username(), request.password());
        var authResult = authenticationManager.authenticate(authToken); // ném lỗi nếu sai password

        var principal = (AppUserPrincipal) authResult.getPrincipal();
        var claims = Map.<String, Object>of(
                "accountId", principal.getAccountId(),
                "accountType", principal.getAccountType(),
                "role", principal.getRole()
        );
        String token = jwtUtil.generateToken(principal.getUsername(), claims);

        return new LoginResponse(token, principal.getAccountType(), principal.getRole());
    }
}