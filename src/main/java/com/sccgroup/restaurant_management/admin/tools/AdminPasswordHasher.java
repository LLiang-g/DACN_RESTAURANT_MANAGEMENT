package com.sccgroup.restaurant_management.admin.tools;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/** Offline utility: does not start Spring or connect to the database. */
public final class AdminPasswordHasher {
    public static void main(String[] args) throws Exception {
        String password = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8)).readLine();
        if (password == null || password.isEmpty() || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            System.err.println("Password must contain between 1 and 72 UTF-8 bytes.");
            System.exit(1);
        }
        System.out.println(new BCryptPasswordEncoder().encode(password));
    }
}
