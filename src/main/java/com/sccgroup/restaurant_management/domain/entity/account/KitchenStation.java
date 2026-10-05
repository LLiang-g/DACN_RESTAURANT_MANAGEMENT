package com.sccgroup.restaurant_management.domain.entity.account;

import jakarta.persistence.*;

@Entity
@Table(name = "kitchen_station")
public class KitchenStation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    protected KitchenStation() {}

    public KitchenStation(String name) {
        this.name = name;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}