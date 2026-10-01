package com.sccgroup.restaurant_management.domain.entity.account;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

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
    @JsonIgnore
    public String getPasswordHash() { return passwordHash; }
    public StaffRole getRole() { return role; }
    public void setUsername(String username) { this.username = username; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setRole(StaffRole role) { this.role = role; }
}