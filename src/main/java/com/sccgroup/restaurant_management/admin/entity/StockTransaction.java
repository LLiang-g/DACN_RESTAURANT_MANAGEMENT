package com.sccgroup.restaurant_management.admin.entity;

import com.sccgroup.restaurant_management.admin.entity.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_transaction")
public class StockTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Enumerated(EnumType.STRING)
    private StockTransactionType type;

    @Column(precision = 10, scale = 2)
    private BigDecimal quantity;

    private String note;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    protected StockTransaction() {}

    public StockTransaction(Ingredient ingredient, StockTransactionType type,
                            BigDecimal quantity, String note, LocalDateTime createdAt) {
        this.ingredient = ingredient;
        this.type = type;
        this.quantity = quantity;
        this.note = note;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public Ingredient getIngredient() { return ingredient; }
    public StockTransactionType getType() { return type; }
    public BigDecimal getQuantity() { return quantity; }
    public String getNote() { return note; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}