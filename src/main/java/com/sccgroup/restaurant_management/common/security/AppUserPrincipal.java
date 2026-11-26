package com.sccgroup.restaurant_management.common.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.List;

// tại sao phải có thằng này vì : Vì có 2 loại tài khoản (StaffAccount, KitchenAccount) nhưng Spring Security chỉ hiểu 1 kiểu UserDetails, cần 1 class trung gian
public class AppUserPrincipal implements UserDetails {

    private final Long accountId;
    private final String username;
    private final String passwordHash;
    private final String accountType; // "STAFF" hoặc "KITCHEN"
    private final String role;        // ADMIN / LE_TAN / KITCHEN
    private final Long stationId;     // chỉ có giá trị với tài khoản KITCHEN, STAFF thì null
    private final String stationName; // tương tự stationId

    // Constructor cũ giữ nguyên để code đang dùng không bị vỡ (STAFF không có khu bếp)
    public AppUserPrincipal(Long accountId, String username, String passwordHash,
                            String accountType, String role) {
        this(accountId, username, passwordHash, accountType, role, null, null);
    }

    public AppUserPrincipal(Long accountId, String username, String passwordHash,
                            String accountType, String role,
                            Long stationId, String stationName) {
        this.accountId = accountId;
        this.username = username;
        this.passwordHash = passwordHash;
        this.accountType = accountType;
        this.role = role;
        this.stationId = stationId;
        this.stationName = stationName;
    }

    public Long getAccountId() { return accountId; }
    public String getAccountType() { return accountType; }
    public String getRole() { return role; }
    public Long getStationId() { return stationId; }
    public String getStationName() { return stationName; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Spring Security quy ước tên quyền phải có tiền tố "ROLE_"
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return username; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
