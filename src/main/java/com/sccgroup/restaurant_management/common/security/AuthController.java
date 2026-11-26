package com.sccgroup.restaurant_management.common.security;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

record LoginRequest(String username, String password) {}
// stationId, stationName chỉ có giá trị khi accountType = KITCHEN (STAFF thì null)
record LoginResponse(String token, String accountType, String role, Long stationId, String stationName) {}

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

        // Dùng HashMap thay vì Map.of vì Map.of không cho phép giá trị null
        var claims = new HashMap<String, Object>();
        claims.put("accountId", principal.getAccountId());
        claims.put("accountType", principal.getAccountType());
        claims.put("role", principal.getRole());
        if (principal.getStationId() != null) {
            claims.put("stationId", principal.getStationId());
        }
        String token = jwtUtil.generateToken(principal.getUsername(), claims);

        return new LoginResponse(token, principal.getAccountType(), principal.getRole(),
                principal.getStationId(), principal.getStationName());
    }
}
