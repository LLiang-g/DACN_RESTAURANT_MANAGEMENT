package com.sccgroup.restaurant_management.admin.entity;

import com.sccgroup.restaurant_management.customer.entity.Food;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "recipe")
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "food_id", nullable = false)
    private Food food;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Column(name = "quantity_required", precision = 10, scale = 2)
    private BigDecimal quantityRequired;

    protected Recipe() {}

    public Recipe(Food food, Ingredient ingredient, BigDecimal quantityRequired) {
        this.food = food;
        this.ingredient = ingredient;
        this.quantityRequired = quantityRequired;
    }

    public Long getId() { return id; }
    public Food getFood() { return food; }
    public Ingredient getIngredient() { return ingredient; }
    public BigDecimal getQuantityRequired() { return quantityRequired; }
    public void setQuantityRequired(BigDecimal v) { this.quantityRequired = v; }
}