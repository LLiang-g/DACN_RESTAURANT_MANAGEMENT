package com.sccgroup.restaurant_management.domain.entity.account;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

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
    @JsonIgnore
    public String getPasswordHash() { return passwordHash; }
    public KitchenStation getKitchenStation() { return kitchenStation; }
    public void setUsername(String username) { this.username = username; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setKitchenStation(KitchenStation kitchenStation) { this.kitchenStation = kitchenStation; }
}