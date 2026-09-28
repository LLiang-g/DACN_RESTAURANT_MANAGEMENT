package com.sccgroup.restaurant_management.customer.entity;

import com.sccgroup.restaurant_management.admin.entity.Ingredient;
import com.sccgroup.restaurant_management.customer.entity.AdjustType;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "food_option")
public class Option {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "food_id", nullable = false)
    private Food food;

    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private OptionGroup optionGroup;

    // 4 trường dưới độc lập nhau, trường nào có giá trị thì áp dụng khi tính toán
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id") // nullable
    private Ingredient ingredient;

    @Column(name = "adjust_amount", precision = 10, scale = 2)
    private BigDecimal adjustAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjust_type")
    private AdjustType adjustType;

    @Column(name = "price_delta", precision = 12, scale = 2)
    private BigDecimal priceDelta;

    @Column(name = "scale_factor", precision = 6, scale = 2)
    private BigDecimal scaleFactor;

    protected Option() {}

    public Option(Food food, String name, OptionGroup optionGroup) {
        this.food = food;
        this.name = name;
        this.optionGroup = optionGroup;
    }

    public Long getId() { return id; }
    public Food getFood() { return food; }
    public String getName() { return name; }
    public OptionGroup getOptionGroup() { return optionGroup; }
    public Ingredient getIngredient() { return ingredient; }
    public void setIngredient(Ingredient ingredient) { this.ingredient = ingredient; }
    public BigDecimal getAdjustAmount() { return adjustAmount; }
    public void setAdjustAmount(BigDecimal v) { this.adjustAmount = v; }
    public AdjustType getAdjustType() { return adjustType; }
    public void setAdjustType(AdjustType v) { this.adjustType = v; }
    public BigDecimal getPriceDelta() { return priceDelta; }
    public void setPriceDelta(BigDecimal v) { this.priceDelta = v; }
    public BigDecimal getScaleFactor() { return scaleFactor; }
    public void setScaleFactor(BigDecimal v) { this.scaleFactor = v; }
}