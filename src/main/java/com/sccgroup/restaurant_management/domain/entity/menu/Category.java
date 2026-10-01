package com.sccgroup.restaurant_management.domain.entity.menu;

import com.sccgroup.restaurant_management.domain.entity.account.KitchenStation;
import jakarta.persistence.*;

@Entity
@Table(name = "category")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", nullable = false)
    private KitchenStation kitchenStation;

    protected Category() {}

    public Category(String name, KitchenStation kitchenStation) {
        this.name = name;
        this.kitchenStation = kitchenStation;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public KitchenStation getKitchenStation() { return kitchenStation; }
}