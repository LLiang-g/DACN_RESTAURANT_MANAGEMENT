package com.sccgroup.restaurant_management.domain.entity;

import com.sccgroup.restaurant_management.customer.entity.Combo;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_combo")
public class OrderCombo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_id", nullable = false)
    private Combo combo;

    private Integer quantity;

    @Column(name = "combo_price", precision = 12, scale = 2)
    private BigDecimal comboPrice; // giá chốt tại thời điểm order

    protected OrderCombo() {}

    public OrderCombo(Order order, Combo combo, Integer quantity, BigDecimal comboPrice) {
        this.order = order;
        this.combo = combo;
        this.quantity = quantity;
        this.comboPrice = comboPrice;
    }

    public Long getId() { return id; }
    public Order getOrder() { return order; }
    public Combo getCombo() { return combo; }
    public Integer getQuantity() { return quantity; }
    public BigDecimal getComboPrice() { return comboPrice; }
}