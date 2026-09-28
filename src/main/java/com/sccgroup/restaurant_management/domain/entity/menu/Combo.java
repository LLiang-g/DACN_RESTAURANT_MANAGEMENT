package com.sccgroup.restaurant_management.domain.entity.menu;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "combo")
public class Combo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type")
    private DiscountType discountType;

    @Column(name = "discount_value", precision = 10, scale = 2)
    private BigDecimal discountValue;

    protected Combo() {}

    public Combo(String name, DiscountType discountType, BigDecimal discountValue) {
        this.name = name;
        this.discountType = discountType;
        this.discountValue = discountValue;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public DiscountType getDiscountType() { return discountType; }
    public BigDecimal getDiscountValue() { return discountValue; }
}