package com.sccgroup.restaurant_management.admin.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "staff_account")
public class StaffAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    @Column(name = "password_hash")
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private StaffRole role;

    protected StaffAccount() {}

    public StaffAccount(String username, String passwordHash, StaffRole role) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public StaffRole getRole() { return role; }
}