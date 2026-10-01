package com.sccgroup.restaurant_management.domain.entity.inventory;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "ingredient")
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String unit;

    @Column(name = "stock_quantity", precision = 10, scale = 2)
    private BigDecimal stockQuantity;

    @Column(name = "min_threshold", precision = 10, scale = 2)
    private BigDecimal minThreshold;

    protected Ingredient() {}

    public Ingredient(String name, String unit, BigDecimal stockQuantity, BigDecimal minThreshold) {
        this.name = name;
        this.unit = unit;
        this.stockQuantity = stockQuantity;
        this.minThreshold = minThreshold;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getUnit() { return unit; }
    public BigDecimal getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(BigDecimal stockQuantity) { this.stockQuantity = stockQuantity; }
    public BigDecimal getMinThreshold() { return minThreshold; }
}