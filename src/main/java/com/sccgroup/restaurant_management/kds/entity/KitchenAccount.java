package com.sccgroup.restaurant_management.kds.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "kitchen_account")
public class KitchenAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    @Column(name = "password_hash")
    private String passwordHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", nullable = false)
    private KitchenStation kitchenStation;

    protected KitchenAccount() {}

    public KitchenAccount(String username, String passwordHash, KitchenStation kitchenStation) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.kitchenStation = kitchenStation;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public KitchenStation getKitchenStation() { return kitchenStation; }
}