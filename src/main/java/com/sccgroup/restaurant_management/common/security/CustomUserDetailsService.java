package com.sccgroup.restaurant_management.common.security;

import com.sccgroup.restaurant_management.domain.repository.account.KitchenAccountRepository;
import com.sccgroup.restaurant_management.domain.repository.account.StaffAccountRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;


// tra cứu tài khoản khi đăng nhập
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final StaffAccountRepository staffRepo;
    private final KitchenAccountRepository kitchenRepo;

    public CustomUserDetailsService(StaffAccountRepository staffRepo, KitchenAccountRepository kitchenRepo) {
        this.staffRepo = staffRepo;
        this.kitchenRepo = kitchenRepo;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        // Kiểm tra bảng staff_account trước
        var staff = staffRepo.findByUsername(username);
        if (staff.isPresent()) {
            var s = staff.get();
            return new AppUserPrincipal(s.getId(), s.getUsername(), s.getPasswordHash(),
                    "STAFF", s.getRole().name());
        }

        // Không có thì kiểm tra bảng kitchen_account
        var kitchen = kitchenRepo.findByUsername(username);
        if (kitchen.isPresent()) {
            var k = kitchen.get();
            return new AppUserPrincipal(k.getId(), k.getUsername(), k.getPasswordHash(),
                    "KITCHEN", "KITCHEN");
        }

        throw new UsernameNotFoundException("Không tìm thấy tài khoản: " + username);
    }
}