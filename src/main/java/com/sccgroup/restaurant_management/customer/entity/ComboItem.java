package com.sccgroup.restaurant_management.customer.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "combo_item")
public class ComboItem {

    @EmbeddedId
    private ComboItemId id;

    @MapsId("comboId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_id")
    private Combo combo;

    @MapsId("foodId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "food_id")
    private Food food;

    private Integer quantity;

    protected ComboItem() {}

    public ComboItem(Combo combo, Food food, Integer quantity) {
        this.id = new ComboItemId(combo.getId(), food.getId());
        this.combo = combo;
        this.food = food;
        this.quantity = quantity;
    }

    public ComboItemId getId() { return id; }
    public Combo getCombo() { return combo; }
    public Food getFood() { return food; }
    public Integer getQuantity() { return quantity; }
}